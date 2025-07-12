const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  symbol: String,
  price: Number,
  type: String,
  timestamp: Date
});

module.exports = mongoose.model('Trade', tradeSchema);
