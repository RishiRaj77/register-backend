const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
  imageBase64: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically delete from DB after 24 hours to save space
  }
});

module.exports = mongoose.model('Avatar', avatarSchema);
