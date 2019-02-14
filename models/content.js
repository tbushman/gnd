var mongoose = require('mongoose'),
	Content = require('mongoose-geojson-schema'),
	Schema = mongoose.Schema;
var schema = new Schema({
	type: String,
	index: Number,
	geometry: Schema.Types.Polygon,
	// Congress
	title: {
		ind: String,
		str: String 
	},
	// Session
	chapter: {
		ind: String,
		str: String 
	},
	// i.e Resolution # and status
	section: {
		ind: String,
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
		// media: [
		// 	{
		// 		index: Number,
		// 		name: String,
		// 		image: String,
		// 		image_abs: String,
		// 		thumb: String,
		// 		thumb_abs: String,
		// 		caption: String,
		// 		postscript: String,
		// 		url: String,
		// 		orientation: String
		// 	}
		// ],
		footnotes: [ ]
	}
}, { collection: 'content' });
schema.index({ geometry: '2dsphere' });
module.exports = mongoose.model('Content', schema);

