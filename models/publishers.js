var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var Publisher = new Schema({
	userindex: {
		type: Number,
		unique: true
	},
	username: {
		type: String,
		unique: true,
		trim: true
	},
	password: String,
	email: String,
	content: [  ],
	avatar: String
	
}, { collection: 'publishers' });

Publisher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Publisher', Publisher);