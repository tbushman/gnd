var express = require('express');
var asynk = require('async');
var passport = require('passport');
var router = express.Router();
var mongoose = require('mongoose');
var url = require('url');
var fs = require('fsxt');
var path = require('path');
var glob = require("glob");
var csrf = require('csurf');
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
var Signature = require('../models/signatures.js');
// var Diffs = require('../models/diffs.js');
var publishers = path.join(__dirname, '/../../..');
var ff = ['General Provisions', 'Concept Plan',  'Sketch Plan', 'Preliminary Subdivision Applications', 'Final Subdivision Applications', 'Vacating or Amending a Recorded Final Subdivision Plat, Street or Alley Final', 'Subdivision Ordinance Amendments', 'Noticing Requirements', 'Appeals', 'Special Excepetions', 'Design and Construction Standards', 'Guarantees for Subdivision Improvements, Facilities, and Amenities', 'Definitions']
// var InDesign = require('async-indesign-script');
// var juice = require('juice');
// var HtmlDocx = require('html-docx-js');
// var mammoth = require('mammoth');
var HtmlDiffer = require('html-differ').HtmlDiffer;
var htmlDiffer = new HtmlDiffer({
	ignoreAttributes: ['id', 'for', 'class', 'href', 'style']
	// ,ignoreEndTags: true
});
//var google = require("googleapis"); 
// var {google} = require('googleapis');
//var {googleAuth} = require('google-auth-library');
dotenv.load();
var upload = multer();
var csrfProtection = csrf({ cookie: true });
var geolocation = require ('google-geolocation') ({
	key: process.env.GOOGLE_KEY
});
marked.setOptions({
	gfm: true,
	smartLists: true,
	smartypants: true,
	// xhtml: true,
	sanitize: true/*,
	breaks: true*/
})


var curly = function(str){
	//console.log(/\\n/g.test(str))
	//console.log(str.match(/\s/g))
	//console.log(str.match(/\"/g))
	if (!str){
		return ''
	} else {
		return str
		.replace(/(\s)'(\w)/g,'$1&lsquo;$2')
		.replace(/(\w)'(\s)/g,'$1&rsquo;$2')
		.replace(/(\s)"(\w)/g,'$1&ldquo;$2')
		.replace(/(\w)"(\s)/g,'$1&rdquo;$2')
		//.replace(/'\b/g, "&lsquo;")     // Opening singles
		//.replace(/\b'/g, "&rsquo;")     // Closing singles
		//.replace(/"\b/g, "&ldquo;")     // Opening doubles
		//.replace(/\b"/g, "&rdquo;")     // Closing doubles
		.replace(/(\w\.)"/g, "$1&rdquo;")     // Closing doubles
		.replace(/\u2018/g, "&lsquo;")
		.replace(/\u2019/g, "&rsquo;")
		.replace(/\u201c/g, "&ldquo;")
		.replace(/\u201d/g, "&rdquo;")
		.replace(/[“]/g, "&ldquo;")
		.replace(/[”]/g, "&rdquo;")
		.replace(/[’]/g, "&rsquo;")
		.replace(/[‘]/g, "&lsquo;")
		//.replace(/([a-z])'([a-z])/ig, '$1&rsquo$2')     // Apostrophe
		//
		//.replace(/(\d\s*)&rdquo/g, '$1\"')
		//.replace(/(\d\s*)&rsquo/g, "$1\'")
		.replace(/([a-z])&lsquo([a-z])/ig, '$1&rsquo;$2')
	}
}


function geoLocate(ip, zoom, cb) {
	// console.log(ip)
	var ping = spawn('ping', [ip]);
	ping.stdout.on('data', function(d){
		console.log(d)
	})
	var arp = spawn('arp', ['-a']);
	var mac;
	arp.stdout.on('data', function(dat){
		dat += '';
		dat = dat.split('\n');
		mac = dat[0].split(' ')[3];
	})
	// Configure API parameters
	const params = {
		wifiAccessPoints: [{
			macAddress: ''+mac+'',
			signalStrength: -65,
			signalToNoiseRatio: 40
		}]
	};
	geolocation(params, function(err, data) {
		if (err) {
			console.log(err)
			position = {lat: 34.0723, lng: -118.2437, zoom: zoom };
		} else {
			position = { lng: data.location.lng, lat: data.location.lat, zoom: zoom };	
		}
		cb(position);
	
	})
}

var storage = multer.diskStorage({
	
	destination: function (req, file, cb) {
		var p, q;
		if (!req.params.type) {
			p = ''+publishers+'/pu/publishers/gnd/signatures/'+req.params.did+'/'+req.params.puid+''
		} else {
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
		} else {
			cb(null, 'img_' + req.params.did + '_' + req.params.puid + '.png')
		}
  }
});
var uploadmedia = multer({ storage: storage/*, limits: { fieldSize: 25 * 1024 * 1024 }*/});

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
					
					Content.find({}).sort({index: 1, 'section.ind':1}).lean().exec(async function(err, data){
						if (err) {
							cb(err)
						}
						data = //(data.length ? 
							await data.sort(function(a,b){
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
					distinct.forEach(async function(key, i) {
						Content.find({'chapter.ind':key}).sort({index: 1, 'section.ind':1}).lean().exec(async function(err, data){
							if (err) {
								cb(err)
							}
							
							if (data.length === 0) return;
							if (data.length > 0) {
								data = await data.sort(function(a,b){
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
		// console.log(req.dat, req.distinct)
		return next()
	})
}

function ensureAuthenticated(req, res, next) {
	// console.log(req.isAuthenticated())
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
			req.user = pu;
			req.session.loggedin = req.user.username;
			return next();
		} else {
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
	if (!req.session.info) req.session.info = '';
	if (req.session.loggedin) {
		if (req.isAuthenticated()) {
			req.session.userId = req.user._id;
			req.session.loggedin = req.user.username;
			if (req.user.admin) {
				return res.redirect('/api/publish')
			}
			return res.redirect('/home')
			
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
						if (!user.admin) {
							return res.redirect('/sig/editprofile')
						}
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
	failureRedirect: '/register'
}), function(req, res, next) {
	if (!req.user.admin && process.env.ADMIN.split(',').indexOf(req.user.username) !== -1) {
		return res.redirect('/sig/admin')
	}
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
					if (!pu) return res.redirect('/sig/editprofile');
				}
				return res.render('publish', {
					menu: 'home',
					dat: req.dat,
					ff: req.distinct,
					info: 'This tool collects timestamped signatures.',
					type: 'blog',
					pu: pu
				})				
			})
			
		});
});

// doc
router.get('/list/:id/:mi', function(req, res, next){
	// req.session.importgdrive = false;
	Content.findOne({_id: req.params.id}).lean().exec(function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({}).lean().sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (req.isAuthenticated()) {
				// console.log(doc)
				var l = '/publishers/gnd/signatures/'+doc._id+'/'+req.user._id+'/img_'+doc._id+'_'+req.user._id+'.png'
				Signature.findOne({image: l}, function(err, pud){
					if (err) {
						return next(err)
					}
					// if (!pud) console.log('blag!')
					// else console.log('signed')
					// console.log(pud)
					return res.render('publish', {
						unsigned: (!pud ? true : false),
						csrfToken: req.csrfToken(),
						pu: req.user,
						type: 'blog',
						menu: 'doc',
						loggedin: req.session.loggedin,
						doc: doc,
						mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null),
						info: req.session.info
					})
				})
			} else {
				// console.log('not authenticated!')
				return res.render('publish', {
					menu: 'doc',
					type: 'blog',
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
			type: 'blog',
			data: data,
			loggedin: req.session.loggedin,
			info: req.session.info
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

router.get('/sig/admin', function(req, res, next) {
	if (process.env.ADMIN.split(',').indexOf(req.session.loggedin) !== -1) {
		Publisher.findOneAndUpdate({_id: req.session.userId}, {$set:{admin: true}}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.redirect('/api/publish')
		})
	}
});

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
	Content.find({}).lean().sort({'properties.time.end': 1}).exec(function(err, data){
		if (err) {return next(err)}
		Publisher.findOne({_id: req.session.userId}, async function(err, pu){
			if (err) {
				return next(err)
			}
			if (pu.sig.length > 0) {
				var sigs = await pu.sig.map(function(s){
					return s.documentId;
				});
				data = await data.filter(function(doc){
					var s = sigs.join('.')
					return (new RegExp(doc._id).test(s))
				})
			} else {
				data = null
			}
			return res.render('publish', {
				// dat: [data],
				data: data,
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
				var pd = (process.env.NODE_ENV === 'production' ? process.env.PD.toString() :  process.env.DEVPD.toString())

				fs.writeFile(imgurl, imgbuf, function(err) {
					if (err) {
						console.log("err", err);
					}
					
					imgurl = imgurl.replace(pd, '')
					next(null, imgurl, body)
				})
			} else {
				imgurl = imgurl.replace(pd, '')
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
			pu: pu,
			type: 'blog'
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
	const sanitize = require('sanitize-html');
	// console.log(multiPolygon)
	//if (!multiPolygon) return res.redirect('/logout')
	var hRes = //await JSON.stringify(
		//require(
			await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/txt/gnd.txt', 'utf8');
	const desc = sanitize(hRes, {
		allowedTags: [
			'a',
			'b',
			'p',
			'i',
			'em',
			'strong',
			'blockquote',
			'big',
			'small',
			'div',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'hr',
			'li',
			'ol',
			'ul',
			'table',
			'tbody',
			'thead',
			'td',
			'th',
			'tr',
			'caption'
			// ,
			// 'span'
		]
		// ,
		// allowedAttributes: {
		// 	'a': ['href', 'id', 'target'],
		// 	'span': ['id'],
		// 	'h1': ['id'],
		// 	'h2': ['id'],
		// 	'h3': ['id'],
		// 	'h4': ['id']
		// }
	});
	//)
	//console.log(outputPath)
	// var csrf = req.csrfToken();
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
					description: marked(desc),
					// current: false,
					time: {
						begin: moment().utc().format(),
						end: moment().add(1, 'hours').utc().format()
					}	
				},
				geometry: {
					type: 'Polygon',
					coordinates: 
						// JSON.stringify(
						// sample data TODO United States polygon
							[[[ -153.5, 18 ], [ -153.5, 21 ], [ -157, 21 ], [ -157, 18 ], [ -153.5, 18 ]]]
						// )
					//JSON.parse(JSON.stringify(
						//multiPolygon
					//))
				}
			});
			// console.log(content.geometry)
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

router.post('/sig/uploadsignature/:did/:puid', uploadmedia.single('img'), csrfProtection, function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath, req.file)
	Content.findOne({_id: req.params.did}, function(err, doc){
		if (err) {
			return next(err)
		}
		Publisher.findOne({_id: req.params.puid}, function(err, pu){
			if (err){
				return next(err)
			}
			if (!new RegExp(req.params.puid).test(pu._id)) return res.redirect('/login');
			geoLocate(req.ip, 6, function(position){
				var signature = new Signature({
					ts: ''+position.lat+','+position.lng+'G'+req.body.ts+'',//new Date(),
					puid: pu._id,
					username: pu.username,
					givenName: pu.properties.givenName,
					documentId: doc._id,	
					image: '/publishers/gnd/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png',
					image_abs: req.url
				});
				var push = {$push:{}};
				var key = 'sig';
				push.$push[key] = JSON.parse(JSON.stringify(signature))
				signature.save(function(err){
					if (err) {
						if (err.code === 11000) req.session.info = 'You have already signed this document.'
						else return next(err)
					} 
					Publisher.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
						if (err){
							return next(err)
						}
						// console.log(pu)
				
						// return res.render('publish', {
						// 	doc: doc,
						// 	info: info,
						// 	pu: pu,
						// 	menu: 'doc'
						// })
						// return res.redirect('/list/'+doc._id+'/'+null+'');
						
						// TODO gts 
						// ''+lat+','+lng+'G"\/'+pu.givenName+'\/"'+moment().utc().format()
						return res.status(200).send('/list/'+doc._id+'/'+null+'')
					})
					
				})
			})
		})
	})
});

// router.post('/api/uploadmedia/:index/:counter/:type', rmFile, uploadmedia.single('img'), function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath, req.file)
// 	return res.status(200).send(req.file.path)
// 
// });
router.get('/api/editcontent/:id', function(req, res, next){
	Content.findOne({_id: req.params.id}).lean().exec(function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({}).lean().sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			return res.render('publish', {
				csrfToken: req.csrfToken(),
				pu: req.user,
				type: 'blog',
				menu: 'edit',
				loggedin: req.session.loggedin,
				doc: doc,
				info: req.session.info
			})
		});
	});
})

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
	// console.log(body)
	asynk.waterfall([
		function(cb){
			
			Content.findOne({_id: req.params.id},function(err, doc) {
				if (err) {
					cb(err)
				}
				var pu = req.user //&& req.user.admin;
				if (!pu) {
					return res.redirect('/')
				}
				cb(null, doc, body, keys, pu)
				
			})
		},
		function(doc, body, keys, pu, cb) {
		// ,
		// function(doc, body, keys, pu, next) {
		// 	var footnotes = [];
		// 	var count = 0;
		// 	for (var k = 0; k < keys.length; k++) {
		// 
		// 		var thatkey = 'footnote'+count+''
		// 		if (keys[k] === thatkey) {
		// 			console.log(body[thatkey])
		// 			if (body[thatkey]) {
		// 				footnotes.push(body[thatkey])
		// 				count++;
		// 			}
		// 		}
		// 
		// 	}
		// 	next(null, doc, footnotes, body, pu, count)
		// },
		// function(doc, footnotes, body, pu, count, next) {
			// console.log(footnotes)
			// var straight = function(str) {
			// 	return str.replace(/(\d\s*)&rdquo;/g, '$1\"').replace(/(\d\s*)&rsquo;/g, "$1'")
			// }
			const sanitize = require('sanitize-html');
			var descc = //removeExtras(
				body.description
			//);
			
			const desc = sanitize(descc, {
				allowedTags: [
					'a',
					'b',
					'p',
					'i',
					'em',
					'strong',
					'blockquote',
					'big',
					'small',
					'div',
					'h1',
					'h2',
					'h3',
					'h4',
					'h5',
					'h6',
					'hr',
					'li',
					'ol',
					'ul',
					'table',
					'tbody',
					'thead',
					'td',
					'th',
					'tr',
					'caption'
					// ,
					// 'span'
				]
				// ,
				// allowedAttributes: {
				// 	'a': ['href', 'id', 'target'],
				// 	'span': ['id'],
				// 	'h1': ['id'],
				// 	'h2': ['id'],
				// 	'h3': ['id'],
				// 	'h4': ['id']
				// }
			});
			var isEqual = htmlDiffer.isEqual((!doc.properties.description ? '' : /*marked(*/doc.properties.description), /*marked*/(!desc ? '' : desc)/*/*)*/)
			var diffss = [], newdiff = null;
			if (!isEqual) {
				var diff = htmlDiffer.diffHtml((!doc.properties.description ? '' : doc.properties.description), (!desc ? '' : desc)/*)/*)*/);
				// console.log(isEqual, diff)
				diff.forEach(function(dif){
					//console.log(dif)
					diffss.push({
						count: dif.count,
						value: dif.value,
						added: dif.added,
						removed: dif.removed
					})
				})
				newdiff = {
					date: new Date(),
					user: {
						_id: pu._id,
						username: pu.username,
						avatar: pu.avatar
					},
					dif: diffss,
					str: desc
				};
			}

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
					description: desc ? desc : doc.properties.description,
					time: {
						begin: new Date(body.datebegin),
						end: moment().utc().format()
					},
					// media: [],
					footnotes: doc.properties.footnotes,
					diffs: doc.properties.diffs
				},
				geometry: {
					type: "Polygon",
					coordinates: JSON.parse(body.latlng)
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

			var set4 = {$push: {}};
			var key4 = 'properties.diffs'
			set4.$push[key4] = newdiff;
			
			var set5 = {$set:{}}
			var key5 = 'section.str'
			set5.$set[key5] = entry.section.str;

			var options = {safe: true, new: true, upsert: false};
			Content.findOneAndUpdate({_id: doc._id}, set1, options, function(err, docc) {
				if (err) {
					cb(err) 
				}
				// Content.findOneAndUpdate({_id: doc._id}, set2, options, function(errr, doc) {
				// 	if (errr) {
				// 		next(errr)
				// 	}
					Content.findOneAndUpdate({_id: doc._id}, set3, options, function(errr, docc) {
						if (errr) {
							cb(errr)
						}
						Content.findOneAndUpdate({_id: doc._id}, set5, options, function(errr, docc) {
							if (err) {
								cb(errr)
							}
							else if (!newdiff) {
								cb(null)
							} else {
								Content.findOneAndUpdate({_id: doc._id}, set4, options, function(errr, docc) {
									if (errr) {
										cb(errr)
									} else {
										cb(null)
									}
								})
							}
							// next(null)
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
					media[i].image = newImgPath.replace(pd, '');
					media[i].thumb = newThumbPath.replace(pd, '');
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
