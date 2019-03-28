var mongoose = require('mongoose'),
		Publisher = require('mongoose-geojson-schema'),
		Schema = mongoose.Schema,
		passportLocalMongoose = require('passport-local-mongoose');

var schema = new Schema({
	username: {
		type: String,
		unique: true,
		trim: true
	},
	password: String,
	avatar: String,
	language: String,
	email: String,
	sig: [],
	geometry: Schema.Types.GeoJSON,
	admin: Boolean,
	slack: {
		oauthID: String
	},
	properties: {
		address1: String,
		address2: String,
		city: String,
		state: String,
		zip: String,
		place: String,
		placetype: String,
		title: String,
		givenName: String,
		time: {
			begin: Date,
			end: Date
		}
	}
	
}, { collection: 'gnd' });
schema.index({ geometry: '2dsphere' });
schema.plugin(passportLocalMongoose);
// geometry: {
// 	type: {
// 		type: String,
// 		enum: ['MultiPolygon'],
// 		required: true
// 	},
// 	coordinates: {
// 		type: [[Number]]
// 	}
// },

module.exports = mongoose.model('Publisher', schema);