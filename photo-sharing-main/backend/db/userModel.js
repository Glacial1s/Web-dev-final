const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  first_name: { type: String },
  last_name: { type: String },
  location: { type: String },
  description: { type: String },
  occupation: { type: String },
  login_name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [mongoose.Schema.Types.ObjectId],
  friend_requests_received: [mongoose.Schema.Types.ObjectId],
  friend_requests_sent: [mongoose.Schema.Types.ObjectId],
});

module.exports = mongoose.model.Users || mongoose.model("Users", userSchema);
