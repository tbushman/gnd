var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Content = require('mongoose-geojson-schema'),
	Diffs = require('./diffs.js');
var schema = new Schema({
	type: String,
	index: Number,
	geometry: Schema.Types.Polygon,
	// Congress
	title: {
		ind: Number,
		str: String
	},
	// Session
	chapter: {
		ind: Number,
		str: String 
	},
	// i.e Resolution # and status
	section: {
		ind: Number,
		str: String
	},
	properties: {
		label: String,
		section: String,
		published: Boolean,
		title: String,
		place: String,
		description: String,
		current: Boolean,
		time: {
			begin: Date,
			end: Date
		},
		diffs: [Diffs],
		footnotes: [ ]
	}
}, { collection: 'content' });
schema.index({ geometry: '2dsphere' });
module.exports = mongoose.model('Content', schema);

