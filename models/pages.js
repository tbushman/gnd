var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	

var Page = new Schema({
	pageindex: Number,
	pagetitle: {
		type: String,
		unique: true,
		trim: true
	},
	urltitle: {
		type: String,
		unique: true,
		trim: true
	},
	content: [ {
		index: Number,
		pid: Number,
		label: String,
		title: String,
		description: String,
		current: Boolean,
		level: Number,
		substrates: [],
		filling: [],
		tools: [],
		image: String
	} ],
	publishers: []
	
}, { collection: 'pages' });

//Page.index({ 'content.$.index': 1 }, { unique: true, dropDups: true });
module.exports = mongoose.model('Page', Page);