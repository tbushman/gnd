var express = require('express');
var passport = require('passport');
var router = express.Router();
var url = require('url');
var fs = require('fs');
var path = require('path');
var moment = require("moment");
var async = require("async");
var multer = require('multer');
var mkdirp = require('mkdirp');
var spawn = require("child_process").spawn;
var dotenv = require('dotenv');
var Publisher = require('../models/publishers.js');
var Page = require('../models/pages.js');
var publishers = path.join(__dirname, '/../../..');
var request = require('request');
var marked = require('marked');
var upload = multer();
var thestore = require('../public/json/store.json');
var languages = require('../public/json/languages.json');

var storage = multer.diskStorage({
	destination: function (req, files, cb) {
		Page.findOne({pageindex: req.params.pageindex}, function(err, doc){
			if (err) {
				console.log(err)
			}
			var p = ''+publishers+'/pu/publishers/sfusd2/'+ doc.urltitle +'/'+req.params.index+'/images/'+(req.params.drawtype ? req.params.drawtype : 'main')+''

			fs.access(p, function(err) {

				if (err && err.code === 'ENOENT') {
					mkdirp(p, function(err){
						if (err) {
							console.log("err", err);
						}
						console.log('created folder: '+ p)
						cb(null, p)
					})
				} else {
					if (err && err.code === 'EACCESS') {
						console.log('permission error: '+err)
						cb(err)
					} else {
						cb(null, p)

					}
				}
			})
		})
	},
	filename: function (req, files, cb) {
		if (req.params.drawtype && req.params.drawtype !== 'false') {
			cb(null, req.params.drawtype + '_' + req.params.layer + '.png')
		} else {
			cb(null, files[0].fieldname + '_' + req.params.index + '.png')
		}
  }
})

var uploadmedia = multer({ storage: storage })
dotenv.load();

const googleTranslate = require('google-translate')(process.env.GOOGLE_KEY);

//middleware
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		req.app.locals.user = req.user;
		req.app.locals.loggedin = req.user.username;
		return next();
	}
	return res.redirect('/login');
}

function ensurePage(req, res, next) {
	Page.findOne({pagetitle: ''+req.params.pagetitle+''}, function(err, page) {
		if (err) {
			return next(err);
		}
		if (!err && page === null) {
			return res.redirect('/')
		}
		req.app.locals.pageindex = page.pageindex;
		return next();

	});
}

function ensureUserId(req, res, next) {
	Publisher.findOne({_id: req.params.userid}, function(err, user) {
		if (err) {
				return next(err);
			}
		if (user) {
			return next();
		} else {
			return res.redirect('/')
		}
	});
}

function ensureUser(req, res, next) {
	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(err, page) {
		if (err) {
			return next(err);
		}
		if (page.publishers[0].username === req.app.locals.loggedin) {
			return next();
		}
		
		var outputPath = url.parse(req.url).pathname;
		return res.render('login', {route: outputPath})
	});
}

//if logged in, go to your own profile
//if not, go to global profile (home)
router.get('/', function (req, res) {
	
	req.app.locals.theStore = thestore;

	if (req.app.locals.loggedin !== undefined) {
		delete req.app.locals.pageTitle;
		if (req.isAuthenticated()) {
			req.app.locals.userId = req.user._id;
			req.app.locals.loggedin = req.user.username;
			req.app.locals.username = req.user.username;
			return res.redirect('/api/publish')
		} else {
			return res.redirect('/home');
		}


	} else {
		delete req.app.locals.pageTitle;
		return res.redirect('/home')
	}
});

router.get('/doc/:pageindex', function(req, res, next){
	var pageindex = parseInt(req.params.pageindex, 10);
	var index = parseInt(req.params.index, 10);
	req.app.locals.pageindex = pageindex;
	Page.findOne({pageindex: pageindex}, function(err, doc){
		if (err) {
			return next(err)
		}
		return res.status(200).send(doc)
	})
});

router.get('/item/:pageindex/:index/:drawtype/:layer', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var index = parseInt(req.params.index, 10);
	var drawtype = req.params.drawtype;
	var layer = parseInt(req.params.layer, 10);
	var pageindex = parseInt(req.params.pageindex, 10);
	var index = parseInt(req.params.index, 10);
	req.app.locals.pageindex = pageindex;
	Page.findOne({pageindex: pageindex, content: {$elemMatch:{index: index}}}, function(err, doc){
		if (err) {
			return next(err)
		}
		var item = doc.content[index][drawtype][layer]
		return res.status(200).send(item)
	})
});

router.get('/register', function(req, res) {
	delete req.app.locals.loggedin;
	req.app.locals.theStore = thestore;
	googleTranslate.getSupportedLanguages(function(err, languageCodes) {
		var langs = [];
		for (var i = 0; i < languageCodes.length; i++) {
			if (languages[languageCodes[i]] !== undefined) {
				var obj = languages[languageCodes[i]];
				obj.code = languageCodes[i];
				langs.push(obj)
			}
			
		}
		return res.render('register', {info: 'Thank you', action: 'login', languages: langs } );

	});
});

router.post('/register', upload.array(), function(req, res, next) {
	var langs = [];
	googleTranslate.getSupportedLanguages(function(err, languageCodes) {
		
		for (var i = 0; i < languageCodes.length; i++) {
			if (languages[languageCodes[i]] !== undefined) {
				var obj = languages[languageCodes[i]];
				obj.code = languageCodes[i];
				langs.push(obj)
			}
			
		}
		if (!req.body.pagetitle) {
			//upload.array() has not yet been fs-ed.
			return res.render('register', {info: 'You must provide a nickname.', languages: langs})
		}
		var pagetitle = encodeURIComponent(req.body.pagetitle);
		Publisher.find({}, function(err, data){
			if (err) {
				return next(err)
			}
			Publisher.register(new Publisher({ username : req.body.username, avatar: '/images/avatars/avatar_1.svg', language: req.body.languages }), req.body.password, function(err, user) {
				if (err) {
					return res.render('register', {info: "Sorry. That Chef already exists. Try again.", languages: langs});
				}
				req.app.locals.username = req.body.username;
				passport.authenticate('local')(req, res, function () {
					Publisher.findOne({username: req.body.username}, function(error, doc){
						if (error) {
							return next(error)
						}
						req.app.locals.user = req.user;
						req.app.locals.userId = doc._id;
						req.app.locals.loggedin = doc.username;
						return res.redirect('/api/publish')
					})
				});
			});
		})
	})
	
});

router.post('/reserve/:pagetitle', function(req, res, next){
	req.app.locals.pageTitle = decodeURIComponent(req.params.pagetitle);
	return res.status(200).send(req.app.locals.pageTitle);
})

router.get('/login', function(req, res, next){
	req.app.locals.theStore = thestore;

	return res.render('login', {
		user: req.user
	});
});

router.post('/login', upload.array(), passport.authenticate('local'), function(req, res, next) {
	
	
	req.app.locals.loggedin = req.body.username;
	req.app.locals.username = req.body.username;
	/*var pagetitle;
	if (req.body.pagetitle) {
		pagetitle = encodeURIComponent(req.body.pagetitle);
		req.app.locals.pageTitle = pagetitle;
	} else {
		
	}*/
	return res.redirect('/api/publish');
});

router.get('/logout', function(req, res) {

	req.app.locals.username = null;
	req.app.locals.userId = null;
	req.app.locals.zoom = null;
	req.app.locals.loggedin = null;
	delete req.app.locals.pageTitle;
	req.app.locals.drawtype = null;
	req.app.locals.drawType = null;
	req.app.locals.level = null;
	req.app.locals.layer = null;
	req.logout();
	if (req.user || req.session) {
		req.user = null;
		req.session.destroy(function(err){
			if (err) {
				req.session = null;
				return next(err);
			} else {
				req.session = null;
				return res.redirect('/');
			}
		});
	} else {
		return res.redirect('/');
	}
});

router.all('/translate/:text', function(req, res, next){

	googleTranslate.translate(decodeURIComponent(req.params.text), 'en', req.app.locals.user ? req.app.locals.user.language : 'es', function(err, translation){
		if (err) {
			console.log(err)
		}
		
		return res.json(translation.translatedText);
	});
});

router.get('/home', function(req, res, next) {
	//todo test null vs delete
	delete req.app.locals.pageTitle;

	var info;
	// Get data
	async.waterfall([
		function(next){

			Page.find({}, function(err, data){
				if (err) {
					next(err)
				}
				
				if (!err && data.length === 0){
					//if no publisher in system
					return res.redirect('/register')
				}
				next(null, data)					
				
			})
		}
	], function(err, data) {
		if (err) {
			console.log(err)
			return next(err)
		}
		var index = 0

		var datarray = [];
		for (var l in data) {
			datarray.push(data[l])
		}
		if (req.isAuthenticated()) {
			return res.render('publish', {
				//theStore: thestore,
				type: 'blog',
				infowindow: 'home',
				loggedin: req.app.locals.loggedin,
				data: datarray,
				index: index,
				info: info
			})
		} else {
			return res.render('publish', {
				//theStore: thestore,
				type: 'blog',
				infowindow: 'home',
				data: datarray,
				index: index,
				info: info
			})
		}
	})
})

router.post('/chef/:pagetitle', function(req, res, next){
	Page.find({pagetitle: decodeURIComponent(req.params.pagetitle)}, function(error, pages){
		if (error) {
			return next(error)
		}
		if (!error && pages.length > 0) {
			return res.send('This blog name is taken.')
		}
		return res.send('Available')

	})
})

router.get('/chef/:pagetitle*', ensurePage, function (req, res, next) {
	var index;
	var outputPath = url.parse(req.url).pathname;
	
	//check if pos1 is username
	//view user profile
	var pagetitle = decodeURIComponent(req.params.pagetitle)
	var urltitle = pagetitle.split(' ').join('_');
	Page.find({}, function(err, data) {
		if (err) {
			return next(err)
		}
		Page.findOne({urltitle: urltitle}, function(error, doc){
			if (error) {
				return next(error)
			}
			if (!err && doc !== undefined && doc !== null) {
				var info;
				var datarray = [];
				for (var l in data) {
					datarray.push(data[l])
				}
				if (outputPath.split('/').length > 3) {
					index = parseInt(outputPath.split('/')[3], 10);
				} else {
					index = doc.content[doc.content.length-1].index;
				}
				if (req.isAuthenticated()) {
					return res.render('publish', {
						pageindex: doc.pageindex,
						type: 'draw',
						infowindow: 'doc',
						drawtype: req.app.locals.drawType ? req.app.locals.drawType : "info",
						layer: req.app.locals.layer ? req.app.locals.layer : doc.content[index].level,
						loggedin: req.app.locals.loggedin,
						index: index,
						doc: doc,
						data: datarray,
						info: info
					})
				} else {
					return res.render('publish', {
						pageindex: doc.pageindex,
						type: 'draw',
						infowindow: 'doc',
						index: index,
						doc: doc,
						data: datarray,
						info: info
					})
				}
				
			} else {
				return res.redirect('/home')
			}
		})
	})
});

//every edit-access api checks auth
router.all('/api/*', ensureAuthenticated)

router.get('/api/publish', function(req, res, next) {
	
	var outputPath = url.parse(req.url).pathname;

	async.waterfall([
		function(cb) {
			Page.find({}, function(err, data) {
				if (err) {
					return next(err)
				}
				Page.find({publishers: {$elemMatch: {username: req.app.locals.loggedin}}}, function(er, pages){
					if (er) {
						next(er)
					}
					cb(null, data, pages)
				})
			})
		},
		function(data, pages, cb) {
			var infowindow;
			if (pages.length === 0) {
				infowindow = 'doc';
				//dummy automatic first content entry
				req.app.locals.urltitle = req.app.locals.pageTitle.replace(' ', '_')
				var urltitle = req.app.locals.pageTitle.replace(' ', '_');
				var page = new Page({
					pageindex: data.length,
					pagetitle: req.app.locals.pageTitle,
					urltitle: urltitle,
					content: [ {
						index: 0,
						pid: data.length,
						user: req.app.locals.user._id,
						title: thestore.info[0].name + ' ' + thestore.tools[0].name,
						description: 'My first sandwich',
						level: 0,
						info: thestore.info,
						substrates: thestore.substrates,
						filling: thestore.filling,
						tools: thestore.tools,
						image: ''
						
					} ],
					publishers: [{
						_id: req.app.locals.user._id,
						username: req.app.locals.user.username,
						avatar: req.app.locals.user.avatar,
						language: req.app.locals.user.language,
						allergies: []
					}]
				});
				req.app.locals.index = 0;
				page.save(function(error){
					if (error) {
						return next(error)
					} else {
						Page.find({publishers: {$elemMatch: {username: req.app.locals.loggedin}}}, function(er, pages){
							if (er) {
								next(er)
							}
							req.app.locals.pageId = page._id;
							req.app.locals.userId = req.app.locals.user._id;
							cb(null, pages, page, page.pageindex, infowindow)
						})
					}
				})
			} else {
				Page.find({publishers: {$elemMatch: {username: req.app.locals.loggedin}}}, function(er, pages){
					if (er) {
						return next(er)
					}
					Page.findOne({publishers: {$elemMatch: {username: req.app.locals.loggedin}}}, function(err, doc){
						if (err) {
							return next(err)
						}
						if (!req.app.locals.index) {
							req.app.locals.index = doc.content[doc.content.length-1].index;
						}
						req.app.locals.pageindex = doc.pageindex;
						req.app.locals.pageTitle = doc.pagetitle;
						req.app.locals.urltitle = doc.pagetitle.replace(' ', '_')
							cb(null, pages, doc, doc.pageindex, 'doc')
						
					})
					
				})
			}
		}
	], function(err, data, doc, pageindex, infowindow){
		if (err) {
			return next(err)
		}
		return res.render('publish', {
			type: 'blog',
			infowindow: infowindow,
			loggedin: req.app.locals.loggedin,
			pageindex: pageindex ? pageindex : data[data.length-1].pageindex,
			index: doc ? doc.content.length-1 : false,
			data: [].map.call(data, function(d){return d}),
			doc: doc ? doc : false,
			drawtype: req.app.locals.drawType ? req.app.locals.drawType : "info",
			layer: req.app.locals.layer ? req.app.locals.layer : doc.content[doc.content.length-1].level,
			info: 'hi'
		})
	})
})

router.all('/api/deletefeature/:pageindex/:index', ensureUser, function(req, res, next) {
	var index = parseInt(req.params.index, 10);
	var pageindex = parseInt(req.params.pageindex, 10)
	Page.deleteOne(
		{pageindex: pageindex},
		{$pull:{content:{index:index}}},
		{multi: false, new: true}, function(err, doc) {
			if (err) {
				return next(err)
			}
			Page.update({pageindex: pageindex, 'content.index':{$gte:index}}, {$inc:{'content.$.index': -1}}, function(er, pu){
				if (er) {
					return next(er)
				}
				Page.find({'publishers.username': req.app.locals.loggedin}, function(error, data){
					if (error) {
						return next(error)
					}
					var datarray = [];
					for (var l in data) {
						datarray.push(data[l])
					}
					return res.render('publish', {
						type: 'blog',
						infowindow: 'dashboard',
						loggedin: req.app.locals.loggedin,
						pageindex: doc.pageindex,
						index: 0,
						data: datarray,
						info: 'Deleted'
					})
				})
			})
		}
	)
})

router.all('/api/uploadmedia/:pageindex/:index/:drawtype/:layer', uploadmedia.any(), function(req, res, next){
	return res.status(200).send(req.files[0].path)
})

router.get('/api/editcontent/:urltitle/:pageindex/:index', ensureUser, function(req, res, next){
	
	var outputPath = url.parse(req.url).pathname;
	var index = parseInt(req.params.index, 10);
	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(error, doc){
		if (error) {
			return next(error)
		}
		Page.find({}, function(er, data){
			if (er) {
				return next(er)
			}
			var datarray = [];
			for (var l in data) {
				datarray.push(data[l])
			}
			return res.render('publish', {
				type: 'blog',
				infowindow: 'edit',
				loggedin: req.app.locals.loggedin ? req.app.locals.loggedin : false,
				pageindex: doc.pageindex,
				index: doc.content.length-1,
				doc: doc,
				data: datarray,
				drawtype: req.app.locals.drawType ? req.app.locals.drawType : 'info',
				layer: req.app.locals.layer ? req.app.locals.layer : false,
				info: 'Edit your entry.'
			})
		})
	})
})

router.get('/api/selectlayer', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;

	Page.findOne({urltitle: req.app.locals.urltitle, content: {$elemMatch: {index: req.app.locals.index}}}, function(err, doc){
		if (err) {
			return next(err)
		}
		//console.log(doc)
		Page.find({}, function(errrr, data){
			if (errrr) {
				return next(errrr)
			}
			var datarray = [];
			for (var l in data) {
				datarray.push(data[l])
			}
			return res.render('publish', {
				type: 'draw',
				infowindow: 'edit',
				drawtype: req.app.locals.drawType ? req.app.locals.drawType : "info",
				layer: req.app.locals.layer ? req.app.locals.layer : doc.content[doc.content.length-1].level,
				loggedin: req.app.locals.loggedin,
				pageindex: doc.pageindex,
				index: req.app.locals.index,
				doc: doc,
				data: datarray,
				info: ':)'
			})
		})
	})
})
router.all('/api/selectlayer/:urltitle/:pageindex/:index/:drawtype/:layer', upload.array(), function(req, res, next){
	//delete req.app.locals.layer;
	var outputPath = url.parse(req.url).pathname;
	var index = parseInt(req.params.index, 10);
	var layer = parseInt(req.params.layer, 10);
	var urltitle = req.params.urltitle;
	var drawtype = req.params.drawtype;
	req.app.locals.index = index;
	req.app.locals.layer = layer;
	req.app.locals.drawType = drawtype;
	req.app.locals.urltitle = urltitle;
	Page.find({}, function(errrr, data){
		if (errrr) {
			return next(errrr)
		}
		var set = {$set:{}}
		var key = 'content.$.level'
		set.$set[key] = layer;
		Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch: {index: index}}}, set, {safe: true, new: true, upsert: false}, function(err, doc){
			if (err) {
				return next(err)
			}
			var set2 = {$set:{}}
			var key2 = 'content.$.'+drawtype+'.'+layer+'.unlocked'
			set2.$set[key2] = true;
			Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch: {index: index}}}, set2, {safe: true, new: true, upsert: false}, function(er, doc){
				if (er) {
					return next(er)
				}
				req.app.locals.drawType = drawtype;
				console.log(req.body)
				var drawtypes = ["substrates", "filling"];
				var keys = Object.keys(req.body);
				var set3 = {$set:{}};
				var key3, name3;
				for (var i = 0; i < drawtypes.length; i++) {
					for (var k = 0; k < doc.content[index][drawtypes[i]].length; k++) {
						if (keys.indexOf(doc.content[index][drawtypes[i]][k].name) !== -1) {
							key3 = 'content.$.'+drawtypes[i]+'.'+k+'.image'
							name3 = doc.content[index][drawtypes[i]][k].name
						}
					}
					
				}
				set3.$set[key3] = name3;
				Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch:{index:index}}}, set3, {safe: true, new: true, upsert: false}, function(errr, doc){
					if (err) {
						return next(err)
					}
					
				//})
				/*if (req.body['inputimg_'+drawtype+'_'+layer+'']) {
					console.log(req.body['inputimg_'+drawtype+'_'+layer+''])
					var set1 = {$set:{}}
					var key1 = 'content.$.image'
					set1.$set[key1] = req.body['inputimg_'+drawtype+'_'+layer+'']
					Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch: {index: index}}}, set1, {safe: true, new: true, upsert: false}, function(errr, doc){
						if (errr){
							return next(errr)
						}
						var datarray = [];
						for (var l in data) {
							datarray.push(data[l])
						}
						//return res.redirect('/api/selectlayer')
						return res.render('publish', {
							type: 'draw',
							drawtype: drawtype,
							layer: layer,
							infowindow: 'edit',
							loggedin: req.app.locals.loggedin,
							pagetitle: doc.pagetitle,
							pageindex: doc.pageindex,
							index: index,
							doc: doc,
							data: datarray,
							info: ':)'
						})
					})
				} else {*/
					var datarray = [];
					for (var l in data) {
						datarray.push(data[l])
					}
					//return res.redirect('/api/selectlayer')
					return res.render('publish', {
						type: 'draw',
						drawtype: drawtype,
						layer: layer,
						infowindow: 'edit',
						loggedin: req.app.locals.loggedin,
						pagetitle: doc.pagetitle,
						pageindex: doc.pageindex,
						index: index,
						doc: doc,
						data: datarray,
						info: ':)'
					})
				})
			})
		})
	})
})

router.post('/api/allergy/:pageindex/:index/:drawtype/:level', function(req, res, next){
	var pageindex = parseInt(req.params.pageindex, 10);
	Page.findOne({pageindex:pageindex, publishers: {$elemMatch:{username: req.app.locals.loggedin}}}, function(er, pub){
		if (er){
			return next(er)
		}
		var index = parseInt(req.params.index, 10);
		var drawtype = req.params.drawtype;
		var level = parseInt(req.params.level, 10);
		var push = {$push:{}};
		var key = 'publishers.$.allergies';
		push.$push[key] = pub.content[index][drawtype][level].name;
		Page.findOneAndUpdate({pageindex:pageindex, publishers: {$elemMatch:{username: req.app.locals.loggedin}}}, push, {safe: true, new: true, upsert: false}, function(err, doc){
			if (err){
				return next(err)
			}
			return res.status(200).send('ok')
		})
	})
	
})
router.post('/api/editcontent/:urltitle/:pageindex/:index/:drawtype/:level', upload.array(), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var index = parseInt(req.params.index, 10);
	var title = req.body.title;
	var description = req.body.description;
	var body = req.body;
	var drawType = req.params.drawtype;
	//console.log(drawType)
	var level = parseInt(req.params.level, 10);
	var pageindex = parseInt(req.params.pageindex, 10);
	async.waterfall([
		function(cb){
			Page.findOne({pageindex: pageindex}, function(err, pub) {
				if (err) {
					return next(err)
				}
				var id = pub._id;
				var keys = Object.keys(body);
				var contentdatas = pub;
				var contentdata = contentdatas.content[index]
				var items = ["tools", "info", "substrates", "filling"];
				var drawThis = false;
				
				for (var j = 0; j < contentdata.info.length; j++) {

					if (contentdata.info[j].spec.unlock === ''+drawType+'.'+level+'') {
						
						contentdata.info[j].unlocked = true;

						if (contentdata.info[j-1]) {
							contentdata.info[j-1].unlocked = false;
						}
						//console.log('unlocked ' +contentdata.info[j].name)
					}
				}
				cb(null, body, contentdata, keys, drawType, index, pageindex)
			})
		},
		function(body, contentdata, keys, drawType, index, pageindex, cb){
			var drawThis, drawInd, drawName
			//console.log(contentdata[drawType].length)
			var drawInds = [];
			for (var q = 0; q < contentdata[drawType].length; q++) {
				//console.log(keys, contentdata[drawType][q].name)
				if (keys.indexOf(contentdata[drawType][q].name) != -1) {
					//console.log('image hea')
					drawThis = contentdata[drawType][q];
					drawInd = parseInt(drawThis.ind, 10);
					drawName = drawThis.name;
					contentdata[drawType][q].unlocked = true;
					if (q === contentdata[drawType].length - 1) {
						var contentkeys = ["substrates", "filling"];
						for (var i = 0; i < contentkeys.length; i++){
							if (contentkeys[i] !== drawType) {
								contentdata[contentkeys[i]][0].unlocked = true;
							}
							
						}
						
					} else {
						//don't unlock yet
					}
				}
				
			}

			if (contentdata[drawType].length > drawInd+1 ){
				//console.log(contentdata[drawType][drawInd].name)
				contentdata[drawType][drawInd+1].unlocked = true;
			}
			cb(null, body, contentdata, keys, drawName, index, pageindex)
			
		},
		function(body, contentdata, keys, drawName, index, pageindex, cb){
			var contentkeys = ["substrates", "filling"]
			//contentdata[keys[i]] = body[keys[i]]
			for (var i = 0; i < contentkeys.length; i++) {
				for (var j = 0; j < contentdata[contentkeys[i]].length; j++) {
					if (keys.indexOf(contentdata[contentkeys[i]][j].name) !== -1) {
						console.log('draw this hea! '+contentdata[contentkeys[i]][j].name)
						contentdata[contentkeys[i]][j].image = body[contentdata[contentkeys[i]][j].name]

					}
				}
				
			}
			if (body["image"]) {
				contentdata.image = body["image"]
			}
			var key = 'content.$'
			var push = {$set: {}};
			var pushKey = '$set';
			push.$set[key] = JSON.parse(JSON.stringify(contentdata));//JSON.parse(JSON.stringify(thisValue));
			Page.findOneAndUpdate({pageindex: pageindex, content: {$elemMatch: {index: index}}}, push, {safe: true, new: true, upsert: false}, function(error, doc){
				if (error) {
					return next(error)
				}
				cb(null)
				
			});
		}
	], function(err){
		if (err) {
			return next(err)
		}
		return res.redirect('/api/publish')
	})
	
})

router.post('/api/nextstep/:urltitle/:pageindex/:index/:drawtype/:layer', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	var urltitle = req.params.urltitle;
	var pageindex = parseInt(req.params.pageindex, 10);
	var index = parseInt(req.params.index, 10);
	var drawtype = req.params.drawtype;
	var layer = parseInt(req.params.layer, 10);
	if (drawtype === "info") {
		return res.redirect('/api/levelup')
	}
	Page.findOne({pageindex: pageindex, content: {$elemMatch: {index: index}}}, function(err, pub){
		if (err) {
			return next(err)
		}
		var keylist = [];
		var levellist = [];
		var keyz = ["substrates", "filling"];
		for (var i = 0; i < keyz.length; i++) {
			for (var j = 0; j < pub.content[index][keyz[i]].length; j++) {
				if (pub.content[index][keyz[i]][j].unlocked) {
					if (j === pub.content[index][keyz[i]].length -1) {
						return res.redirect('/api/levelup')
					}
				} else {
					if (keyz[i] !== drawtype) {
						keylist.push(keyz[i]);
						levellist.push(j)
					}
				}
			}		
		}
		console.log('keylist')
		console.log(keylist)
		console.log('levellist')
		console.log(levellist)
		var drawType = keylist[0] !== undefined ? keylist[0] : "info";
		var level = levellist[0] !== undefined ? levellist[0] : layer;
		var set1 = {$set: {}};
		var key1 = 'content.$.'+keylist[0]+'.'+levellist[0]+'.unlocked';
		set1.$set[key1] = true;
		req.app.locals.drawType = drawType;
		req.app.locals.layer = level;
		req.app.locals.pageindex = pageindex;
		Page.findOneAndUpdate({pageindex: pageindex, content: {$elemMatch: {index: index}}}, set1, {safe: true, new: true, upsert: false}, function(error, dc){
			if (error) {
				return next(error)
			}
			Page.find({}, function(er, data){
				if (er) {
					return next(er)
				}
				var datarray = [];
				for (var l in data) {
					datarray.push(data[l])
				}
				if (Number.isNaN(layer) || levellist[0] === thestore[drawtype].length - 1) {
					req.app.locals.drawType = drawtype === 'filling' ? 'substrates':'filling';
					req.app.locals.layer = 0;
					//return res.redirect('/api/selectlayer')
					//return res.redirect('/api/levelup')
					//return res.redirect('/api/nextstep/'+urltitle+'/'+pageindex+'/'+index+'/'+(drawtype === 'filling' ? 'substrates':'filling')+'/0')
				}// else {
					return res.status(200).send('ok');
				//}

			})
		})
	})
});

router.get('/api/levelup', function(req, res, next){
	var layer = parseInt(req.app.locals.layer, 10)
	layer++;
	if (layer > 2) {
		return res.redirect('/chef/'+doc.pagetitle+'/'+req.app.locals.index+'')
	}
	req.app.locals.layer = layer;
	var set = {$set:{}}
	var key = 'content.$.level'
	set.$set[key] = req.app.locals.layer;
	var set1 = {$set:{}}
	var key1 = 'publishers.0.avatar';
	set1.$set[key1] = '/images/avatars/avatar_'+req.app.locals.layer+'.svg'
	Page.findOne({pageindex: req.app.locals.pageindex, content: {$elemMatch: {index: req.app.locals.index}}}, function(errr, doc){
		if (errr) {
			return next(errr)
		}
		if (doc.content[req.app.locals.index].level > 3) {
			return res.redirect('/chef/'+doc.pagetitle+'/'+req.app.locals.index+'')
		}
		Page.findOneAndUpdate({pageindex: req.app.locals.pageindex, content: {$elemMatch: {index: req.app.locals.index}}}, set, {safe: true, new: true, upsert: false}, function(err, doc){
			if (err) {
				return next(err)
			}
			
			Page.findOneAndUpdate({pageindex: req.app.locals.pageindex, content: {$elemMatch: {index: req.app.locals.index}}}, set1, {safe: true, new: true, upsert: false}, function(err, doc){
				if (err) {
					return next(err)
				}
				Page.find({}, function(er, data){
					if (er) {
						return next(er)
					}
					var datarray = [];
					for (var l in data) {
						datarray.push(data[l])
					}
					return res.render('publish', {
						type: 'blog',
						infowindow: 'doc',
						loggedin: req.app.locals.loggedin,
						pageindex: doc.pageindex,
						index: req.app.locals.index,
						doc: doc,
						data: datarray,
						info: ':)'
					})
				})
			})
		})
	})
	
})

router.all('/api/done', function(req, res, next){
	Page.find({}, function(er, data){
		if (er){
			return next(er)
		}
		Page.findOne({pageindex: req.app.locals.pageindex, content: {$elemMatch: {index: req.app.locals.index}}}, function(err, doc){
			if (err){
				return next(err)
			}
			return res.render
		})
	})
})
module.exports = router;
