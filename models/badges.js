const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
    badgeid: { type: String, required: true,unique: true },
    
    free: [String],
    vip: [String],
    
});

const badgeModel = mongoose.model('badges', badgeSchema);

module.exports = badgeModel;
