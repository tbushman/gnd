var express = require('express');
var asynk = require('async');
var passport = require('passport');
var router = express.Router();
var mongoose = require('mongoose');
var url = require('url');
var fs = require('fsxt');
var path = require('path');
var glob = require("glob");
//var HtmlDiff = require('node-htmldiff');
var moment = require("moment");
var multer = require('multer');
var mkdirp = require('mkdirp');
var spawn = require("child_process").exec;
var dotenv = require('dotenv');
var marked = require('marked');
var pug = require('pug');
var Publisher = require('../models/publishers.js');
var Content = require('../models/content.js');
// var Diffs = require('../models/diffs.js');
var publishers = path.join(__dirname, '/../../..');
var ff = ['General Provisions', 'Concept Plan',  'Sketch Plan', 'Preliminary Subdivision Applications', 'Final Subdivision Applications', 'Vacating or Amending a Recorded Final Subdivision Plat, Street or Alley Final', 'Subdivision Ordinance Amendments', 'Noticing Requirements', 'Appeals', 'Special Excepetions', 'Design and Construction Standards', 'Guarantees for Subdivision Improvements, Facilities, and Amenities', 'Definitions']
// var InDesign = require('async-indesign-script');
// var juice = require('juice');
// var HtmlDocx = require('html-docx-js');
// var mammoth = require('mammoth');
// var HtmlDiffer = require('html-differ').HtmlDiffer;
// var htmlDiffer = new HtmlDiffer({
// 	ignoreAttributes: ['id', 'for', 'class', 'href', 'style']
// });
//var google = require("googleapis"); 
// var {google} = require('googleapis');
//var {googleAuth} = require('google-auth-library');
dotenv.load();
var upload = multer();

var storage = multer.diskStorage({
	
	destination: function (req, file, cb) {
		var p, q;
		if (req.params.type === 'png') {
			p = ''+publishers+'/pu/publishers/gnd/images/full/'+req.params.index+''
			q = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+req.params.index+''

		// } else if (req.params.type === 'csv') {
		// 	p = ''+publishers+'/pu/publishers/gnd/csv/'+req.params.id+''
		// 	q = ''+publishers+'/pu/publishers/gnd/csv/thumbs/'+req.params.id+''
		// 
		// } else if (req.params.type === 'txt') {
		// 	p = ''+publishers+'/pu/publishers/gnd/txt'
		// 	q = ''+publishers+'/pu/publishers/gnd/txt/thumbs'
		// } else if (req.params.type === 'doc') {
		// 	var os = require('os');
		// 	p = os.tmpdir() + '/gdoc';
		// 	q = ''+publishers+'/pu/publishers/gnd/tmp';
		// } else if (req.params.type === 'docx') {
		// 	p = ''+publishers+'/pu/publishers/gnd/docx'
		// 	q = null;//''+publishers+'/pu/publishers/gnd/word/thumbs'
		} else {
			p = ''+publishers+'/pu/publishers/gnd/images/full/'+req.params.index+''
			q = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+req.params.index+''

		}
				
		fs.access(p, function(err) {
			if (err && err.code === 'ENOENT') {
				mkdirp(p, function(err){
					if (err) {
						console.log("err", err);
					}
					if (q) {
						fs.access(q, function(err){
							if (err && err.code === 'ENOENT') {
								mkdirp(q, function(err){
									if (err) {
										console.log("err", err);
									}
									cb(null, p)
								})
							} else {
								cb(null, p)
							}
						})
					} else {
						cb(null, p)
					}
					
				})
			} else {
				cb(null, p)
			}
		})
		
	},
	filename: function (req, file, cb) {
		if (req.params.type === 'png') {
			cb(null, 'img_' + req.params.counter + '.png')
		// } else if (req.params.type === 'csv') {
		// 	cb(null, 'csv_' + req.params.id + '.csv')
		// } else if (req.params.type === 'txt') {
		// 	cb(null, 'txt_' + Date.now() + '.txt')
		// } else if (req.params.type === 'docx') {
		// 	cb(null, 'docx_'+Date.now()+'.docx')
		} else if (req.params.type === 'svg') {
			cb(null, 'docx_'+Date.now()+'.svg')
		}
  }
});
var uploadmedia = multer({ storage: storage/*, limits: { fieldSize: 25 * 1024 * 1024 }*/});

function rmDocs(req, res, next) {
	///api/importtxt/:type/:chtitle/:rmdoc
	//\b(\w)
	if (req.params.rmdoc) {
		asynk.waterfall([
			function(next){
				Content.find({'chapter.str': {$regex: RegExp(''+decodeURIComponent(req.params.chtitle)+'\.?$')}}, function(err, data){
					if (err) {
						return next(err)
					}
					Content.remove({'chapter.str': {$regex: RegExp(''+decodeURIComponent(req.params.chtitle)+'\.?$')}}, function(err, dat){
						if (err) {
							return next(err)
						}
						data.forEach(function(doc){
							var imgp = ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'';
							var thumbp = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'';
							var options = {nonull:true,nodir:true}
							var p = glob.sync(imgp, options)[0];
							var q = glob.sync(thumbp, options)[0];
							fs.pathExists(q, function(err, exists){
								if (err) {
									console.log(err)
								}
								if (exists) {
									fs.pathExists(p, function(err, exists2){
										if (err) {
											console.log(err)
										}
										if (exists2) {
											fs.remove(p, function(e){
												if (e) {
													console.log(e)
												}
												fs.remove(q, function(e){
													if (e) {
														console.log(e)
													}
													console.log(imgp, thumbp)

												})
											})	
										}
									})
								}
							})
						});
						next(null, req);
					});
					
				})
			},
			function(req, next){
				Content.find({}).sort({index:1}).lean().exec(function(err, data){
					if (err) {
						return next(err)
					}
					data.forEach(function(doc, i){
						if (doc.index !== i) {
							doc.index = i;
							Content.findOneAndUpdate({_id: doc._id}, {$set: {index: i}}, {safe: true}, function(err, doc){
								if(err){
									return next(err)
								}
							})
							/*doc.save(function(err){
								if (err) {
									console.log(err);
								} else {
									console.log('saved')
								}
							})*/
						}
					})
					next(null)
				})
			}
		], function(err){
			if (err) {
				return next(err)
			}
			return next();
		})

	}
}

function rmFile(req, res, next) {
	var imgp = ''+publishers+'/pu/publishers/gnd/images/full/'+req.params.index+'/'+'img_' + req.params.counter + '.png';
	var thumbp = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+req.params.index+'/'+'thumb_' + req.params.counter + '.png';
	//console.log(imgp, thumbp)
	var options = {nonull:true,nodir:true}
	var p = glob.sync(imgp, options)[0];
	var q = glob.sync(thumbp, options)[0];
	fs.pathExists(q, function(err, exists){
		if (err) {
			console.log(err)
		}
		if (exists) {
			fs.pathExists(p, function(err, exists2){
				if (err) {
					console.log(err)
				}
				if (exists2) {
					fs.remove(p, function(e){
						if (e) {
							console.log(e)
						}
						fs.remove(q, function(e){
							if (e) {
								console.log(e)
							}
							next()
						})
					})	
				} else {
					next();
				}
			})
			
		} else {
			next();
		}
	})
}
function renameEachImgDir(data, direction, indexes, oldInd, next) {
	
	asynk.waterfall([
		
		function(cb) {
			var qs = [];
			var count = 0;
			
			for (let i of indexes) {
				switch(direction){
					case 'none':
						break;
					case 'decrement':
						i--;
						break;
					case 'increment':
						i++;
						break;
					default:
						break;
				}
			
				var doc = data[count];
				
				for (var j = 0; j < doc.properties.media.length; j++) {
					j = parseInt(j, 10);
					var q1 = {
						query: {_id: doc._id},
						key: 'image',
						index: i,
						ind: j,
						//key: 'properties.media.$.image',
						image: '/publishers/gnd/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q1);
					var q2 = {
						query: {_id: doc._id},
						key: 'thumb',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: '/publishers/gnd/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q2);
					var q3 = {
						query: {_id: doc._id},
						key: 'thumb_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/gnd/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q3);
					var q4 = {
						query: {_id: doc._id},
						key: 'image_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/gnd/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q4);
					
				}
				var oldImgDir = ''+publishers+'/pu/publishers/gnd/images/full/'+(oldInd ? oldInd : doc.index)+'';
				var oldThumbDir = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+(oldInd ? oldInd : doc.index)+'';
				var newImgDir = ''+publishers+'/pu/publishers/gnd/images/full/'+i+'';
				var newThumbDir = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+i+'';
				if (fs.existsSync(oldImgDir)) {
					fs.moveSync(oldImgDir, newImgDir, { overwrite: true });
					fs.moveSync(oldThumbDir, newThumbDir, { overwrite: true });
				}
				count++;
			}
			cb(null, qs)
		},
		function(qs, cb) {
			asynk.eachSeries(qs, function(q, nxt){
				Content.findOne(q.query, function(err, doc){
					if (err) {
						nxt(err)
					}
					if (doc) {
						doc.properties.media[q.ind][q.key] = q.image;
						doc.save(function(err){
							if (err) {
								nxt(err)
							} else {
								nxt(null)
							}
						})
					} else {
						nxt(null)
					}
				})
			}, function(err){
				if(err) {
					cb(err)
				} else {
					cb(null)
				}
			})
		}
	], function(err) {
		if (err) {
			return next(err) 
		}
		return next();
	})
	
}

// https://gist.github.com/liangzan/807712/8fb16263cb39e8472d17aea760b6b1492c465af2
function emptyDirs(index, next) {
	var p = ''+publishers+'/pu/publishers/gnd/images/full/'+index+'';
	var q = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+index+'';
	fs.emptyDir(p, function(err){
		if (err) {
			return next(err)
		}
		fs.emptyDir(q, function(err) {
			if (err) {
				return next(err)
			}
			next()
		})
	})
}

function ensureContent(req, res, next) {
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new/'+0+'')
		} else {
			return next()
		}
	});
}

function getDat(req, res, next){
	asynk.waterfall([
		function(cb){
			var dat = []
			Content.distinct('chapter.ind', function(err, distinct){
				if (err) {
					cb(err)
				}
				if (distinct.length === 0) {
					
					Content.find({}).sort({index: 1, 'section.ind':1}).lean().exec(function(err, data){
						if (err) {
							cb(err)
						}
						data = //(data.length ? 
							data.sort(function(a,b){
								if (parseInt(a.section.ind,10) < parseInt(b.section.ind, 10)) {
									return -1;
								} else {
									return 1;
								}
							})
							 // : )
						// console.log(data)
						// if (data.length)
						dat.push(data)
						cb(null, dat, [1])
					})
				} else {
					distinct.forEach(function(key, i) {
						Content.find({'chapter.ind':key}).sort({index: 1, 'section.ind':1}).lean().exec(function(err, data){
							if (err) {
								cb(err)
							}
							
							if (data.length === 0) return;
							if (data.length > 0) {
								data = data.sort(function(a,b){
									if (parseInt(a.section.ind,10) < parseInt(b.section.ind, 10)) {
										return -1;
									} else {
										return 1;
									}
								})
								dat.push(data)
							}
						})
					});
					cb(null, dat, distinct)
				}
				
			});
		}
	], function(err, dat, distinct){
		if (err) {
			return next(err)
		}
		req.dat = dat;
		req.distinct = distinct;
		console.log(req.dat, req.distinct)
		return next()
	})
}

function ensureAuthenticated(req, res, next) {
	console.log(req.isAuthenticated())
	if (req.isAuthenticated()) {
		req.session.userId = req.user._id;
		req.session.loggedin = req.user.username;
		return next();
	}
	return res.redirect('/login');
}

function ensureAdmin(req, res, next) {
	//console.log(req.isAuthenticated())
	if (!req.isAuthenticated()) {
		return res.redirect('/login')
	}
	//req.session.userId = req.user._id;
	Publisher.findOne({_id: req.session.userId}, function(err, pu){
		if (err) {
			return next(err)
		}
		
		if (pu.admin) {
			req.publisher = Publisher;
			req.user = pu;
			req.session.loggedin = req.user.username;
			return next();
		} else {
			req.publisher = User;
			req.session.loggedin = null;
			return res.redirect('/')
		}
	})
}

function mkdirpIfNeeded(p, cb){
	fs.access(p, function(err) {
		if (err && err.code === 'ENOENT') {
			mkdirp(p, function(err){
				if (err) {
					console.log("err", err);
				} else {
					cb()
				}
			})
		} else {
			cb()
		}
	})
	
}
// router.all(/^\/((?!login|register|logout).*)$/, ensureAdmin/*, ensureApiTokens*/);

//if logged in, go to your own profile
//if not, go to global profile (home)
router.get('/', function (req, res) {

	if (req.session.loggedin) {
		if (req.isAuthenticated()) {
			req.session.userId = req.user._id;
			req.session.loggedin = req.user.username;
			return res.redirect('/api/publish')
		} else {
			return res.redirect('/home');
		}


	} else {
		return res.redirect('/home')
	}
});


router.get('/register', function(req, res) {
	delete req.session.loggedin;
	// googleTranslate.getSupportedLanguages(function(err, languageCodes) {
		var langs = [];
		// for (var i = 0; i < languageCodes.length; i++) {
		// 	if (languages[languageCodes[i]] !== undefined) {
		// 		var obj = languages[languageCodes[i]];
		// 		obj.code = languageCodes[i];
		// 		langs.push(obj)
		// 	}
		// 
		// }
		return res.render('register', {csrfToken: req.csrfToken(), info: 'Thank you', action: 'login', languages: langs, avail: false } );

	// });
});

router.post('/register', function(req, res, next) {
	var langs = [];
	// googleTranslate.getSupportedLanguages(function(err, languageCodes) {
	// 
	// 	for (var i = 0; i < languageCodes.length; i++) {
	// 		if (languages[languageCodes[i]] !== undefined) {
	// 			var obj = languages[languageCodes[i]];
	// 			obj.code = languageCodes[i];
	// 			langs.push(obj)
	// 		}
	// 
	// 	}
		if (!req.body.givenName) {
			//upload.array() has not yet been fs-ed.
			return res.render('register', {info: 'You must provide your full name for the digital signature. No punctuation allowed. Example: "Firstname Lastname"', languages: langs})
		}
		Publisher.find({}, function(err, data){
			if (err) {
				return next(err)
			}
			var admin;
			if (req.body.username === 'tbushman') {
				admin = true;
			} else {
				admin = false;
			}
			Publisher.register(new Publisher({ username : req.body.username, avatar: '/images/publish_logo_sq.svg', language: req.body.languages, admin: admin, email: req.body.email, properties: { givenName: req.body.givenName, title: req.body.title, place: req.body.place, placetype: req.body.placetype, time: { begin: req.body.datebegin, end: req.body.dateend } } }), req.body.password, function(err, user) {
				if (err) {
					return res.render('register', {info: "Sorry. That Name already exists. Try again.", languages: langs});
				}
				req.session.username = req.body.username;
				passport.authenticate('local')(req, res, function () {
					Publisher.findOne({username: req.body.username}, function(error, doc){
						if (error) {
							return next(error)
						}
						req.session.userId = doc._id;
						req.session.loggedin = doc.username;
						return res.redirect('/api/publish')
					})
				});
			});
		})
	// })

});

router.get('/login', function(req, res, next){

	return res.render('login', { 
		user: req.user,
		csrfToken: req.csrfToken(),
		menu: 'login'
	});
});

router.post('/login', passport.authenticate('local', {
	failureRedirect: '/login'
}), function(req, res, next) {

	req.session.userId = req.user._id;
	req.session.loggedin = req.user.username;
	res.redirect('/');		
});

/*router.get('/auth/googledrive', passport.authenticate('google', {scope: 'https://www.googleapis.com/auth/drive'}), function(req, res, next){
	return next();
})*/

router.get('/logout', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	asynk.waterfall([
		function(next){
			req.session.userId = null;
			req.session.loggedin = null;
			req.session.failedAttempt = false;
			req.logout();
			next(null, req)
		},
		function(req, next) {
			if (req.user || req.session) {
				req.user = null;
				req.session.destroy(function(err){
					if (err) {
						req.session = null;
						//improve error handling
						
					} else {
						req.session = null;
					}
					next(null)
				});		
			} else {
				next(null);
			}
		}
	], function(err){
		if (err) {
			return next(err)
		}
		return res.redirect('/');
	})	
});


router.post('/reserve/:givenName', function(req, res, next){
	req.session.givenName = decodeURIComponent(req.params.givenName);
	return res.status(200).send(req.session.givenName);
})

router.get('/login', function(req, res, next){
	// req.session.theStore = thestore;

	return res.render('login', {
		user: req.user
	});
});

router.post('/check/:givenName', function(req, res, next){
	Publisher.find({'properties.givenName': decodeURIComponent(req.params.givenName)}, function(error, pages){
		if (error) {
			return next(error)
		}
		if (!error && pages.length > 0) {
			return res.send('This name is in use.')
		}
		return res.send('Available')

	})
})

router.all('/translate/:text', function(req, res, next){

	googleTranslate.translate(decodeURIComponent(req.params.text), 'en', req.session.user ? req.session.user.language : 'es', function(err, translation){
		if (err) {
			console.log(err)
		}

		return res.json(translation.translatedText);
	});
});


router.post('/panzoom/:lat/:lng/:zoom', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)

	var zoom = parseInt(req.params.zoom, 10);
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var position = {
		lat: lat,
		lng: lng,
		zoom: zoom
	}
	
	req.session.position = position;
	return res.status(200).send('ok')
	
});

// router.get('/api/init', function(req, res, next){
// 	Publisher.findOne({_id: req.session.userId, admin: true}, function(err, pu){
// 		if (err) {
// 			cb(err);
// 		}
// 		if (!pu) {
// 			return res.redirect('/')
// 		}
// 
// 	})
// })

//dat
router.get('/home', getDat, function(req, res, next) {
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			Publisher.findOne({_id: req.session.userId}, function(err, pu) {
				if (err) {
					return next(err)
				}
				if (data.length === 0) {
					
					if (pu && pu.admin) return res.redirect('/api/new/'+0+'');
					if (!pu) return res.redirect('/register');
				}
				return res.render('publish', {
					menu: 'home',
					dat: req.dat,
					ff: req.distinct
					
				})				
			})
			
		});
});

// doc
router.get('/list/:id/:mi', function(req, res, next){
	req.session.importgdrive = false;
	Content.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (req.isAuthenticated()) {
				return res.render('publish', {
					csrfToken: req.csrfToken(),
					pu: req.user,
					type: 'blog',
					menu: 'doc',
					loggedin: req.session.loggedin,
					dat: [data],
					doc: doc,
					mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null)
				})
			} else {
				return res.render('publish', {
					menu: 'doc',
					type: 'blog',
					loggedin: req.session.loggedin,
					dat: [data],
					doc: doc,
					mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null)
				})
			}
		})
	})
})

// data
router.get('/menu/:title/:chapter', function(req, res, next){
	req.session.importgdrive = false;
	var key, val;
	var key2 = null, val2;
	var find = {}

	if (!req.params.chapter || req.params.chapter === 'null') {
		if (!req.params.title) {
			return res.redirect('/')
		}
		key = 'title.ind';
		val = parseInt(req.params.title, 10);
		
			
	} else {
		key = 'chapter.ind';
		val = parseInt(req.params.chapter, 10);
		key2 = 'title.ind';
		val2 = parseInt(req.params.title, 10);
		
	}
	find[key] = val;
	/*if (key2) {
		find[key2] = val2;
	}*/
	Content.find(find).sort( { index: 1 } ).lean().exec(function(err, data){
		if (err) {
			return next(err)
		}
		data = data.sort(function(a,b){
			if (parseInt(a.section.ind,10) < parseInt(b.section.ind, 10)) {
				return -1;
			} else {
				return 1;
			}
		})
		return res.render('publish', {
			menu: 'data',
			// dat: [data],
			data: data,
			loggedin: req.session.loggedin
		})
	})
	
});

router.get('/profile/:username', function(req, res, next) {
	Content.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
		if (err) {return next(err)}
		Publisher.findOne({_id: req.session.userId}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.render('publish', {
				// dat: [data],
				data: data,
				// doc: doc,
				pu: pu,
				type: 'blog', //'blog' //'map'
				// drawtype: 'filling', //'substrates',
				menu: 'data' //home, login, register, data, doc, pu?
			})
		})
	})
})
// //every edit-access api checks auth
router.all('/api/*', ensureAuthenticated, ensureAdmin)

router.all('/sig/*', ensureAuthenticated)

router.get('/sig/publish/:id', function(req, res, next){
	Content.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
		if (err) {return next(err)}
		Content.findOne({_id: req.params.id}, function(err, doc){
			if (err) {return next(err)}
			Publisher.findOne({_id: req.session.userId}, function(err, pu){
				if (err) {
					return next(err)
				}
				return res.render('publish', {
					// data: data,
					doc: doc,
					pu: pu,
					type: 'draw', //'blog' //'map'
					drawtype: 'filling', //'substrates',
					menu: 'sign'
				})
			})
		})
	})
})

router.get('/sig/editprofile', function(req, res, next){
	Content.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
		if (err) {return next(err)}
		Publisher.findOne({_id: req.session.userId}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.render('publish', {
				// dat: [data],
				// data: data,
				// doc: doc,
				loggedin: req.session.loggedin,
				pu: pu,
				type: 'blog', //'blog' //'map'
				// drawtype: 'filling', //'substrates',
				menu: 'pu', //home, login, register, data, doc, pu?
				csrfToken: req.csrfToken()
				// ,
				// avail: true
			})
		})
	})
})

// save edits
router.post('/sig/editprofile', function(req, res, next){
	var body = req.body;
	var username = req.user.username;
	//console.log(Object.keys(body))
	asynk.waterfall([
		function(next) {
			var imgurl = ''+publishers+'/publishers/'+ req.user.username +'/images/avatar/'+ req.user.username + '.png';
			if (body.avatar.substring(0,1) !== "/") {
				var imgbuf = new Buffer(body.avatar, 'base64'); // decode

				fs.writeFile(imgurl, imgbuf, function(err) {
					if (err) {
						console.log("err", err);
					}
					imgurl = imgurl.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '')
					next(null, imgurl, body)
				})
			} else {
				imgurl = imgurl.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '')
				next(null, imgurl, body)
			}
			
		},
		function(imgurl, body, next) {
			
			Publisher.findOne({_id: req.user._id}, function(err, pu){
				if (err) {
					return next(err)
				}
				var keys = Object.keys(body);
				keys.splice(Object.keys(body).indexOf('avatar'), 1);
				//console.log(keys)
				for (var i in keys) {
					if (pu[keys[i]] !== body[keys[i]]) {
						if (keys[i] === 'tags') {
							//console.log(body[keys[i]].split(','))
							if (!Array.isArray(body[keys[i]].split(','))) {
								pu[keys[i]] = [body[keys[i]].split(',')]
							} else {
								pu[keys[i]] = body[keys[i]].split(',')
							}
							
						} else {
							pu[keys[i]] = body[keys[i]]
						}
					}
				}
				next(null, pu, imgurl)
			})
		},
		function(pu, imgurl, next) {
			pu.avatar = imgurl;
			pu.save(function(err){
				if (err) {
					next(err)
				} else {
					next(null, pu)
				}
				
			})
			}
			
	], function(err, pu){
		if (err) {
			return next(err)
		}
		return res.redirect('/profile/'+pu.username)
	})
})

// data
router.get('/api/publish', getDat, function(req, res, next) {

	var outputPath = url.parse(req.url).pathname;
	var dat = req.dat;
	asynk.waterfall([
		function(cb) {
			Publisher.findOne({_id: req.session.userId}, function(err, pu){
				if (err) {
					cb(err);
				}
				Content.find({signatures: {$elemMatch:{pu:pu._id}}}, function(err, pages){
					if (err) {
						cb(err)
					}
					cb(null, pu, pages, dat)
				})
			})
		}
	], function(err, pu, pages, dat){
		if (err) {
			return next(err)
		}
		return res.render('publish', {
			loggedin: pu.username,
			menu: 'dat',
			data: (pages.length ? pages : null),
			dat: dat,
			pu: pu
		})
	})
})

router.get('/api/new/:chind', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	var coastlines = //await //JSON.stringify(
		require(''+path.join(__dirname, '/..')+'/public/json/coastlines.json').features
	//);
	// console.log(coastlines)
	var keys = await Object.keys(coastlines[0])
	// var multiPolygon = [
	// 	[[ -153.5, 18 ], [ -153.5, 21 ], [ -157, 21 ], [ -157, 18 ], [ -153.5, 18 ]]
	// ]
	// console.log(keys);
	var multiPolygon = await coastlines.map(function(ft) {
		if (Array.isArray(ft.geometry.coordinates)) {
			// console.log(ft.geometry.coordinates)
			return ft.geometry.coordinates			
		} else {
			console.log('doh')
			console.log(ft)
			return;
		}
	});
	// console.log(multiPolygon)
	//if (!multiPolygon) return res.redirect('/logout')
	var hRes = //await JSON.stringify(
		//require(
			await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/html/gnd.html', 'utf8')
	//)
	//console.log(outputPath)
	var csrf = req.csrfToken();
	Content.find({}).sort( { index: 1 } ).exec(async function(err, data){
		if (err) {
			return next(err)
		}
		Content.find({'chapter.ind': parseInt(req.params.chind)}, async function(err, chunk){
			if (err) {
				return next(err)
			}
			if (chunk.length) return res.redirect('/');
			await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.svg', ''+publishers+'/pu/publishers/gnd/images/thumbs/'+(data.length)+'/thumb_0.png')
			await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.svg', ''+publishers+'/pu/publishers/gnd/images/full/'+(data.length)+'/img_0.png')
			var content = await new Content({
				type: 'Feature',
				index: data.length,
				// db
				title: {
					ind: (115 + chunk.length),
					str: 'United States Congress' 
				},
				chapter: {
					ind: (chunk.length === 0 ? 0 : chunk[0].chapter.ind ),
					str: (chunk.length === 0 ? 'Session' : chunk[0].chapter.str )
				},
				section: {
					ind: (chunk.length === 0 ? 108 : (108 + chunk.length)),
					str: (chunk.length === 0 ? 'H. RES.' : chunk[0].section.str) 
				},
				properties: {
					section: (115 + chunk.length)+'.'+(chunk.length === 0 ? '109' : (108 + chunk.length)),
					published: true,
					// label: (chunk.length === 0 ? 'Recognizing the duty of the Federal Government to create a Green New Deal.' : chunk[0].properties.label)
					// 'Edit Subtitle',
					title: (chunk.length === 0 ? 'Recognizing the duty of the Federal Government to create a Green New Deal.' : chunk[0].properties.title),
					place: (chunk.length === 0 ? 'United States' : 'Edit Place'),
					description: marked(hRes),
					// current: false,
					time: {
						begin: moment().utc().format(),
						end: moment().add(1, 'hours').utc().format()
					},
					// media: [
					// 	{
					// 		index: 0,
					// 		name: 'Sample image',
					// 		image_abs: ''+publishers+'/pu/publishers/gnd/images/full/'+(data.length)+'/img_0.png',
					// 		image: '/publishers/gnd/images/thumbs/'+(data.length)+'/thumb_0.png',
					// 		thumb_abs: ''+publishers+'/pu/publishers/gnd/images/thumbs/'+(data.length)+'/thumb_0.png',
					// 		thumb: '/publishers/gnd/images/thumbs/'+(data.length)+'/thumb_0.png',
					// 		caption: 'Sample caption',
					// 		postscript: 'Sample postscript',
					// 		url: 'https://pu.bli.sh'
					// 	}
					// ],
					sig: [ ]	
				},
				geometry: {
					type: 'Polygon',
					coordinates: 
						// JSON.stringify(
							[[[ -153.5, 18 ], [ -153.5, 21 ], [ -157, 21 ], [ -157, 18 ], [ -153.5, 18 ]]]
						// )
					//JSON.parse(JSON.stringify(
						//multiPolygon
					//))
				}
			});
			console.log(content.geometry)
			content.save(function(err){
				if (err) {
					console.log(err)
					return next(err)
				}
				Content.find({}).sort( { index: 1 } ).exec(function(err, data){
					if (err) {
						return next(err)
					}
					return res.redirect('/')
				});
			});
			

		})
		
	});
});

router.post('/api/uploadmedia/:index/:counter/:type', rmFile, uploadmedia.single('img'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath, req.file)
	return res.status(200).send(req.file.path)
	
});

router.post('/api/editcontent/:id', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var id = req.params.id;
	var body = req.body;
	var keys = Object.keys(body);
	//console.log(body.lat, body.lng)
	if (!body.description){
		body.description = ''
	}
	asynk.waterfall([
		function(next){
			
			Content.findOne({_id: req.params.id},function(err, doc) {
				if (err) {
					return next(err)
				}
				var pu = req.user //&& req.user.admin;
				if (!pu) {
					return res.redirect('/')
				}
				next(null, doc, body, keys, pu)
				
			})
		},
		function(doc, body, pu, count, next) {
			console.log(footnotes)
			var straight = function(str) {
				return str.replace(/(\d\s*)&rdquo;/g, '$1\"').replace(/(\d\s*)&rsquo;/g, "$1'")
			}
			var desc = //removeExtras(
				body.description
			//);

			// var newdate = new Date();
			// var sig = (body.signature ? doc.properties.sig.push() : doc.properties.sig)//pu.admin ? 
			//console.log(desc, body.description);
			// Publisher.findOne({_id: req}$project: {sig:1}])
			var entry = {
				_id: doc._id,
				type: "Feature",
				index: doc.index,
				title: {
					ind: doc.title.ind,
					str: doc.title.str 
				},
				chapter: {
					ind: doc.chapter.ind,
					str: doc.chapter.str 
				},
				section: {
					ind: doc.section.ind,
					str: (!body.title ? doc.properties.title : marked(body.title).replace(/(<p>|<\/p>)/g,''))
				},
				properties: {
					published: (!body.published ? false : true),
					title: (!body.title ? doc.properties.title : marked(body.title).replace(/(<p>|<\/p>)/g,'')),
					// label: body.label ? body.label : doc.properties.label,
					place: body.place ? body.place : doc.properties.place,
					description: desc ? marked(desc) : doc.properties.description,
					time: {
						begin: new Date(body.datebegin),
						end: moment().utc().format()
					},
					// media: [],
					footnotes: footnotes
				},
				geometry: {
					type: "Polygon",
					coordinates: JSON.parse(JSON.stringify(body.latlng))
				},
				sig: doc.properties.sig
			}
			
			//console.log(body.latlng)
			//console.log(entry)
			var entrymedia = []
			
			entry = JSON.parse(JSON.stringify(entry))
			var set1 = {$set: {}};
			set1.$set['properties'] = entry.properties;

			// var key2 = 'sig';
			// var set2 = {$set: {}};
			// set2.$set[key2] = entrymedia;

			var set3 = {$set: {}};
			set3.$set['geometry'] = entry.geometry;

			// var set4 = {$push: {}};
			// var key4 = 'properties.diffs'
			// set4.$push[key4] = newdiff;
			
			var set5 = {$set:{}}
			var key5 = 'section.str'
			set5.$set[key5] = entry.section.str;

			var options = {safe: true, new: true, upsert: false};
			Content.findOneAndUpdate({_id: doc._id}, set1, options, function(err, docc) {
				if (err) {
					next(err) 
				}
				// Content.findOneAndUpdate({_id: doc._id}, set2, options, function(errr, doc) {
				// 	if (errr) {
				// 		next(errr)
				// 	}
					Content.findOneAndUpdate({_id: doc._id}, set3, options, function(errr, doc) {
						if (errr) {
							next(errr)
						}
						Content.findOneAndUpdate({_id: doc._id}, set5, options, function(errr, doc) {
							if (err) {
								return next(errr)
							}
							// if (!newdiff) {
							// 	next(null)
							// } else {
							// 	Content.findOneAndUpdate({_id: doc._id}, set4, options, function(errr, doc) {
							// 		if (errr) {
							// 			next(errr)
							// 		} else {
							// 			next(null)
							// 		}
							// 	})
							// }
							next(null)
						})
						
						
					})
				// })
			})
			
		}
	], function(err){
		if (err) {
			return next(err)
		}
		return res.redirect('/');
	})
	
});

router.post('/api/new', function(req, res, next) {
	
})

router.post('/api/newmap/:id/:index', uploadmedia.single('img'), function(req, res, next) {
	Content.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err) 
		}
		var index = parseInt(req.params.index, 10);
		var media = {
			index: index,
			name: 'Image '+(index + 1)+'',
			image: '/publishers/gnd/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			image_abs: ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			iframe: null,
			thumb: '/publishers/gnd/images/full/'+doc.index+'/img_'+index+'.png',
			thumb_abs: ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'/img_'+index+'.png',
			caption: '',
			postscript: '',
			featured: false
		}
		Content.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})
	})
})

router.post('/api/newmedia/:id/:index', function(req, res, next) {
	Content.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err) 
		}
		var index = parseInt(req.params.index, 10);
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'/thumb_'+index+'.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'/img_'+index+'.png')
		var media = {
			index: index,
			name: 'Image '+(index + 1)+'',
			image: '/publishers/gnd/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			image_abs: ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			iframe: null,
			thumb: '/publishers/gnd/images/full/'+doc.index+'/img_'+index+'.png',
			thumb_abs: ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'/img_'+index+'.png',
			caption: '',
			postscript: '',
			featured: false
		}
		Content.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(media)
		})
	})
	
});

router.post('/api/deleteentry/:id/:index', function(req, res, next) {
	var id = req.params.id;
	var index = parseInt(req.params.index, 10);
	Content.remove({_id: id}, function(err, data) {
		if (err) {
			return next(err); 
		}
		emptyDirs(index, function(err){
			if (err) {
				return next(err)
			}
			Content.find({index:{$gt:index}}).sort( { index: 1 } ).exec(function(err, dat){
				if (err) {
					return next(err)
				}
				var indexes = [];
				for (var i = 0; i < dat.length; i++) {
					indexes.push(dat[i].index);
				}
				dat = JSON.parse(JSON.stringify(dat));
				renameEachImgDir(dat, 'decrement', indexes, null, function(err){
					if (err) {
						console.log(err)
					}
					Content.update({index: {$gt: index}}, {$inc: {index: -1}}, { multi: true }, function(err, data) {
						if (err) {
							return next(err)
						}
					
						return res.status(200).send('ok');
					});
					
				})
			});
		})
	})
});

router.post('/api/deletemedia/:id/:index', function(req, res, next) {
	var id = req.params.id;
	var index = parseInt(req.params.index, 10);
	Content.findOne({_id: id}, function(err, thisdoc){
		if (err) {
			return next(err)
		}
		Content.findOneAndUpdate({_id: id}, {$pull: {'properties.media': {index: index}}}, {multi: false, new: true}, function(err, doc) {
			if (err) {
				return next(err) 
			}
			var media = doc.properties.media;
			if (media.length === 0) {
				media = []
			} else {
				for (var i = index; i < media.length; i++) {
					var oip = ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'/'+'img_' + (i+1) + '.png';
					var otp = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'/'+'thumb_' + (i+1) + '.png';
					var nip = ''+publishers+'/pu/publishers/gnd/images/full/'+doc.index+'/'+'img_' + i + '.png';
					var ntp = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+doc.index+'/'+'thumb_' + i + '.png';
					var options = {nonull:true,nodir:true}
					var oldImgPath = glob.sync(oip, options)[0];
					var oldThumbPath = glob.sync(otp, options)[0];
					var newImgPath = glob.sync(nip, options)[0];
					var newThumbPath = glob.sync(ntp, options)[0];
					if (fs.existsSync(oldImgPath)) {
						fs.moveSync(oldImgPath, newImgPath, { overwrite: true });
						fs.moveSync(oldThumbPath, newThumbPath, { overwrite: true });
					}
					media[i].image_abs = newImgPath;
					media[i].thumb_abs = newThumbPath;
					media[i].image = newImgPath.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '');
					media[i].thumb = newThumbPath.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '')
					media[i].index -= 1;
				}
			}
			Content.findOneAndUpdate({_id: id}, {$set:{'properties.media': media}}, function(err, doc){
				if (err) {
					return next(err)
				}
				// if deleted media was featured, assign featured value to first media
				if (thisdoc.properties.media[index] && thisdoc.properties.media[index].featured) {
					Content.findOneAndUpdate({_id: id, 'properties.media.index': 0}, {$set: {'properties.media.$.featured': true}}, function(err, doc) {
						if (err) {
							return next(err)
						}
						return res.status(200).send(doc);
					})
				} else {
					return res.status(200).send(doc);
				}
				
			})
		})	
	})
});

module.exports = router;
// var express = require('express');
// var passport = require('passport');
// var router = express.Router();
// var url = require('url');
// var fs = require('fs');
// var path = require('path');
// var moment = require("moment");
// var async = require("async");
// var multer = require('multer');
// var mkdirp = require('mkdirp');
// var spawn = require("child_process").spawn;
// var dotenv = require('dotenv');
// var Publisher = require('../models/publishers.js');
// var Page = require('../models/pages.js');
// var publishers = path.join(__dirname, '/../../..');
// var request = require('request');
// var marked = require('marked');
// var upload = multer();
// var thestore = require('../public/json/store.json');
// var languages = require('../public/json/languages.json');
// var cors = require('cors');
// 
// 
// dotenv.load();
// 
// const googleTranslate = require('google-translate')(process.env.GOOGLE_KEY);
// 
// //middleware
// function ensureAuthenticated(req, res, next) {
// 	console.log(req.isAuthenticated())
// 	if (req.isAuthenticated()) {
// 		req.session.user = req.user;
// 		req.session.loggedin = req.user.username;
// 		return next();
// 	}
// 	return res.redirect('/login');
// }
// 
// function ensurePage(req, res, next) {
// 	Page.findOne({pagetitle: ''+req.params.pagetitle+''}, function(err, page) {
// 		if (err) {
// 			return next(err);
// 		}
// 		if (!err && page === null) {
// 			return res.redirect('/')
// 		}
// 		req.session.pageindex = page.pageindex;
// 		return next();
// 
// 	});
// }
// 
// function ensureUserId(req, res, next) {
// 	Publisher.findOne({_id: req.params.userid}, function(err, user) {
// 		if (err) {
// 				return next(err);
// 			}
// 		if (user) {
// 			return next();
// 		} else {
// 			return res.redirect('/')
// 		}
// 	});
// }
// 
// function ensureUser(req, res, next) {
// 	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(err, page) {
// 		if (err) {
// 			return next(err);
// 		}
// 		if (page.publishers[0].username === req.session.loggedin) {
// 			return next();
// 		}
// 
// 		var outputPath = url.parse(req.url).pathname;
// 		return res.render('login', {route: outputPath})
// 	});
// }
// 
// 
// var storage = multer.diskStorage({
// 	destination: function (req, files, cb) {
// 		Page.findOne({pageindex: req.params.pageindex}, function(err, doc){
// 			if (err) {
// 				console.log(err)
// 			}
// 			var p = ''+publishers+'/pu/publishers/gnd/'+ doc.urltitle +'/'+req.params.index+'/images/'+(req.params.drawtype ? req.params.drawtype : 'main')+''
// 
// 			fs.access(p, function(err) {
// 
// 				if (err && err.code === 'ENOENT') {
// 					mkdirp(p, function(err){
// 						if (err) {
// 							console.log("err", err);
// 						}
// 						console.log('created folder: '+ p)
// 						cb(null, p)
// 					})
// 				} else {
// 					if (err && err.code === 'EACCESS') {
// 						console.log('permission error: '+err)
// 						cb(err)
// 					} else {
// 						cb(null, p)
// 
// 					}
// 				}
// 			})
// 		})
// 	},
// 	filename: function (req, files, cb) {
// 		if (req.params.drawtype && req.params.drawtype !== 'false') {
// 			cb(null, req.params.drawtype + '_' + req.params.layer + '.png')
// 		} else {
// 			cb(null, files[0].fieldname + '_' + req.params.index + '.png')
// 		}
//   }
// })
// 
// var uploadmedia = multer({ storage: storage })
// router.post('/api/uploadmedia/:pageindex/:index/:drawtype/:layer', uploadmedia.any(), function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	return res.status(200).send(req.files[0].path)
// })
// 
// router.all(/(.+)/, cors())
// 
// router.get('/doc/:pageindex', function(req, res, next){
// 	var pageindex = parseInt(req.params.pageindex, 10);
// 	var index = parseInt(req.params.index, 10);
// 	req.session.pageindex = pageindex;
// 	Page.findOne({pageindex: pageindex}, function(err, doc){
// 		if (err) {
// 			return next(err)
// 		}
// 		return res.status(200).send(doc)
// 	})
// });
// 
// router.get('/item/:pageindex/:index/:drawtype/:layer', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var index = parseInt(req.params.index, 10);
// 	var drawtype = req.params.drawtype;
// 	var layer = parseInt(req.params.layer, 10);
// 	var pageindex = parseInt(req.params.pageindex, 10);
// 	var index = parseInt(req.params.index, 10);
// 	req.session.pageindex = pageindex;
// 	Page.findOne({pageindex: pageindex, content: {$elemMatch:{index: index}}}, function(err, doc){
// 		if (err) {
// 			return next(err)
// 		}
// 		var item = doc.properties[drawtype][layer]
// 		return res.status(200).send(item)
// 	})
// });
// 

// 
// 
// router.get('/home', function(req, res, next) {
// 	//todo test null vs delete
// 	//delete req.session.pageTitle;
// 
// 	var info;
// 	// Get data
// 	async.waterfall([
// 		function(next){
// 
// 			Page.find({}, function(err, data){
// 				if (err) {
// 					next(err)
// 				}
// 
// 				if (!err && data.length === 0){
// 					//if no publisher in system
// 					return res.redirect('/register')
// 				}
// 				next(null, data)					
// 
// 			})
// 		}
// 	], function(err, data) {
// 		if (err) {
// 			console.log(err)
// 			return next(err)
// 		}
// 		var index = 0
// 
// 		var datarray = [];
// 		for (var l in data) {
// 			datarray.push(data[l])
// 		}
// 		if (req.isAuthenticated()) {
// 			return res.render('publish', {
// 				//theStore: thestore,
// 				type: 'blog',
// 				infowindow: 'home',
// 				loggedin: req.session.loggedin,
// 				data: datarray,
// 				index: index,
// 				info: info
// 			})
// 		} else {
// 			return res.render('publish', {
// 				//theStore: thestore,
// 				type: 'blog',
// 				infowindow: 'home',
// 				data: datarray,
// 				index: index,
// 				info: info
// 			})
// 		}
// 	})
// })
// 
// router.get('/sig/:pagetitle*', ensurePage, function (req, res, next) {
// 	console.log(req.headers)
// 	var index;
// 	var outputPath = url.parse(req.url).pathname;
// 
// 	//check if pos1 is username
// 	//view user profile
// 	var pagetitle = decodeURIComponent(req.params.pagetitle)
// 	var urltitle = pagetitle.split(' ').join('_');
// 	Page.find({}, function(err, data) {
// 		if (err) {
// 			return next(err)
// 		}
// 		Page.findOne({urltitle: urltitle}, function(error, doc){
// 			if (error) {
// 				return next(error)
// 			}
// 			if (!err && doc !== undefined && doc !== null) {
// 				var info;
// 				var datarray = [];
// 				for (var l in data) {
// 					datarray.push(data[l])
// 				}
// 				if (req.isAuthenticated()) {
// 					return res.render('publish', {
// 						pageindex: doc.pageindex,
// 						type: 'draw',
// 						infowindow: 'edit',
// 						drawtype: req.session.drawtype ? req.session.drawtype : false,
// 						layer: req.session.layer ? req.session.layer : doc.content[doc.content.length-1].level,
// 						loggedin: req.session.loggedin,
// 						index: doc.content[doc.content.length-1].index,
// 						doc: doc,
// 						data: datarray,
// 						info: info
// 					})
// 				} else {
// 					return res.render('publish', {
// 						pageindex: doc.pageindex,
// 						type: 'draw',
// 						infowindow: 'doc',
// 						index: doc.content[doc.content.length-1].index,
// 						doc: doc,
// 						data: datarray,
// 						info: info
// 					})
// 				}
// 
// 			} else {
// 				return res.redirect('/home')
// 			}
// 		})
// 	})
// });
// 
// 
// 
// router.all('/api/deletefeature/:pageindex/:index', ensureUser, function(req, res, next) {
// 	var index = parseInt(req.params.index, 10);
// 	var pageindex = parseInt(req.params.pageindex, 10)
// 	Page.deleteOne(
// 		{pageindex: pageindex},
// 		{$pull:{content:{index:index}}},
// 		{multi: false, new: true}, function(err, doc) {
// 			if (err) {
// 				return next(err)
// 			}
// 			Page.update({pageindex: pageindex, 'content.index':{$gte:index}}, {$inc:{'content.$.index': -1}}, function(er, pu){
// 				if (er) {
// 					return next(er)
// 				}
// 				Page.find({'publishers.username': req.session.loggedin}, function(error, data){
// 					if (error) {
// 						return next(error)
// 					}
// 					var datarray = [];
// 					for (var l in data) {
// 						datarray.push(data[l])
// 					}
// 					return res.render('publish', {
// 						type: 'blog',
// 						infowindow: 'doc',
// 						loggedin: req.session.loggedin,
// 						pageindex: doc.pageindex,
// 						index: 0,
// 						data: datarray,
// 						info: 'Deleted'
// 					})
// 				})
// 			})
// 		}
// 	)
// })
// 
// router.get('/api/editcontent/:urltitle/:pageindex/:index', ensureUser, function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 
// 	var outputPath = url.parse(req.url).pathname;
// 	var index = parseInt(req.params.index, 10);
// 	Page.findOne({pageindex: parseInt(req.params.pageindex, 10)}, function(error, doc){
// 		if (error) {
// 			return next(error)
// 		}
// 		Page.find({}, function(er, data){
// 			if (er) {
// 				return next(er)
// 			}
// 			var datarray = [];
// 			for (var l in data) {
// 				datarray.push(data[l])
// 			}
// 			return res.render('publish', {
// 				type: 'blog',
// 				infowindow: 'edit',
// 				loggedin: req.session.loggedin ? req.session.loggedin : false,
// 				pageindex: doc.pageindex,
// 				index: doc.content.length-1,
// 				doc: doc,
// 				data: datarray,
// 				drawtype: req.session.drawtype ? req.session.drawtype : 'info',
// 				layer: req.session.layer ? req.session.layer : null,
// 				info: 'Edit your entry.'
// 			})
// 		})
// 	})
// })
// 
// router.get('/api/selectlayer', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	if (!req.session.urltitle){
// 		return res.redirect('/api/publish')
// 	}
// 	Page.findOne({urltitle: req.session.urltitle, content: {$elemMatch: {index: req.session.index}}}, function(err, doc){
// 		if (err) {
// 			return next(err)
// 		}
// 		//console.log(doc)
// 		Page.find({}, function(errrr, data){
// 			if (errrr) {
// 				return next(errrr)
// 			}
// 			var datarray = [];
// 			for (var l in data) {
// 				datarray.push(data[l])
// 			}
// 			return res.render('publish', {
// 				type: req.session.type ? req.session.type : 'blog',
// 				infowindow: 'edit',
// 				drawtype: req.session.drawtype ? req.session.drawtype : "info",
// 				layer: req.session.layer ? req.session.layer : doc.content[doc.content.length-1].level,
// 				loggedin: req.session.loggedin,
// 				pageindex: doc.pageindex,
// 				index: req.session.index,
// 				doc: doc,
// 				data: datarray,
// 				info: ':)'
// 			})
// 		})
// 	})
// })
// router.all('/api/selectlayer/:urltitle/:pageindex/:index/:drawtype/:layer', function(req, res, next){
// 	//delete req.session.layer;
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var index = parseInt(req.params.index, 10);
// 	var layer = parseInt(req.params.layer, 10);
// 	var urltitle = req.params.urltitle;
// 
// 	var drawtype = req.params.drawtype;
// 	req.session.index = index;
// 	req.session.layer = layer;
// 	req.session.drawtype = drawtype;
// 	req.session.urltitle = urltitle;
// 	req.session.type = 'draw'
// 	req.session.pageindex = parseInt(req.params.pageindex, 10);
// 	Page.find({}, function(errrr, data){
// 		if (errrr) {
// 			return next(errrr)
// 		}
// 		var set = {$set:{}}
// 		var key = 'content.$.level'
// 		set.$set[key] = layer;
// 		Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch: {index: index}}}, set, {safe: true, new: true, upsert: false}, function(err, doc){
// 			if (err) {
// 				return next(err)
// 			}
// 			var set2 = {$set:{}}
// 			var key2 = 'content.$.'+drawtype+'.'+layer+'.unlocked'
// 			set2.$set[key2] = true;
// 			Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch: {index: index}}}, set2, {safe: true, new: true, upsert: false}, function(er, doc){
// 				if (er) {
// 					return next(er)
// 				}
// 				req.session.drawtype = drawtype;
// 				console.log(req.body)
// 				var drawtypes = ["substrates", "filling"];
// 				var keys = Object.keys(req.body);
// 				var set3 = {$set:{}};
// 				var key3, name3;
// 				for (var i = 0; i < drawtypes.length; i++) {
// 					for (var k = 0; k < doc.properties[drawtypes[i]].length; k++) {
// 						if (keys.indexOf(doc.properties[drawtypes[i]][k].name) !== -1) {
// 							key3 = 'content.$.'+drawtypes[i]+'.'+k+'.image'
// 							name3 = doc.properties[drawtypes[i]][k].name
// 						}
// 					}
// 
// 				}
// 				set3.$set[key3] = name3;
// 				Page.findOneAndUpdate({urltitle: urltitle, content: {$elemMatch:{index:index}}}, set3, {safe: true, new: true, upsert: false}, function(errr, doc){
// 					if (err) {
// 						return next(err)
// 					}
// 
// 					var datarray = [];
// 					for (var l in data) {
// 						datarray.push(data[l])
// 					}
// 					//return res.redirect('/api/selectlayer')
// 					return res.render('publish', {
// 						type: 'draw',
// 						drawtype: drawtype,
// 						layer: layer,
// 						infowindow: 'edit',
// 						loggedin: req.session.loggedin,
// 						pagetitle: doc.pagetitle,
// 						pageindex: doc.pageindex,
// 						index: index,
// 						doc: doc,
// 						data: datarray,
// 						info: ':)'
// 					})
// 				})
// 			})
// 		})
// 	})
// })
// 
// router.post('/api/allergy/:pageindex/:index/:drawtype/:level', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 
// 	var pageindex = parseInt(req.params.pageindex, 10);
// 	Page.findOne({pageindex:pageindex, publishers: {$elemMatch:{username: req.session.loggedin}}}, function(er, pub){
// 		if (er){
// 			return next(er)
// 		}
// 		var index = parseInt(req.params.index, 10);
// 		var drawtype = req.params.drawtype;
// 		var level = parseInt(req.params.level, 10);
// 		var push = {$push:{}};
// 		var key = 'publishers.$.allergies';
// 		push.$push[key] = pub.properties[drawtype][level].name;
// 		Page.findOneAndUpdate({pageindex:pageindex, publishers: {$elemMatch:{username: req.session.loggedin}}}, push, {safe: true, new: true, upsert: false}, function(err, doc){
// 			if (err){
// 				return next(err)
// 			}
// 			return res.status(200).send('ok')
// 		})
// 	})
// 
// })
// router.post('/api/editcontent/:urltitle/:pageindex/:index/:drawtype/:level', upload.array(), function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var index = parseInt(req.params.index, 10);
// 	var title = req.body.title;
// 	var description = req.body.description;
// 	var body = req.body;
// 	var drawtype = req.params.drawtype;
// 	req.session.drawtype = drawtype;
// 	req.session.layer = parseInt(req.params.level, 10);
// 	//console.log(drawtype)
// 	var level = parseInt(req.params.level, 10);
// 	var pageindex = parseInt(req.params.pageindex, 10);
// 	req.session.pageindex = pageindex;
// 	req.session.urltitle = req.params.urltitle;
// 	async.waterfall([
// 		function(cb){
// 			Page.findOne({pageindex: pageindex}, function(err, pub) {
// 				if (err) {
// 					return next(err)
// 				}
// 				var id = pub._id;
// 				var keys = Object.keys(body);
// 				var contentdatas = pub;
// 				var contentdata = contentdatas.properties
// 				var items = ["tools", "info", "substrates", "filling"];
// 				var drawThis = false;
// 
// 				for (var j = 0; j < contentdata.info.length; j++) {
// 
// 					if (contentdata.info[j].spec.unlock === ''+drawtype+'.'+level+'') {
// 
// 						contentdata.info[j].unlocked = true;
// 
// 						if (contentdata.info[j-1]) {
// 							contentdata.info[j-1].unlocked = false;
// 						}
// 						//console.log('unlocked ' +contentdata.info[j].name)
// 					}
// 				}
// 				cb(null, body, contentdata, keys, drawtype, index, pageindex)
// 			})
// 		},
// 		function(body, contentdata, keys, drawtype, index, pageindex, cb){
// 			var drawThis, drawInd, drawName
// 			//console.log(contentdata[drawtype].length)
// 			var drawInds = [];
// 			for (var q = 0; q < contentdata[drawtype].length; q++) {
// 				//console.log(keys, contentdata[drawtype][q].name)
// 				if (keys.indexOf(contentdata[drawtype][q].name) != -1) {
// 					//console.log('image hea')
// 					drawThis = contentdata[drawtype][q];
// 					drawInd = parseInt(drawThis.ind, 10);
// 					drawName = drawThis.name;
// 					contentdata[drawtype][q].unlocked = true;
// 					if (q === contentdata[drawtype].length - 1) {
// 						var contentkeys = ["substrates", "filling"];
// 						for (var i = 0; i < contentkeys.length; i++){
// 							if (contentkeys[i] !== drawtype) {
// 								contentdata[contentkeys[i]][0].unlocked = true;
// 							}
// 
// 						}
// 
// 					} else {
// 						//don't unlock yet
// 					}
// 				}
// 
// 			}
// 
// 			if (contentdata[drawtype].length > drawInd+1 ){
// 				//console.log(contentdata[drawtype][drawInd].name)
// 				contentdata[drawtype][drawInd+1].unlocked = true;
// 			}
// 			cb(null, body, contentdata, keys, drawName, index, pageindex)
// 
// 		},
// 		function(body, contentdata, keys, drawName, index, pageindex, cb){
// 			var contentkeys = ["substrates", "filling"]
// 			//contentdata[keys[i]] = body[keys[i]]
// 			for (var i = 0; i < contentkeys.length; i++) {
// 				for (var j = 0; j < contentdata[contentkeys[i]].length; j++) {
// 					if (keys.indexOf(contentdata[contentkeys[i]][j].name) !== -1) {
// 						console.log('draw this hea! '+body[contentdata[contentkeys[i]][j].name])
// 						contentdata[contentkeys[i]][j].image = body[contentdata[contentkeys[i]][j].name]
// 
// 					}
// 				}
// 
// 			}
// 			if (body['image']) {
// 				console.log('body image '+body['image'])
// 				contentdata.image = body['image']
// 			}
// 			if (body['title']) {
// 				contentdata.title = body['title']
// 			}
// 			if (body['description']) {
// 				contentdata.description = body['description']
// 			}
// 			var key = 'content.$'
// 			var push = {$set: {}};
// 			var pushKey = '$set';
// 			push.$set[key] = JSON.parse(JSON.stringify(contentdata));//JSON.parse(JSON.stringify(thisValue));
// 			Page.findOneAndUpdate({pageindex: pageindex, content: {$elemMatch: {index: index}}}, push, {safe: true, new: true, upsert: false}, function(error, doc){
// 				if (error) {
// 					cb(error)
// 				}
// 				cb(null)
// 
// 			});
// 		}
// 	], function(err){
// 		if (err) {
// 			return next(err)
// 		}
// 		req.session.type = "draw"
// 		//return res.status(200).send('ok')
// 		return res.status(303).redirect('/api/selectlayer')
// 	})
// 
// })
// 
// router.post('/api/nextstep/:urltitle/:pageindex/:index/:drawtype/:layer', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var urltitle = req.params.urltitle;
// 	var pageindex = parseInt(req.params.pageindex, 10);
// 	var index = parseInt(req.params.index, 10);
// 	var drawtype = req.params.drawtype;
// 	var layer = parseInt(req.params.layer, 10);
// 	req.session.layer = layer;
// 	Page.findOne({pageindex: pageindex, content: {$elemMatch: {index: index}}}, function(err, pub){
// 		if (err) {
// 			return next(err)
// 		}
// 		var keylist = [];
// 		var levellist = [];
// 		var keyz = ["substrates", "filling"];
// 		for (var i = 0; i < keyz.length; i++) {
// 			for (var j = 0; j < pub.properties[keyz[i]].length; j++) {
// 				if (pub.properties[keyz[i]][j].unlocked) {
// 					if (j === pub.properties[keyz[i]].length -1) {
// 						return res.redirect('/api/levelup')
// 					}
// 				} else {
// 					if (keyz[i] !== drawtype) {
// 						keylist.push(keyz[i]);
// 						levellist.push(j)
// 					}
// 				}
// 			}		
// 		}
// 		console.log('keylist')
// 		console.log(keylist)
// 		console.log('levellist')
// 		console.log(levellist)
// 		var drawtype = keylist[0] !== undefined ? keylist[0] : "info";
// 		var level = levellist[0] !== undefined ? levellist[0] : layer;
// 		var set1 = {$set: {}};
// 		var key1 = 'content.$.'+keylist[0]+'.'+levellist[0]+'.unlocked';
// 		set1.$set[key1] = true;
// 		req.session.drawtype = drawtype;
// 		req.session.pageindex = pageindex;
// 		Page.findOneAndUpdate({pageindex: pageindex, content: {$elemMatch: {index: index}}}, set1, {safe: true, new: true, upsert: false}, function(error, dc){
// 			if (error) {
// 				return next(error)
// 			}
// 			Page.find({}, function(er, data){
// 				if (er) {
// 					return next(er)
// 				}
// 				var datarray = [];
// 				for (var l in data) {
// 					datarray.push(data[l])
// 				}
// 				if (Number.isNaN(layer) || levellist[0] === thestore[drawtype].length - 1) {
// 					req.session.drawtype = drawtype === 'filling' ? 'substrates':'filling';
// 					req.session.layer = 0;
// 					//return res.redirect('/api/selectlayer')
// 					//return res.redirect('/api/levelup')
// 					//return res.redirect('/api/nextstep/'+urltitle+'/'+pageindex+'/'+index+'/'+(drawtype === 'filling' ? 'substrates':'filling')+'/0')
// 				}// else {
// 					return res.status(200).send('ok');
// 				//}
// 
// 			})
// 		})
// 	})
// });
// 
// router.get('/api/levelup', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var level = parseInt(req.session.layer, 10);
// 	level++;
// 
// 	var set = {$set:{}}
// 	var key = 'content.$.level'
// 	set.$set[key] = level;
// 	// var p = ''+publishers+'/pu/publishers/gnd/'+ doc.urltitle +'/'+req.params.index+'/images/'+(req.params.drawtype ? req.params.drawtype : 'main')+'';
// 	// var isP = fs.existsSync(p);
// 	// 
// 	// var set1 = {$set:{}}
// 	// var key1 = 'publishers.0.avatar';
// 	// set1.$set[key1] = '/images/avatars/avatar_'+level+'.svg';
// 	Page.findOne({pageindex: req.session.pageindex, content: {$elemMatch: {index: req.session.index}}}, function(errr, doc){
// 		if (errr) {
// 			return next(errr)
// 		}
// 		if (level > 2) {
// 			return res.redirect('/sig/'+doc.pagetitle+'/'+req.session.index+'')
// 		}
// 		Page.findOneAndUpdate({pageindex: req.session.pageindex, content: {$elemMatch: {index: req.session.index}}}, set, {safe: true, new: true, upsert: false}, function(err, doc){
// 			if (err) {
// 				return next(err)
// 			}
// 
// 			// Page.findOneAndUpdate({pageindex: req.session.pageindex, content: {$elemMatch: {index: req.session.index}}}, set1, {safe: true, new: true, upsert: false}, function(err, doc){
// 			// 	if (err) {
// 			// 		return next(err)
// 			// 	}
// 				Page.find({}, function(er, data){
// 					if (er) {
// 						return next(er)
// 					}
// 					var datarray = [];
// 					for (var l in data) {
// 						datarray.push(data[l])
// 					}
// 					return res.render('publish', {
// 						type: 'blog',
// 						infowindow: 'doc',
// 						drawtype: req.session.drawtype,
// 						layer: parseInt(req.session.layer, 10),
// 						loggedin: req.session.loggedin,
// 						pageindex: doc.pageindex,
// 						index: req.session.index ? req.session.index : doc.content[doc.content.length-1].index,
// 						doc: doc,
// 						data: datarray,
// 						info: ':)'
// 					})
// 				})
// 			// })
// 		})
// 	})
// 
// })
// 
// router.all('/api/done', function(req, res, next){
// 	Page.find({}, function(er, data){
// 		if (er){
// 			return next(er)
// 		}
// 		Page.findOne({pageindex: req.session.pageindex, content: {$elemMatch: {index: req.session.index}}}, function(err, doc){
// 			if (err){
// 				return next(err)
// 			}
// 			return res.render
// 		})
// 	})
// })
// module.exports = router;
