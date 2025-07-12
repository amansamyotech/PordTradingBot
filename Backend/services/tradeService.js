const Trade = require('../models/Trade');

async function saveTradeLog(userId, symbol, price, type) {
  await Trade.create({ userId, symbol, price, type, timestamp: new Date() });
}

module.exports = { saveTradeLog };
