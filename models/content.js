var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Content = new Schema({
	index: Number,
	properties: {
		pid: Number,
		label: String,
		user: String,
		title: String,
		description: String,
		media: [
			{
				index: Number,
				name: String,
				image: String,
				iframe: String,
				thumb: String,
				caption: String
			}
		]		
	}
})

module.exports = Content;