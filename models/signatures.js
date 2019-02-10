var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var Signature = new Schema({
	ts: Date,
	lat: Number,
	lng: Number,
	bin: String,
	img: String,
	pu: String,
	username: String,
	givenName: String,
	documentId: String
})

module.exports = Signature;