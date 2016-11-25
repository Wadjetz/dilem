var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var messageSchema = new Schema({
    from: String,
    to: String,
    date: Date,
    message: String
});

var Message = mongoose.model('Message', messageSchema);

module.exports = Message;
