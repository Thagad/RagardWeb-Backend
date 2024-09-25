const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile, logoutUser } = require('../controllers/authController');
const { getChatHistory } = require('../controllers/chatController');


//middleware
router.use(
    cors({
        credentials: true,
        origin: 'https://ragard.onrender.com'})
);

router.get('/chatHistory', getChatHistory);
router.get('/', test)
router.get('/profile', getProfile)
router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', logoutUser);


module.exports = router