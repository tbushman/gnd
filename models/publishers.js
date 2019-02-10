var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		passportLocalMongoose = require('passport-local-mongoose'),
		Content = require('mongoose-geojson-schema'),
		Signature = require('./signatures.js');

var Publisher = new Schema({
	username: {
		type: String,
		unique: true,
		trim: true
	},
	password: String,
	avatar: String,
	language: String,
	email: String,
	sig: [Signature],
	geometry: Schema.Types.Polygon,
	properties: {
		place: String,
		placetype: String,
		title: String,
		givenName: String
	}
	
}, { collection: 'gnd' });
Publisher.index({ geometry: '2dsphere' });
Publisher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Publisher', Publisher);