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
var Page = require('./models/pages');
var async = require('async');
var Content = require('./models/content');
var favicon = require('serve-favicon');
mongoose.Promise = promise;
dotenv.load();

var app = express();
if (app.get('env') === 'production') {
	app.set('trust proxy', 1) // trust first proxy	
	app.use(function (req, res, next) {
	    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:80');
	    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Origin, X-Requested-With, Content-Type, Accept, Authorization');
	    res.setHeader('Access-Control-Allow-Credentials', true);
	    next()
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
    	//console.log(user);
    	if(!err) {
			done(null, user);
		} else {
			done(err, null);
		}
    });
});

var store = new MongoDBStore(
	{
		uri: 'mongodb://localhost/session_sfusd',
        collection: 'mySessions'
	}
)
store.on('error', function(error, next){
	next(error)
});

var sess = {
	secret: '12345QWERTY-SECRET',
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false,
	store: store
}
app.use(cookieParser(sess.secret));

// session middleware configuration
// see https://github.com/expressjs/session
app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.locals.appTitle = 'SFUSD Design';
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.locals.moment = require('moment');
app.locals.$ = require('jquery');
app.locals.fs = require('fs');
var marked = require('marked')
app.locals.md = marked; 
//app.locals.circularJSON = circularJSON;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/publishers', express.static(path.join(__dirname, '../../pu/publishers')));
app.use('/publishers/sfusd', express.static(path.join(__dirname, '../../pu/publishers/sfusd')));
app.use('/publishers/sfusd/:urltitle', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/sfusd/'+req.params.urltitle+'')).apply(this, arguments);
	})
	
});

app.use('/publishers/sfusd/:urltitle/:index', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/sfusd/'+req.params.urltitle+'/'+req.params.index+'')).apply(this, arguments);
	})
});

app.use('/publishers/sfusd/:urltitle/:index/images', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/sfusd/'+req.params.urltitle+'/'+req.params.index+'/images')).apply(this, arguments);
	})
});

app.use('/publishers/sfusd/:urltitle/:index/images/:drawtype', function(req, res, next) {
	Page.findOne({urltitle: req.params.urltitle}, function(err, doc){
		if (err) {
			return next(err)
		}
		return express.static(path.join(__dirname, '../../pu/publishers/sfusd/'+req.params.urltitle+'/'+req.params.index+'/images/'+req.params.drawtype+'')).apply(this, arguments);
	})
});

app.use('/', routes);
app.use(function (err, req, res, next) {

	console.log(err.stack)
	req.app.locals.username = null;
	req.app.locals.userId = null;
	req.app.locals.zoom = null;
	req.app.locals.loggedin = null;
	delete req.app.locals.pageTitle;
	req.logout();
	res.status(err.status || 500).send({
	    message: err.message,
	    error: err.status
	})
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).send('Not Found');
});

var uri = process.env.DEVDB;

var promise = mongoose.connect(uri, { useMongoClient: true }, {authMechanism: 'ScramSHA1'});
promise.then(function(db){
	db.on('error', console.error.bind(console, 'connection error:'));
})
//var db = mongoose.connection;


module.exports = app;