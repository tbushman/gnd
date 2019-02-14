var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var Signature = new Schema({
	ts: String,
	bin: String,
	puid: String,
	username: String,
	givenName: String,
	documentId: String,	
	index: Number,
	image: {
		type: String,
		unique: true
	},
	image_abs: String

}, {collection: 'sig'})
// const Signature = mongoose.model('Signature', signature);
//const SigSchema = signature;
module.exports = mongoose.model('Signature', Signature);
//{Signature, SigSchema};
// module.exports = Signature;