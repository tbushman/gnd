var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
	Content = require('./content.js');
	

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
  	index: {
      type: Number,
      unique: true,
      default: 0
    },
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
  } ],
	publishers: []
	
}, { collection: 'pages' });


module.exports = mongoose.model('Page', Page);