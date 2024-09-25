const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const chatMessage = require('./models/chatMessage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');  // Added for file system operations
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;  // You can set it to any number that suits your use case

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://ragard.onrender.com',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error', err));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads')); // Serve uploaded images

app.use('/', require('./routes/authRoutes'));

// Image upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ imageUrl: `https://ragardweb-backend.onrender.com/uploads/${req.file.filename}` });
});

const activeUsers = new Set();

// Socket.IO handling
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    // Send chat history to the user when they connect
    const chatHistory = await chatMessage.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('chatHistory', chatHistory);

    // Listen for incoming chat messages and store them in MongoDB
    socket.on('chatMessage', async (message) => {
        // Ensure that we only save messages that have either text or an image
        if (!message.text && !message.image) {
            return; // Don't save if both are empty
        }
    
        const newMessage = new chatMessage({
            user: message.user,
            text: message.text || '', // Allow empty text
            image: message.image || null // Allow null for image
        });
        
        await newMessage.save();

        // Remove the oldest message if there are more than 50
        const messageCount = await chatMessage.countDocuments();
        if (messageCount > 50) {
            const oldestMessage = await chatMessage.findOneAndDelete().sort({ timestamp: 1 });
            
            // If the oldest message has an associated image, delete it from the server
            if (oldestMessage.image) {
                const imagePath = path.join(__dirname, 'uploads', path.basename(oldestMessage.image));
                
                // Delete the image file from the uploads folder
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error('Error deleting image:', err);
                    } else {
                        console.log('Image deleted:', imagePath);
                    }
                });
            }
        }
    
        // Emit the new message to all clients
        io.emit('chatMessage', message);
    });

    // Keep track of active users
    socket.on('registerUser', (username) => {
        socket.username = username;
        activeUsers.add(username);
        io.emit('activeUsers', Array.from(activeUsers)); // Notify all clients about the active users
    });

    // Remove the user when they manually disconnect (via the 'removeUser' event)
    socket.on('removeUser', (username) => {
        activeUsers.delete(username);
        io.emit('activeUsers', Array.from(activeUsers)); // Update the active users list
    });

    // Also handle disconnection (e.g., if the browser closes without 'removeUser')
    socket.on('disconnect', () => {
        if (socket.username) {
            activeUsers.delete(socket.username); // Remove the user from active users on disconnect
            io.emit('activeUsers', Array.from(activeUsers)); // Update the active users list
        }
    });
});

const PORT = 8000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
