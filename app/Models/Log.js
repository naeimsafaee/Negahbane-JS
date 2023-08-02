const mongoose = require('mongoose');
const moment = require('jalali-moment');


const Schema = new mongoose.Schema({
    monitor_id: {
        type: Number
    },
    ping: {
        type: String
    },
    status_code: {
        type: String
    },
    is_alive: {
        type: Boolean,
        required: true
    },
    status: {
        type: Number
    },
    error: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }

}, {versionKey: false , toJSON:  { virtuals: true } , toObject: { virtuals: true }});

Schema.virtual('shamsi_date').get(function () {
    return moment(this.created_at).locale('fa').format('');
});

Schema.virtual('shamsi_time').get(function () {
    return moment(this.created_at).locale('fa').format('hh:mm:ss');
});

const Log = mongoose.model('logs', Schema);

module.exports = Log;