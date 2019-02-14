var express = require('express');
var session = require('express-session');
var dotenv = require('dotenv');
var MongoDBStore = require('connect-mongo')(session);
var moment = require("moment");
var mongoose = require('mongoose');
var marked = require('marked');
var promise = require('bluebird');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var path = require('path')
var fs = require('fs');
var bodyParser = require('body-parser');
var http = require('http');
var routes = require('./routes/index');
var Publisher = require('./models/publishers');
var Page = require('./models/pages');
var async = require('async');
var favicon = require('serve-favicon');
var helmet = require('helmet');
var multer = require('multer');
var csrf = require('csurf');
var cors = require('cors');
var publishers = path.join(__dirname, '/../..');
var mkdirp = require('mkdirp');
mongoose.Promise = promise;
dotenv.load();

var parseForm = bodyParser.urlencoded({ extended: false });
var parseJSONBody = bodyParser.json();
var parseBody = [parseJSONBody, parseForm];
var upload = multer();

var csrfProtection = csrf({ cookie: true });


var app = express();
if (app.get('env') === 'production') {
	app.set('trust proxy', 1); // trust first proxy	
	app.use(cors());
	app.options('*', cors());
	app.use(function(req, res, next) {
		app.disable('x-powered-by');
		app.disable('Strict-Transport-Security');
		//app.disable('Access-Control-Allow-Credentials');
		res.set({
			'Access-Control-Allow-Origin' : '*',
			'Access-Control-Allow-Methods' : 'GET, POST, HEAD, OPTIONS',
			'Access-Control-Allow-Headers' : 'Cache-Control, Origin, Content-Type, Accept',
			'Access-Control-Allow-Credentials' : true
		});

		app.use(helmet.noCache({}));

		next();
	});
	
}
passport.use(new LocalStrategy(Publisher.authenticate()));
// serialize and deserialize
passport.serializeUser(function(user, done) {
  //console.log('serializeUser: ' + user._id);
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
	Publisher.findOne({_id: id}, function(err, user){

		if(!err) {
			done(null, user);
		} else {
			done(err, null);
		}
	});
});


var sess = {
	secret: process.env.SESSIONSECRET,
	name: 'nodecookie',
	resave: true,
	saveUninitialized: true,
	store: store,
	cookie: { maxAge: 180 * 60 * 1000 }
}
app.use(cookieParser(sess.secret));
app.use(session(sess));

// session middleware configuration
// see https://github.com/expressjs/session
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.locals.appTitle = 'Signature Tool';
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.locals.moment = require('moment');
app.locals.$ = require('jquery');
app.locals.fs = require('fs');
var marked = require('marked')
app.locals.md = marked; 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../../pu/publishers')));
app.use('/publishers', express.static(path.join(__dirname, '../../pu/publishers')));
/*app.use('/publishers/gnd', express.static(path.join(__dirname, '../../pu/publishers/gnd')));
app.use('/publishers/gnd/:urltitle', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/gnd/'+req.params.urltitle+'')).apply(this, arguments);
	})
	
});

app.use('/publishers/gnd/:urltitle/:index', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/gnd/'+req.params.urltitle+'/'+req.params.index+'')).apply(this, arguments);
	})
});

app.use('/publishers/gnd/:urltitle/:index/images', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/gnd/'+req.params.urltitle+'/'+req.params.index+'/images')).apply(this, arguments);
	})
});

app.use('/publishers/gnd/:urltitle/:index/images/:drawtype', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		console.log('static: '+req.params.drawtype)
		return express.static(path.join(__dirname, '../../pu/publishers/gnd/'+req.params.urltitle+'/'+req.params.index+'/images/'+req.params.drawtype+'')).apply(this, arguments);
	})
});

app.use('/publishers/gnd/:urltitle/:index/images/:drawtype/:file', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/gnd/'+req.params.urltitle+'/'+req.params.index+'/images/'+req.params.drawtype+'/'+req.params.file+'')).apply(this, arguments);
	})
});*/

app.use(function(req, res, next) {
	
	res.locals.session = req.session;
	next();
});
app.get(/^(\/|\/register$|\/login$|\/api\/new|\/api\/editcontent)/, csrfProtection);
// ensure multer parses before csrf
app.post(/^(\/register$|\/login$|\/api\/editcontent)/, upload.array(), parseBody, csrfProtection);
// var storage = multer.diskStorage({
// 
// 	destination: function (req, file, cb) {
// 		var p, q;
// 		if (!req.params.type) {
// 			p = ''+publishers+'/pu/publishers/gnd/signatures/'+req.params.did+'/'+req.params.puid+''
// 		} else {
// 			if (req.params.type === 'png') {
// 				p = ''+publishers+'/pu/publishers/gnd/images/full/'+req.params.index+''
// 				q = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+req.params.index+''
// 
// 			// } else if (req.params.type === 'csv') {
// 			// 	p = ''+publishers+'/pu/publishers/gnd/csv/'+req.params.id+''
// 			// 	q = ''+publishers+'/pu/publishers/gnd/csv/thumbs/'+req.params.id+''
// 			// 
// 			// } else if (req.params.type === 'txt') {
// 			// 	p = ''+publishers+'/pu/publishers/gnd/txt'
// 			// 	q = ''+publishers+'/pu/publishers/gnd/txt/thumbs'
// 			// } else if (req.params.type === 'doc') {
// 			// 	var os = require('os');
// 			// 	p = os.tmpdir() + '/gdoc';
// 			// 	q = ''+publishers+'/pu/publishers/gnd/tmp';
// 			// } else if (req.params.type === 'docx') {
// 			// 	p = ''+publishers+'/pu/publishers/gnd/docx'
// 			// 	q = null;//''+publishers+'/pu/publishers/gnd/word/thumbs'
// 			} else {
// 				p = ''+publishers+'/pu/publishers/gnd/images/full/'+req.params.index+''
// 				q = ''+publishers+'/pu/publishers/gnd/images/thumbs/'+req.params.index+''
// 
// 			}
// 		}
// 
// 		fs.access(p, function(err) {
// 			if (err && err.code === 'ENOENT') {
// 				mkdirp(p, function(err){
// 					if (err) {
// 						console.log("err", err);
// 					}
// 					if (q) {
// 						fs.access(q, function(err){
// 							if (err && err.code === 'ENOENT') {
// 								mkdirp(q, function(err){
// 									if (err) {
// 										console.log("err", err);
// 									}
// 									cb(null, p)
// 								})
// 							} else {
// 								cb(null, p)
// 							}
// 						})
// 					} else {
// 						cb(null, p)
// 					}
// 
// 				})
// 			} else {
// 				cb(null, p)
// 			}
// 		})
// 
// 	},
// 	filename: function (req, file, cb) {
// 		if (req.params.type === 'png') {
// 			cb(null, 'img_' + req.params.counter + '.png')
// 		// } else if (req.params.type === 'csv') {
// 		// 	cb(null, 'csv_' + req.params.id + '.csv')
// 		// } else if (req.params.type === 'txt') {
// 		// 	cb(null, 'txt_' + Date.now() + '.txt')
// 		// } else if (req.params.type === 'docx') {
// 		// 	cb(null, 'docx_'+Date.now()+'.docx')
// 		} else if (req.params.type === 'svg') {
// 			cb(null, 'docx_'+Date.now()+'.svg')
// 		}
//   }
// });
// var uploadmedia = multer({ storage: storage/*, limits: { fieldSize: 25 * 1024 * 1024 }*/});
// app.param('did');
// app.param('puid');
// app.post(/^(\/sig\/uploadsignature)/, uploadmedia.single('img'), parseBody, csrfProtection);

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	res.status(404).send('Not Found');
});

app.use(function (err, req, res) {
	res.status(err.status || 500).send({
		message: err.message,
		error: err.status
	})
});

var uri = process.env.DEVDB;

var promise = mongoose.connect(uri, { 
	native_parser:true, 
	useMongoClient: true, 
	authSource:'admin', 
	// authMechanism: 'ScramSHA1'
});
var store = new MongoDBStore(
	{
		mongooseConnection: mongoose.connection,
		uri: process.env.STORE,
		host: '127.0.0.1',
		port: '12707',
		db: 'gnd',
		// db: 'gnd',
		collection: 'mySessions'
	}
)
promise.then(function(db){
	db.on('error', console.error.bind(console, 'connection error:'));
	store.on('error', function(error, next){
		console.log(error, next)
		next(error)
	});

})
//var db = mongoose.connection;


module.exports = app;