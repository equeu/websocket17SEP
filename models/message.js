const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    
    user_id: String,
    content: String,
    time: String
});

const roomSchema = new mongoose.Schema({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    messages: [messageSchema]
});

const Message = mongoose.model('RoomMessage', roomSchema);

module.exports = Message;
