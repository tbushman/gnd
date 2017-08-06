var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var Item = new Schema({
	index: Number,
	name: String,
	image: String,
	caption: String,
	unlocked: Boolean,
	info: {
		safety: String,
		alt: []
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
		items: {
			substrates: [Item],
			filling: [Item],
			tools: [Item]
		},
		image: String
	} ],
	publishers: []
	
}, { collection: 'pages' });

//Page.index({ 'content.$.index': 1 }, { unique: true, dropDups: true });
module.exports = mongoose.model('Page', Page);