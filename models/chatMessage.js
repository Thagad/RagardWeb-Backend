const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatMessageSchema = new Schema({
    user: { type: String, required: true },
    text: { type: String, required: false }, // Make text optional
    image: { type: String, required: false }, // Add image field to store image URLs
    timestamp: { type: Date, default: Date.now }
});


const chatMessage = mongoose.model('chatMessage', chatMessageSchema);
module.exports = chatMessage;
