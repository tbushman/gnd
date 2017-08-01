var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Content = new Schema({
	
	substrates: [
		{
			name: String,
			image: String,
			description: String,
			info : {
				safety: String,
				alt: [ ]
			}
		}
	],
	filling: [
		{
			name: String,
			image: String,
			description: String,
			info : {
				safety: String,
				alt: [ ]
			}
		}
	]
	
	
}, { collection: 'content' })

module.exports = mongoose.model('Content', Content);