const mongoose = require('mongoose');
const moment = require('jalali-moment');


const Schema = new mongoose.Schema({
    client_id: {
        type: String,
    },
    send_what: {
        type: String ,
        enum: ['Telegram', 'Email' , 'Sms'],
        default: 'Telegram'
    },
    send_to: {
        type: String,
        required: true
    },
    code: {
        type: String,
    },
    created_at: {
        type: Date,
        default: Date.now
    }

}, {versionKey: false });


const ConnectedAccount = mongoose.model('connected_account', Schema);

module.exports = ConnectedAccount;