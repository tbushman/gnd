var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var Publisher = new Schema({
	username: {
		type: String,
		unique: true,
		trim: true
	},
	password: String,
	avatar: String,
  language: String,
  allergies: []
	
}, { collection: 'gnd' });

Publisher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Publisher', Publisher);