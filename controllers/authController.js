const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');

const test = (req, res) => {
    res.json("Test is working");
}

const registerUser = async (req, res) => {
    try {
        //const email_pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        const {username, email, password} = req.body;

        if(!username || !email || !password) {
            return res.json({error: "Please add all fields"});
        }
        if(password.length < 8) {
            return res.json({error: "Password must be at least 8 characters"});
        }
        const exist = await User.findOne({email});
        if(exist) {
            return res.json({error: "Email already taken"});
        }
        const existName = await User.findOne({username});
        if(existName) {
            return res.json({error: "Username already taken"});
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        return res.json(user);
    } catch (err) {
        console.log(err);
    }
}

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        if(!email || !password) {
            return res.json({error: "Please add all fields"});
        }
        const user = await User.findOne({email});
        if(!user) {
            return res.json({error: "Invalid E-mail"});
        }
        const match = await comparePassword(password, user.password);
        if(!match) {
            return res.json({error: "Invalid password"});
        }
        if(match){
            jwt.sign({email: user.email, id: user._id, username: user.username}, process.env.JWT_SECRET, {}, (err, access_token) => {
                if(err) throw err;
                try {
                    res.cookie("access_token", access_token).json(user);
                } catch (error) {
                    console.log(error);
                }
            });
        }
    } catch (err) {
        console.log(err);
    }
}

const getProfile = (req, res) => {
    const {access_token} = req.cookies;
    if(access_token){
        jwt.verify(access_token, process.env.JWT_SECRET, {}, (err, user) => {
            if(err) throw err;
            res.json(user);
        });
    } else {
        res.json(null);
    }
}

const logoutUser = (req, res) => {
    res.clearCookie('access_token');  // Clear the JWT cookie
    res.json({ message: 'Logged out successfully' });
};

module.exports = {
    test,
    registerUser,
    loginUser,
    getProfile,
    logoutUser
};
