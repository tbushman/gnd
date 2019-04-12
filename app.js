var express = require('express');
var session = require('express-session');
var dotenv = require('dotenv');
var MongoDBStore = require('connect-mongodb-session')(session);
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
var async = require('async');
var favicon = require('serve-favicon');
var helmet = require('helmet');
var multer = require('multer');
var csrf = require('csurf');
var cors = require('cors');
var publishers = path.join(__dirname, '/../..');
var mkdirp = require('mkdirp');
var SlackStrategy = require('passport-slack').Strategy;
mongoose.Promise = promise;
dotenv.load();

var parseForm = bodyParser.urlencoded({ extended: false });
var parseJSONBody = bodyParser.json();
var parseBody = [parseJSONBody, parseForm];
var upload = multer();

var csrfProtection = csrf({ cookie: true });


var app = express();
if (app.get('env') === 'production') {
	app.enable('trust proxy');
	app.set('trust proxy', true); // trust first proxy	
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
// redirect wip  
app.all('*', function(req, res, next){
	if (req.originalUrl.split('list')[1]) {
		return res.redirect(301, 'https://esta.bli.sh')
	}
	return res.redirect(301, 'https://esta.bli.sh'+req.originalUrl)
})
passport.use(new LocalStrategy(Publisher.authenticate()));
passport.use(new SlackStrategy({
	clientID: process.env.SLACK_CLIENT_ID,
	clientSecret: process.env.SLACK_CLIENT_SECRET
	//,
	// callbackURL: (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV)
	// passReqToCallback: true
},
function(accessToken, refreshToken, profile, done) {
	// console.log(accessToken, refreshToken, profile)
	Publisher.find({}, function(err, data){
		if (err) {
			return done(err)
		}
		Publisher.findOne({ 'slack.oauthID': profile.user.id }, function(err, user) {
			if(err) {
				console.log(err);  // handle errors!
			}
			//console.log(profile, user)
			if (!err && user !== null) {
				done(null, user);
			} else {
				Publisher.findOne({'properties.givenName': profile.user.name, email: profile.user.email}, function(err, user) {
					if (err) {
						console.log(err);
					}
					if (!err && user !== null) {
						Publisher.findOneAndUpdate({_id: user._id}, {$set:{'slack.oauthID': profile.user.id}}, {new:true,safe:true}, function(err, pu){
							if (err) {
								console.log(err)
							}
							done(null, pu);
						})
						
					} else {
						user = new Publisher({
							admin: (profile.team.domain === 'saltlakedsa'),
							sig: [],
							username: profile.displayName.replace(/\s/g, '_'),
							email: profile.user.email,
							admin: true,
							avatar: profile.user.image_32,
							slack: {
								oauthID: profile.user.id,
								created: Date.now()
							},
							properties: {
								givenName: profile.user.name,
								time: {
									begin: new Date(),
									end: new Date()
								}
							}
						});
						user.save(function(err) {
							if(err) {
								console.log(err);  // handle errors!
							} else {
								console.log("saving user ...");
								done(null, user);
							}
						});
					}
					
					
				})
				
			}
		});
	})
	
}));
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

var store = new MongoDBStore(
	{
		mongooseConnection: mongoose.connection,
		uri: process.env.DEVDB,
		collection: 'gndSession',
		autoRemove: 'interval',     
		autoRemoveInterval: 3600
	}
)
store.on('error', function(error, next){
	console.log(error, next)
	next(error)
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

app.use(function(req, res, next) {
	
	res.locals.session = req.session;
	next();
});
// app.use(multer({ 
// 	onFileUploadComplete: async function (file) {
// 		console.log(file.fieldname + ' uploaded to  ' + file.path);
// 		// Encrypt file.
// 		var CryptoJS = require('crypto-js');
// 		const secret = process.env.CJSPW;
// 		const hash = await CryptoJS.AES.encrypt(file, secret);
// 
// 		encryptor.encryptFile(file, 'encryptedFile.dat', key, function(err) {
// 			// Encryption complete.remove original file
//        fs.unlink(file);
//      });
//    }
// }));
app.get(/^(\/|\/register$|\/login$|\/api\/new|\/api\/editcontent)/, csrfProtection);
// ensure multer parses before csrf
app.post(/^(\/register$|\/login$|\/api\/editcontent|\/sig\/editprofile)/, upload.array(), parseBody, csrfProtection);

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
	useMongoClient: true
	// authMechanism: 'ScramSHA1'
});
promise.then(function(db){
	db.on('error', console.error.bind(console, 'connection error:'));
	

})
//var db = mongoose.connection;


module.exports = app;