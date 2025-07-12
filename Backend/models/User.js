const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  binanceApiKey: String,
  binanceApiSecret: String,
  botEnabled: { type: Boolean, default: false },
  telegramEnabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
