const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: String,
    x: { type: Number, default: 215 },
    y: { type: Number, default: 125 },
  });



const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    users: { type: [String], default: [''] },
    coordinates: {type: [userSchema], default: ['']},
    mods: { type: [String], default: [''] },
    name: { type: String, required: true },
    muted: { type: [String], default: [''] },
    blocked: { type: [String], default: [''] },
    badgeurl: { type: String, default: '' },
    videourl: { type: String, default: '' },
    bio: { type: String, default: '' }
});


const RoomModel = mongoose.model('Room', roomSchema);

module.exports = RoomModel;
