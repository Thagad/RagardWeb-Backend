const chatMessage = require('../models/chatMessage')

const getChatHistory = async (req, res) => {
    try {
        const chatHistory = await chatMessage.find().sort({ timestamp: 1 }).limit(50);
        res.json(chatHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching chat history' });
    }
}

module.exports = {
    getChatHistory
}