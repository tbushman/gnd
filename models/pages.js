var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var Item = new Schema({
	ind: Number,
	name: String,
	image: String,
	caption: String,
	unlocked: Boolean,
	spec: {
		safety: String,
		alt: [],
		unlock: String
	}
})

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
		unlocked: Boolean,
		level: Number,
		info: [Item],
		substrates: [Item],
		filling: [Item],
		tools: [Item],
		image: String
	} ],
	publishers: []
	
}, { collection: 'gndpages' });

//Page.index({ 'content.$.index': 1 }, { unique: true, dropDups: true });
module.exports = mongoose.model('Page', Page);