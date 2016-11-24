var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  id: String,
  name: String,
  picture: String,
  birthday: Date,
  gender: String,
  hometown: String,
  meeting_for: String,
  age_range: Schema.Types.Mixed,
});

var User = mongoose.model('User', userSchema);

module.exports = User;
