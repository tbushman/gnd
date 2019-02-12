var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var Signature = new Schema({
	ts: Date,
	lat: Number,
	lng: Number,
	bin: String,
	pu: String,
	username: String,
	givenName: String,
	documentId: String,	
	index: Number,
	image: String,
	image_abs: String,
	thumb: String,
	thumb_abs: String,
	caption: String,
	postscript: String,
	url: String,
	orientation: String

})

module.exports = Signature;