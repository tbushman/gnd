var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Diffs = new Schema({
	date: Date,
	old: String,
	user: {
		_id: String,
		username: String,
		avatar: String
	},
	dif: [{
		count: Number,
		added: Boolean,
		removed: Boolean,
		value: String,
		
	}],
	str: String
});
module.exports = Diffs;//mongoose.model('Diffs', Diffs)