const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    username: { type: String },
    email: { type: String, unique: true }, // Set the 'unique' property to true
});


const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    badge: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/2955/2955010.png' },
    pic: { type: String, default: '   https://cdn-icons-png.flaticon.com/512/3177/3177440.png ' },
    backgroundPic: { type: String, default: 'https://as2.ftcdn.net/v2/jpg/01/68/74/87/1000_F_168748763_Mdv7zO7dxuECMzItERhPzWhVJSaORTKd.jpg' },
    bio: { type: String, default: 'Hey There! I am chatZyr user!' },
    likes: { type: Number, default: 0 },
    premium: {type: Boolean, default:false},
    friends: [friendSchema], // Array of friendSchema objects
});

const User = mongoose.model("User", userSchema);
module.exports = User;