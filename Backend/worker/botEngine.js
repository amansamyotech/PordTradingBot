// const Binance = require("node-binance-api");
// const User = require("../models/User");
// const { saveTradeLog } = require("../services/tradeService");
// const { sendTelegram } = require("../services/telegramService");
// require("dotenv").config();

// // === Utility: RSI Calculation ===
// function calculateRSI(closes, period = 14) {
//   let gains = 0, losses = 0;
//   for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
//     const diff = closes[i + 1] - closes[i];
//     if (diff > 0) gains += diff;
//     else losses -= diff;
//   }
//   const avgGain = gains / period;
//   const avgLoss = losses / period;
//   const rs = avgGain / (avgLoss || 1);
//   return 100 - 100 / (1 + rs);
// }

// // === Utility: EMA Calculation ===
// function calculateEMA(closes, period) {
//   const k = 2 / (period + 1);
//   return closes.reduce((ema, price, i) => {
//     if (i === 0) return price;
//     return price * k + ema * (1 - k);
//   });
// }

// // === Binance Candlestick Fetcher ===
// function getCandles(binance, symbol, interval = "1m", limit = 100) {
//   return new Promise((resolve, reject) => {
//     binance.candlesticks(symbol, interval, (error, candles) => {
//       if (error) return reject(error);
//       resolve(candles);
//     }, { limit });
//   });
// }

// // === Core Bot Logic per User ===
// async function runBotForUser(user) {
//   const binance = new Binance().options({
//     APIKEY: user.binanceApiKey,
//     APISECRET: user.binanceApiSecret,
//     useServerTime: true,
//     test: true,
//     urls: {
//       base: "https://testnet.binance.vision/api/",
//       wsBase: "wss://testnet.binance.vision/ws/",
//     },
//   });

//   try {
//     console.log(`\n📡 Running bot for ${user.email}`);
//     const symbol = "PEPEUSDT";

//     const candles = await getCandles(binance, symbol, "1m", 100);
//     const closes = candles.map((c) => parseFloat(c[4]));

//     const ema20 = calculateEMA(closes.slice(-20), 20);
//     const ema50 = calculateEMA(closes.slice(-50), 50);
//     const rsi = calculateRSI(closes);

//     console.log(`🟢 EMA20: ${ema20.toFixed(2)}, EMA50: ${ema50.toFixed(2)}, RSI: ${rsi.toFixed(2)}`);

//     // === Entry Logic ===
//     if (ema20 > ema50 && rsi < 30) {
//       console.log(`✅ Trade condition met for ${symbol}, executing BUY`);

//       const order = await binance.marketBuy(symbol, 0.001);
//       const buyPrice = parseFloat(order.fills[0].price);

//       await saveTradeLog(user._id, symbol, buyPrice, "BUY");
//       const message = `📈 BUY executed for ${symbol} at ${buyPrice}`;
//       console.log(message);
//       if (user.telegramEnabled) await sendTelegram(user.telegramChatId, message);
//     } else {
//       console.log(`❌ No trade condition met for ${user.email}`);
//     }
//   } catch (err) {
//     console.error("❌ runBotForUser error:", err.message);
//   }
// }

// // === Scheduler ===
// async function startBotScheduler() {
//   const users = await User.find({ botEnabled: true });
//   console.log(`⏱️ Starting scheduler for ${users.length} users...`);

//   setInterval(() => {
//     users.forEach((user) => runBotForUser(user));
//   }, 60_000); // every 1 min
// }

// // === Test Buy + Sell Sequence ===
// async function testBuyThenSell(user) {
//   const binance = new Binance().options({
//     APIKEY: process.env.TEST_APIKEY,
//     APISECRET: process.env.TEST_APISECRET,
//     useServerTime: true,
//     test: true,
//     urls: {
//       base: "https://testnet.binance.vision/api/",
//       wsBase: "wss://testnet.binance.vision/ws/",
//     },
//   });

//   try {
//     console.log(`🚀 Starting test buy for user ${user.email}`);
//     const buyOrder = await binance.marketBuy("BTCUSDT", 0.001);
//     const buyPrice = buyOrder.fills[0].price;

//     const buyMessage = `✅ Bought BTC at ${buyPrice}`;
//     console.log(buyMessage);
//     await sendTelegram(user.telegramChatId, buyMessage);
//     await saveTradeLog(user._id, "BTCUSDT", buyPrice, "BUY");

//     await new Promise((res) => setTimeout(res, 10000)); // wait 10s

//     const sellOrder = await binance.marketSell("BTCUSDT", 0.001);
//     const sellPrice = sellOrder.fills[0].price;

//     const sellMessage = `✅ Sold BTC at ${sellPrice}`;
//     console.log(sellMessage);
//     await sendTelegram(user.telegramChatId, sellMessage);
//     await saveTradeLog(user._id, "BTCUSDT", sellPrice, "SELL");

//     console.log(`🎉 Test buy/sell completed for ${user.email}`);
//     return { buyPrice, sellPrice };
//   } catch (err) {
//     console.error("❌ Test buy/sell error:", err.message);
//     throw err;
//   }
// }

// module.exports = { startBotScheduler, testBuyThenSell, runBotForUser };

