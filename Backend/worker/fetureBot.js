// // ✅ FULLY UPDATED: Binance USDⓈ-M Futures Trading Bot (0.2% ROI Strategy)

// const axios = require("axios");
// const crypto = require("crypto");
// const fs = require("fs");
// const path = require("path");
// const { sendTelegram } = require("../services/telegramService");

// const FUTURES_API_BASE = "https://fapi.binance.com";
// const apiKey =
//   "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
// const apiSecret =
//   "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";

// // Trading pairs configuration
// const TRADING_PAIRS = [
//   { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
//   { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
//   { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
//   { symbol: "BONKUSDT", asset: "BONK", name: "Bonk" },
//   { symbol: "FLOKIUSDT", asset: "FLOKI", name: "Floki Inu" },
// ];

// const ROI_PERCENTAGE = 0.2;
// const CHECK_INTERVAL = 5000;

// // Logger paths
// const logsDir = path.join(__dirname, "logs");
// if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
// const today = new Date().toISOString().split("T")[0];
// const logFile = path.join(logsDir, `futures_log_${today}.txt`);
// const tradesFile = path.join(logsDir, `futures_trades_${today}.json`);
// const profitFile = path.join(logsDir, `futures_profit_${today}.json`);

// // Initialize states
// let tradingState = {};
// let overallStats = {
//   totalProfit: 0,
//   totalLoss: 0,
//   totalTrades: 0,
//   profitableTrades: 0,
//   losingTrades: 0,
//   coinStats: {},
//   initialBalance: 0,
//   currentBalance: 0,
//   allocatedPerCoin: 0,
// };

// TRADING_PAIRS.forEach((pair) => {
//   tradingState[pair.symbol] = {
//     position: null,
//     buyPrice: null,
//     quantity: 0,
//     targetSellPrice: null,
//     isTrading: false,
//     lastTradeTime: 0,
//     availableForTrading: 0,
//     asset: pair.asset,
//     name: pair.name,
//   };

//   overallStats.coinStats[pair.symbol] = {
//     profit: 0,
//     loss: 0,
//     trades: 0,
//     profitableTrades: 0,
//     losingTrades: 0,
//     allocatedUSDT: 0,
//   };
// });

// if (fs.existsSync(profitFile)) {
//   try {
//     const saved = JSON.parse(fs.readFileSync(profitFile, "utf8"));
//     overallStats = { ...overallStats, ...saved };
//   } catch (_) {}
// }

// const logToFile = (msg, type = "INFO") => {
//   const log = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
//   fs.appendFileSync(logFile, log);
//   console.log(msg);
//   if (["ERROR", "TRADE", "PROFIT", "SYSTEM", "BALANCE"].includes(type))
//     sendTelegram(`[${type}] ${msg}`);
// };

// const generateSignature = (params, secret) => {
//   const query = Object.keys(params)
//     .map((k) => `${k}=${params[k]}`)
//     .join("&");
//   return crypto.createHmac("sha256", secret).update(query).digest("hex");
// };

// const getPrice = async (symbol) => {
//   try {
//     const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`, {
//       params: { symbol },
//     });
//     return parseFloat(res.data.price);
//   } catch (e) {
//     logToFile(`Error getting price for ${symbol}: ${e.message}`, "ERROR");
//     return null;
//   }
// };

// const getAllPrices = async () => {
//   try {
//     const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`);
//     const prices = {};
//     res.data.forEach((d) => {
//       if (TRADING_PAIRS.find((p) => p.symbol === d.symbol)) {
//         prices[d.symbol] = parseFloat(d.price);
//       }
//     });
//     return prices;
//   } catch (e) {
//     logToFile(`Error fetching prices: ${e.message}`, "ERROR");
//     return {};
//   }
// };

// const getBalance = async () => {
//   try {
//     const params = { timestamp: Date.now() };
//     const sig = generateSignature(params, apiSecret);
//     params.signature = sig;

//     const res = await axios.get(`${FUTURES_API_BASE}/fapi/v2/account`, {
//       params,
//       headers: { "X-MBX-APIKEY": apiKey },
//     });

//     const usdt = res.data.assets.find((a) => a.asset === "USDT");
//     return usdt ? parseFloat(usdt.availableBalance) : 0;
//   } catch (e) {
//     logToFile(`Error fetching futures balance: ${e.message}`, "ERROR");
//     return 0;
//   }
// };

// const setLeverage = async (symbol, leverage = 1) => {
//   const params = {
//     symbol,
//     leverage,
//     timestamp: Date.now(),
//   };
//   params.signature = generateSignature(params, apiSecret);
//   try {
//     await axios.post(`${FUTURES_API_BASE}/fapi/v1/leverage`, null, {
//       params,
//       headers: { "X-MBX-APIKEY": apiKey },
//     });
//   } catch (e) {
//     logToFile(`Error setting leverage for ${symbol}: ${e.message}`, "ERROR");
//   }
// };

// const setMarginType = async (symbol, type = "ISOLATED") => {
//   const params = {
//     symbol,
//     marginType: type,
//     timestamp: Date.now(),
//   };
//   params.signature = generateSignature(params, apiSecret);
//   try {
//     await axios.post(`${FUTURES_API_BASE}/fapi/v1/marginType`, null, {
//       params,
//       headers: { "X-MBX-APIKEY": apiKey },
//     });
//   } catch (e) {
//     // Ignore error if margin type already set
//     if (!e.response?.data?.msg?.includes("No need to change margin type")) {
//       logToFile(
//         `Error setting margin type for ${symbol}: ${e.message}`,
//         "ERROR"
//       );
//     }
//   }
// };

// const placeOrder = async (symbol, side, quantity) => {
//   try {
//     const params = {
//       symbol,
//       side,
//       type: "MARKET",
//       quantity,
//       timestamp: Date.now(),
//     };
//     await setLeverage(symbol, 1);
//     await setMarginType(symbol, "ISOLATED");

//     params.signature = generateSignature(params, apiSecret);

//     const res = await axios.post(`${FUTURES_API_BASE}/fapi/v1/order`, null, {
//       params,
//       headers: { "X-MBX-APIKEY": apiKey },
//     });

//     return res.data;
//   } catch (e) {
//     logToFile(`Order error on ${symbol} ${side}: ${e.message}`, "ERROR");
//     return null;
//   }
// };

// const distributeBalanceEqually = async () => {
//   const total = await getBalance();
//   const alloc = total / TRADING_PAIRS.length;
//   overallStats.allocatedPerCoin = alloc;
//   TRADING_PAIRS.forEach((p) => {
//     tradingState[p.symbol].availableForTrading = alloc;
//     overallStats.coinStats[p.symbol].allocatedUSDT = alloc;
//   });
//   logToFile(
//     `Distributed $${total.toFixed(2)} equally across coins.`,
//     "BALANCE"
//   );
//   sendTelegram(`Distributed $${total.toFixed(2)} equally across coins.`);
// };

// const executeTradingLogic = async (symbol, price) => {
//   const state = tradingState[symbol];
//   if (state.isTrading || Date.now() - state.lastTradeTime < 10000) return;
//   state.isTrading = true;
//   const alloc = state.availableForTrading;

//   try {
//     if (!state.position && alloc > 0) {
//       const qty = parseFloat((alloc / price).toFixed(3));
//       const order = await placeOrder(symbol, "BUY", qty);
//       if (order && order.status === "FILLED") {
//         const avgPrice = parseFloat(order.avgFillPrice || price);
//         state.buyPrice = avgPrice;
//         state.position = "long";
//         state.quantity = qty;
//         state.targetSellPrice = avgPrice * (1 + ROI_PERCENTAGE / 100);
//         state.availableForTrading = 0;
//         state.lastTradeTime = Date.now();
//         logToFile(`Bought ${qty} ${symbol} @ ${avgPrice}`, "TRADE");
//         sendTelegram(`✅Bought ${qty} ${symbol} @ ${avgPrice}`);
//       }
//     } else if (state.position === "long" && price >= state.targetSellPrice) {
//       const order = await placeOrder(symbol, "SELL", state.quantity);
//       if (order && order.status === "FILLED") {
//         const sellPrice = parseFloat(order.avgFillPrice || price);
//         const profit = (sellPrice - state.buyPrice) * state.quantity;
//         const coinStats = overallStats.coinStats[symbol];
//         coinStats.trades++;
//         overallStats.totalTrades++;
//         if (profit > 0) {
//           coinStats.profit += profit;
//           overallStats.totalProfit += profit;
//           coinStats.profitableTrades++;
//           overallStats.profitableTrades++;
//         } else {
//           coinStats.loss += -profit;
//           overallStats.totalLoss += -profit;
//           coinStats.losingTrades++;
//           overallStats.losingTrades++;
//         }
//         state.position = null;
//         state.quantity = 0;
//         state.buyPrice = null;
//         state.targetSellPrice = null;
//         state.availableForTrading = sellPrice * state.quantity;
//         state.lastTradeTime = Date.now();
//         logToFile(
//           `Sold ${symbol} @ ${sellPrice} | Profit: $${profit.toFixed(2)}`,
//           "PROFIT"
//         );
//         sendTelegram(
//           `🎯 Sold ${symbol} @ ${sellPrice} | Profit: $${profit.toFixed(2)}`,
//           "PROFIT"
//         );
//       }
//     }
//   } catch (e) {
//     logToFile(`Error in trading ${symbol}: ${e.message}`, "ERROR");
//   }

//   state.isTrading = false;
// };

// const startTrading = async () => {
//   logToFile("Starting Futures Trading Bot (0.2% ROI strategy)...", "SYSTEM");
//   await distributeBalanceEqually();
//   while (true) {
//     try {
//       const prices = await getAllPrices();
//       for (const pair of TRADING_PAIRS) {
//         const price = prices[pair.symbol];
//         if (price) await executeTradingLogic(pair.symbol, price);
//       }
//     } catch (e) {
//       logToFile(`Loop error: ${e.message}`, "ERROR");
//     }
//     await new Promise((res) => setTimeout(res, CHECK_INTERVAL));
//   }
// };

// process.on("SIGINT", async () => {
//   logToFile("Bot stopped manually", "SYSTEM");
//   sendTelegram("Bot stopped");
//   fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
//   process.exit(0);
// });

// startTrading();

const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("../services/telegramService");

const FUTURES_API_BASE = "https://fapi.binance.com";
const apiKey =
  "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
const apiSecret =
  "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";

const TRADING_PAIRS = [
  { symbol: "SHIBUSDT", name: "Shiba Inu" },
  { symbol: "DOGEUSDT", name: "Dogecoin" },
  { symbol: "PEPEUSDT", name: "Pepe" },
  { symbol: "FLOKIUSDT", name: "Floki" },
  { symbol: "BONKUSDT", name: "Bonk" },
];

const ROI_PERCENTAGE = 0.2;
const CHECK_INTERVAL = 5000;

// === File & State Setup ===
const today = new Date().toISOString().split("T")[0];
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
const logFile = path.join(logsDir, `log_${today}.txt`);
const statsFile = path.join(logsDir, `stats_${today}.json`);

let overallStats = {
  totalProfit: 0,
  totalLoss: 0,
  totalTrades: 0,
  profitableTrades: 0,
  losingTrades: 0,
  perCoin: {},
};

let tradingState = {};
TRADING_PAIRS.forEach((pair) => {
  tradingState[pair.symbol] = {
    position: null,
    buyPrice: 0,
    quantity: 0,
    target: 0,
    isTrading: false,
    lastTradeTime: 0,
    allocUSDT: 0,
  };
  overallStats.perCoin[pair.symbol] = {
    profit: 0,
    loss: 0,
    trades: 0,
    wins: 0,
    losses: 0,
  };
});

if (fs.existsSync(statsFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(statsFile, "utf8"));
    overallStats = { ...overallStats, ...saved };
  } catch {}
}

const logToFile = (msg, type = "INFO") => {
  const log = `[${new Date().toISOString()}] [${type}] ${msg}`;
  fs.appendFileSync(logFile, log + "\n");
  console.log(log);
  if (["ERROR", "TRADE", "PROFIT", "SYSTEM", "BALANCE"].includes(type)) {
    sendTelegram(`[${type}] ${msg}`);
  }
};

const sign = (params) => {
  const query = new URLSearchParams(params).toString();
  return crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
};

const getBalance = async () => {
  const params = { timestamp: Date.now() };
  const sig = sign(params);
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v2/account`, {
    params: { ...params, signature: sig },
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return parseFloat(
    res.data.assets.find((a) => a.asset === "USDT").availableBalance
  );
};

const getAllPrices = async () => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`);
  const priceMap = {};
  res.data.forEach(({ symbol, price }) => {
    if (TRADING_PAIRS.find((p) => p.symbol === symbol)) {
      priceMap[symbol] = parseFloat(price);
    }
  });
  return priceMap;
};

const getPrecision = async (symbol) => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/exchangeInfo`);
  const symbolInfo = res.data.symbols.find((s) => s.symbol === symbol);
  const stepSize = symbolInfo.filters.find(
    (f) => f.filterType === "LOT_SIZE"
  ).stepSize;
  return Math.max(0, stepSize.indexOf("1") - 1);
};

const setLeverage = async (symbol, leverage) => {
  const params = {
    symbol,
    leverage,
    timestamp: Date.now(),
  };
  const sig = sign(params);
  await axios.post(`${FUTURES_API_BASE}/fapi/v1/leverage`, null, {
    params: { ...params, signature: sig },
    headers: { "X-MBX-APIKEY": apiKey },
  });
};

const setMarginType = async (symbol) => {
  const params = {
    symbol,
    marginType: "ISOLATED",
    timestamp: Date.now(),
  };
  const sig = sign(params);
  try {
    await axios.post(`${FUTURES_API_BASE}/fapi/v1/marginType`, null, {
      params: { ...params, signature: sig },
      headers: { "X-MBX-APIKEY": apiKey },
    });
  } catch (_) {}
};

const placeOrder = async (symbol, side, qty) => {
  try {
    await setMarginType(symbol);
    await setLeverage(symbol, 1);

    const params = {
      symbol,
      side,
      type: "MARKET",
      quantity: qty,
      timestamp: Date.now(),
    };
    const sig = sign(params);
    const res = await axios.post(`${FUTURES_API_BASE}/fapi/v1/order`, null, {
      params: { ...params, signature: sig },
      headers: { "X-MBX-APIKEY": apiKey },
    });
    return res.data;
  } catch (e) {
    logToFile(`Order error on ${symbol} ${side}: ${e.message}`, "ERROR");
    return null;
  }
};

const distributeBalance = async () => {
  const balance = await getBalance();
  const perCoin = balance / TRADING_PAIRS.length;
  for (const pair of TRADING_PAIRS) {
    tradingState[pair.symbol].allocUSDT = perCoin;
  }
  logToFile(
    `Distributed $${balance.toFixed(2)} across coins. ${perCoin}`,
    "BALANCE"
  );
  sendTelegram(`Distributed $${balance.toFixed(2)} across coins. ${perCoin}`);
};

const execute = async (symbol, price) => {
  const state = tradingState[symbol];
  if (state.isTrading || Date.now() - state.lastTradeTime < 10000) return;

  state.isTrading = true;

  try {
    const precision = await getPrecision(symbol);

    if (!state.position && state.allocUSDT > 0) {
      const qty = parseFloat((state.allocUSDT / price).toFixed(precision));
      const order = await placeOrder(symbol, "BUY", qty);
      if (order && order.status === "FILLED") {
        state.buyPrice = price;
        state.quantity = qty;
        state.position = "LONG";
        state.target = price * (1 + ROI_PERCENTAGE / 100);
        state.lastTradeTime = Date.now();
        logToFile(`Bought ${qty} ${symbol} @ ${price}`, "TRADE");
        sendTelegram(`✅Bought ${qty} ${symbol} @ ${avgPrice}`);
      }
    } else if (state.position === "LONG" && price >= state.target) {
      const order = await placeOrder(symbol, "SELL", state.quantity);
      if (order && order.status === "FILLED") {
        const profit = (price - state.buyPrice) * state.quantity;
        const stats = overallStats.perCoin[symbol];
        stats.trades++;
        overallStats.totalTrades++;

        if (profit > 0) {
          stats.profit += profit;
          stats.wins++;
          overallStats.totalProfit += profit;
          overallStats.profitableTrades++;
        } else {
          stats.loss += -profit;
          stats.losses++;
          overallStats.totalLoss += -profit;
          overallStats.losingTrades++;
        }

        logToFile(`Sold ${symbol} for profit: $${profit.toFixed(2)}`, "PROFIT");
        sendTelegram(
          `🎯 Sold ${symbol} @ ${sellPrice} | Profit: $${profit.toFixed(2)}`,
          "PROFIT"
        );

        // Reset
        state.position = null;
        state.quantity = 0;
        state.buyPrice = 0;
        state.target = 0;
        state.allocUSDT = price * state.quantity;
        state.lastTradeTime = Date.now();
      }
    }
  } catch (e) {
    logToFile(`Trading logic error on ${symbol}: ${e.message}`, "ERROR");
  }

  state.isTrading = false;
};

const startBot = async () => {
  logToFile("Starting Futures Bot...", "SYSTEM");
  await distributeBalance();

  while (true) {
    try {
      const prices = await getAllPrices();
      for (const { symbol } of TRADING_PAIRS) {
        if (prices[symbol]) await execute(symbol, prices[symbol]);
      }
    } catch (e) {
      logToFile(`Loop error: ${e.message}`, "ERROR");
    }
    await new Promise((res) => setTimeout(res, CHECK_INTERVAL));
  }
};

process.on("SIGINT", () => {
  fs.writeFileSync(statsFile, JSON.stringify(overallStats, null, 2));
  logToFile("Bot stopped manually", "SYSTEM");
  sendTelegram("Bot stopped manually.");
  process.exit();
});

startBot();
