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
var Content = require('../models/content.js');
var publishers = path.join(__dirname, '/../../..');
var request = require('request');
var marked = require('marked');
var upload = multer();
var thestore = require('../public/json/store.json');
var storage = multer.diskStorage({
	destination: function (req, files, cb) {
		Page.findOne({pageindex: req.params.pageindex}, function(err, doc){
			if (err) {
				console.log(err)
			}
			var p = ''+publishers+'/pu/publishers/sfusd/'+ doc.urltitle +'/images/'+req.params.index+'/'+(req.params.drawtype ? req.params.drawtype : 'main')+''
			console.log(p)
			/*if (req.params.drawtype && req.params.drawtype !== 'false') {
				
			}*/
			
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
			console.log('layer save')
			cb(null, req.params.drawtype + '_' + req.params.layer + '.png')
		} else {
			console.log('main save')
			cb(null, files[0].fieldname + '_' + req.params.index + '.png')
		}
		
		
		
  }
})

var uploadmedia = multer({ storage: storage })
dotenv.load();


//middleware
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
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
		console.log('user here')
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
		/*for (var i in page.publishers) {
			if (JSON.stringify(page.publishers[i].username) === JSON.stringify(req.app.locals.loggedin)) {
				
			} else {

			}
		}*/
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
			return res.redirect('/home')
		} else {
			return res.redirect('/home');
		}


	} else {
		delete req.app.locals.pageTitle;
		return res.redirect('/home')
	}
});

/*router.param(function(param, option){
	return function(req, res, next, val) {
		if (option) {
			next();
		} else {
			next('/')
		}
	}
})

router.param('index', function(index){
	return !isNaN(parseInt(index, 10)) && isFinite(index);
})

router.param('pagetitle', function(pagetitle){
	if (pagetitle && pagetitle !== null) {
		var urltitle = req.params.pagetitle.replace(' ', '_');
		Page.findOne({urltitle: urltitle}, function(err, doc){
			if (err) {
				return false
			}
			if (!err && doc !== null) {
				console.log('success')
				return true
			}
			return false
		})		
	} else {
		return false
	}
});*/

router.get('/register', function(req, res) {
	req.app.locals.theStore = thestore;

    return res.render('register', {info: 'Thank you', action: 'login' } );
});

router.post('/register', upload.array(), function(req, res, next) {
	if (!req.body.pagetitle) {
		//upload.array() has not yet been fs-ed.
		return res.render('register', {info: 'You must provide a nickname.'})
	}
	var pagetitle = encodeURIComponent(req.body.pagetitle);
	Publisher.find({}, function(err, data){
		if (err) {
			return next(err)
		}
		var userindex = data.length;
		Publisher.register(new Publisher({ username : req.body.username, email: req.body.email, userindex: userindex, avatar: '/images/avatars/avatar_1.svg' }), req.body.password, function(err, user) {
			if (err) {
				return res.render('register', {info: "Sorry. That username already exists. Try again."});
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
});

router.post('/reserve/:pagetitle', function(req, res, next){
	req.app.locals.pageTitle = decodeURIComponent(req.params.pagetitle);
	console.log('this blog name: '+ req.app.locals.pageTitle);
	return next();
})

router.get('/login', function(req, res, next){
	req.app.locals.theStore = thestore;

	return res.render('login', {
		user: req.user
	});
});

router.post('/login', upload.array(), passport.authenticate('local'), function(req, res, next) {
	/*console.log('req.user._id: '+req.user._id)
	req.app.locals.userId = req.user._id;*/
	delete req.app.locals.pageTitle;
	req.app.locals.loggedin = req.body.username;
	req.app.locals.username = req.body.username;
	var pagetitle;
	if (req.body.pagetitle) {
		pagetitle = encodeURIComponent(req.body.pagetitle);
		req.app.locals.pageTitle = pagetitle;
		console.log('adding :'+pagetitle+' to '+req.app.locals.loggedin+'\'s collection')
	} else {
		
	}
	delete req.app.locals.pageTitle;
	return res.redirect('/api/publish');
});

router.get('/logout', function(req, res) {

	req.app.locals.username = null;
	req.app.locals.userId = null;
	req.app.locals.zoom = null;
	req.app.locals.loggedin = null;
	delete req.app.locals.pageTitle;
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
				infowindow: 'root',
				loggedin: req.app.locals.loggedin,
				data: datarray,
				pageindex: data[data.length-1].pageindex,
				index: index,
				info: info
			})
		} else {
			return res.render('publish', {
				//theStore: thestore,
				type: 'blog',
				infowindow: 'root',
				data: datarray,
				pageindex: data[data.length-1].pageindex,
				index: index,
				info: info
			})
		}
	})
})

router.post('/:pagetitle', function(req, res, next){
	Page.find({pagetitle: decodeURIComponent(req.params.pagetitle)}, function(error, pages){
		if (error) {
			return next(error)
		}
		console.log('these records of taken blog names: '+pages)
		if (!error && pages.length > 0) {
			return res.send('This blog name is taken.')
		}
		return res.send('Available')

	})
})

router.get('/:pagetitle', ensurePage, function (req, res, next) {
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
				var index = doc.content[doc.content.length-1].index;
				var datarray = [];
				for (var l in data) {
					datarray.push(data[l])
				}
				if (req.isAuthenticated()) {
					return res.render('publish', {
						pageindex: doc.pageindex,
						type: 'blog',
						infowindow: 'intro',
						loggedin: req.app.locals.loggedin,
						index: index,
						doc: doc,
						data: datarray,
						info: info
					})
				} else {
					return res.render('publish', {
						pageindex: doc.pageindex,
						type: 'blog',
						infowindow: 'intro',
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

router.get('/chefs/:urltitle/:index', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var urltitle = req.params.urltitle;
	var index = parseInt(req.params.index, 10);
	//delete req.app.locals.imgindex;
	Page.findOne({urltitle: urltitle, content: {$elemMatch: {index: index}}}, function(err, doc){
		if (err) {
			return next(err)
		}
		Page.find({}, function(error, data) {
			if (error) {
				return next(error)
			}
			/*var imgs = [];
			var imgindexes = []
			for (var i in doc.content[index].media) {
				if (doc.content[index].media !== '') {
					imgs.push(doc.content[index].media[i].image)
					imgindexes.push(i)
				}
			}*/
			//req.app.locals.imgindex = imgindexes[0];

			req.app.locals.index = index;
			var datarray = [];
			for (var l in data) {
				datarray.push(data[l])
			}

			if (req.isAuthenticated()) {
				//if (req.user._id === userid) {
					return res.render('publish', {
						index: index,
						loggedin: req.app.locals.loggedin,
						type: 'blog',
						infowindow: 'doc',
						pageindex: doc.pageindex,
						data: datarray,
						doc: doc,
						info: ':)'
					})

			} else {
				return res.render('publish', {
					index: index,
					type: 'blog',
					infowindow: 'doc',
					pageindex: doc.pageindex,
					data: datarray,
					doc: doc,
					info: ':)'
				})
			}
		})
	})

})

//todo expand
//currently only searches publisher
router.all('/search/:term', function(req, res, next){
	var term = req.params.term;
	var regex = new RegExp(term);
	console.log(regex)
	Page.find({pagetitle: { $regex: regex }}, function(err, doc){
		if (err) {
			return next(err)
		}
		if (!err && doc === null) {
			return ('none')
		}
		return res.json(doc)
	})
})

//every edit-access api checks auth
router.all('/api/*', ensureAuthenticated)

router.get('/api/createpage', function(req, res, next){
	
})

router.get('/api/publish', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	//var pagetitle = req.app.locals.pageTitle;
	//var urltitle = pagetitle.replace(' ', '_');
	req.app.locals.user = req.user;
	req.app.locals.loggedin = req.user.username;

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
					var infowindow;
					if (pages.length === 0) {
						infowindow = 'doc';
						//dummy automatic first content entry
						var urltitle = req.app.locals.pageTitle.replace(' ', '_');
						var page = new Page({
							pageindex: data.length,
							pagetitle: req.app.locals.pageTitle,
							urltitle: urltitle,
							content: [ {
								index: 0,
								pid: data.length,
								user: req.app.locals.user._id,
								title: 'Peanut Butter and Jelly',
								label: 'Sandwich',
								description: 'My first sandwich',
								current: true,
								substrates: [ 
									thestore.substrates[0]
								],
								filling: [ 
									thestore.filling[0]
								],
								tools: [
									thestore.tools[0]
								]
							} ],
							publishers: [{
								_id: req.app.locals.user._id,
								userindex: 0,
								username: req.app.locals.user.username,
								email: req.app.locals.user.email,
								avatar: req.app.locals.user.avatar
							}]
						});
						//for (var i = 0; i < thestore.length)
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
									//req.app.locals.pageTitle = doc.pagetitle;
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

							cb(null, pages, null, null, 'dashboard')
							
							
						})
					}
				})
				
			})
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
	console.log('uploaded: '+req.files[0].path)
	return res.status(200).send(req.files[0].path)
})

router.get('/api/editcontent/:urltitle/:pageindex/:index', ensureUser, function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var index = parseInt(req.params.index, 10);
	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(error, doc){
		if (error) {
			return next(error)
		}
		console.log(doc)
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
				info: 'Edit your entry.'
			})
		})
	})
})

router.post('/api/selectlayer/:urltitle/:pageindex/:index/:drawtype/:layer', upload.array(), function(req, res, next){
	delete req.app.locals.layer;
	var index = parseInt(req.params.index, 10);
	var layer = parseInt(req.params.layer, 10);
	var urltitle = req.params.urltitle;
	var drawtype = req.params.drawtype;
	req.app.locals.index = index;
	req.app.locals.layer = layer;
	req.app.locals.drawtype = drawtype;
	async.waterfall([
		
		function(next){
			Page.findOne({urltitle: urltitle, content: {$elemMatch: {index: index}}}, function(err, pub){
				if (err) {
					return next(err)
				}
				/*var ings = pub.content[index][''+req.params.type+''];
				var antiings = pub.content[index][''+!req.params.type+''];
				
				
				var findkey = 'content.$.'+req.params.type+'.current'
				//find.content[findkey] = true; 
				var set = {$set:{}};
				var key = 'content.0.'+req.params.type+'.$.current'
				
				set.$set[key] = true;
				
				Page.findOne({pageindex: pub.pageindex}).then(function(data1){
					if (!data1) return;
					data1.content[index]['substrates'].forEach(function(e){
						for (var i = 0; i < e.length; i++) {
							if (e[i].current) {
								e[i].current = false;
							}
						}
					})
					data1.content[index]['filling'].forEach(function(e){
						for (var i = 0; i < e.length; i++) {
							if (e[i].current) {
								e[i].current = false;
							}
						}
					})
					var set1 = {$set:{}};
					var key1 = 'content.'+index+'.'+req.params.type+'.'+layer+'.current';
					set1.$set[key1] = true;
					console.log(set1)
					Page.update({urltitle: urltitle}, set1, {safe: true, new: true, upsert: false}, function(error, doc){
						if (error) {
							return next(error)
						}*/
						Page.find({}, function(errrr, data){
							if (errrr) {
								return next(errrr)
							}
							next(null, data, pub, index, drawtype, layer)
						})
					//})
				//})
			})
		}
	], function(err, data, doc, index, drawtype, layer) {
		if (err) {
			return next(err)
		}
		var datarray = [];
		for (var l in data) {
			datarray.push(data[l])
		}
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
			info: ':)',
			save: true
		})
	})
})

router.post('/api/editcontent/:urltitle/:pageindex/:index', upload.array(), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var index = parseInt(req.params.index, 10);
	var title = req.body.title;
	var label = req.body.label;
	var description = req.body.description;
	var body = req.body;

	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(err, pub) {
		if (err) {
			return next(err)
		}
		var id = pub._id;
		var pageindex = parseInt(pub.pageindex, 10)
		var keys = Object.keys(body);
		var substrates = pub.content[index].substrates;
		var filling = pub.content[index].filling;
		var thissub = false;
		var subind, subname;
		var thisfill = false;
		var fillind, fillname;
		for (var q = 0; q < substrates.length; q++) {
			if (keys.indexOf(substrates[q].name) !== -1) {
				thissub = substrates[q];
				subind = substrates[q].index;
				subname = thissub.name;
			}
		}
		for (var r = 0; r < filling.length; r++) {
			if (keys.indexOf(filling[r].name) !== -1) {
				thisfill = filling[r];
				fillind = filling[r].index;
				fillname = thisfill.name;
			}
		}
		if (thissub || thisfill) {
			if (thissub && body["img_substrates_"+subind+""] !== null) {
				substrates[subind].image = body[subname] 
			}
			if (thisfill && body["img_filling_"+fillind+""] !== null) {
				filling[filling].image = body[fillname]
			}
		} else {
			for (var i = 0; i < thestore.substrates.length; i++) {
				for (var j = 0; j < keys.length; j++) {
					if (thestore.substrates[i].name === keys[j]) {
						var newentry = thestore.substrates[i];
						newentry.image = body[subname]
						substrates.push(newentry)
					}
				}		
			}
			for (var l = 0; l < thestore.filling.length; l++) {
				for (var m = 0; m < keys.length; m++) {
					if (thestore.filling[l].name === keys[m]) {
						var newentry = thestore.filling[l];
						newentry.image = body[fillname]
						filling.push(newentry)
					}
				}
			}
		}
		var entry = {
			index: index,
			pid: pageindex,
			label: body.label,
			title: body.title,
			description: body.description,
			current: true,
			substrates: substrates,
			filling: filling,
			image: body["img"] ? body["img"] : ""
		}
		entry = JSON.parse(JSON.stringify(entry))
		var key = 'content.$'
		var push = {$set: {}};
		push.$set[key] = entry;

		Page.findOneAndUpdate({pageindex: pageindex, content: {$elemMatch: {index: index}}}, push, {safe: true, new: true, upsert: false}, function(error, doc){
			if (error) {
				return next(error)
			}
			Page.find({}, function(err, data){
				if (err) {
					return next(err)
				}
				var datarray = [];
				for (var l in data) {
					datarray.push(data[l])
				}
				return res.render('publish', {
					type: 'blog',
					drawtype: req.app.locals.drawtype ? req.app.locals.drawtype : false,
					layer: req.app.locals.layer ? req.app.locals.layer : false,
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
		});
	})
})

module.exports = router;
