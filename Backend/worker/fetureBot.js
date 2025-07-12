// ✅ FULLY UPDATED: Binance USDⓈ-M Futures Trading Bot (0.2% ROI Strategy)

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

// Trading pairs configuration
const TRADING_PAIRS = [
  { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
  { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
  { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
  { symbol: "BONKUSDT", asset: "BONK", name: "Bonk" },
  { symbol: "FLOKIUSDT", asset: "FLOKI", name: "Floki Inu" },
];

const ROI_PERCENTAGE = 0.2;
const CHECK_INTERVAL = 5000;

// Logger paths
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
const today = new Date().toISOString().split("T")[0];
const logFile = path.join(logsDir, `futures_log_${today}.txt`);
const tradesFile = path.join(logsDir, `futures_trades_${today}.json`);
const profitFile = path.join(logsDir, `futures_profit_${today}.json`);

// Initialize states
let tradingState = {};
let overallStats = {
  totalProfit: 0,
  totalLoss: 0,
  totalTrades: 0,
  profitableTrades: 0,
  losingTrades: 0,
  coinStats: {},
  initialBalance: 0,
  currentBalance: 0,
  allocatedPerCoin: 0,
};

TRADING_PAIRS.forEach((pair) => {
  tradingState[pair.symbol] = {
    position: null,
    buyPrice: null,
    quantity: 0,
    targetSellPrice: null,
    isTrading: false,
    lastTradeTime: 0,
    availableForTrading: 0,
    asset: pair.asset,
    name: pair.name,
  };

  overallStats.coinStats[pair.symbol] = {
    profit: 0,
    loss: 0,
    trades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    allocatedUSDT: 0,
  };
});

if (fs.existsSync(profitFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(profitFile, "utf8"));
    overallStats = { ...overallStats, ...saved };
  } catch (_) {}
}

const logToFile = (msg, type = "INFO") => {
  const log = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
  fs.appendFileSync(logFile, log);
  console.log(msg);
  if (["ERROR", "TRADE", "PROFIT", "SYSTEM", "BALANCE"].includes(type))
    sendTelegram(`[${type}] ${msg}`);
};

const generateSignature = (params, secret) => {
  const query = Object.keys(params)
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
};

const getPrice = async (symbol) => {
  try {
    const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`, {
      params: { symbol },
    });
    return parseFloat(res.data.price);
  } catch (e) {
    logToFile(`Error getting price for ${symbol}: ${e.message}`, "ERROR");
    return null;
  }
};

const getAllPrices = async () => {
  try {
    const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`);
    const prices = {};
    res.data.forEach((d) => {
      if (TRADING_PAIRS.find((p) => p.symbol === d.symbol)) {
        prices[d.symbol] = parseFloat(d.price);
      }
    });
    return prices;
  } catch (e) {
    logToFile(`Error fetching prices: ${e.message}`, "ERROR");
    return {};
  }
};

const getBalance = async () => {
  try {
    const params = { timestamp: Date.now() };
    const sig = generateSignature(params, apiSecret);
    params.signature = sig;

    const res = await axios.get(`${FUTURES_API_BASE}/fapi/v2/account`, {
      params,
      headers: { "X-MBX-APIKEY": apiKey },
    });

    const usdt = res.data.assets.find((a) => a.asset === "USDT");
    return usdt ? parseFloat(usdt.availableBalance) : 0;
  } catch (e) {
    logToFile(`Error fetching futures balance: ${e.message}`, "ERROR");
    return 0;
  }
};

const placeOrder = async (symbol, side, quantity) => {
  try {
    const params = {
      symbol,
      side,
      type: "MARKET",
      quantity,
      timestamp: Date.now(),
    };
    params.signature = generateSignature(params, apiSecret);

    const res = await axios.post(`${FUTURES_API_BASE}/fapi/v1/order`, null, {
      params,
      headers: { "X-MBX-APIKEY": apiKey },
    });

    return res.data;
  } catch (e) {
    logToFile(`Order error on ${symbol} ${side}: ${e.message}`, "ERROR");
    return null;
  }
};

const distributeBalanceEqually = async () => {
  const total = await getBalance();
  const alloc = total / TRADING_PAIRS.length;
  overallStats.allocatedPerCoin = alloc;
  TRADING_PAIRS.forEach((p) => {
    tradingState[p.symbol].availableForTrading = alloc;
    overallStats.coinStats[p.symbol].allocatedUSDT = alloc;
  });
  logToFile(
    `Distributed $${total.toFixed(2)} equally across coins.`,
    "BALANCE"
  );
};

const executeTradingLogic = async (symbol, price) => {
  const state = tradingState[symbol];
  if (state.isTrading || Date.now() - state.lastTradeTime < 10000) return;
  state.isTrading = true;
  const alloc = state.availableForTrading;

  try {
    if (!state.position && alloc > 0) {
      const qty = parseFloat((alloc / price).toFixed(3));
      const order = await placeOrder(symbol, "BUY", qty);
      if (order && order.status === "FILLED") {
        const avgPrice = parseFloat(order.avgFillPrice || price);
        state.buyPrice = avgPrice;
        state.position = "long";
        state.quantity = qty;
        state.targetSellPrice = avgPrice * (1 + ROI_PERCENTAGE / 100);
        state.availableForTrading = 0;
        state.lastTradeTime = Date.now();
        logToFile(`Bought ${qty} ${symbol} @ ${avgPrice}`, "TRADE");
      }
    } else if (state.position === "long" && price >= state.targetSellPrice) {
      const order = await placeOrder(symbol, "SELL", state.quantity);
      if (order && order.status === "FILLED") {
        const sellPrice = parseFloat(order.avgFillPrice || price);
        const profit = (sellPrice - state.buyPrice) * state.quantity;
        const coinStats = overallStats.coinStats[symbol];
        coinStats.trades++;
        overallStats.totalTrades++;
        if (profit > 0) {
          coinStats.profit += profit;
          overallStats.totalProfit += profit;
          coinStats.profitableTrades++;
          overallStats.profitableTrades++;
        } else {
          coinStats.loss += -profit;
          overallStats.totalLoss += -profit;
          coinStats.losingTrades++;
          overallStats.losingTrades++;
        }
        state.position = null;
        state.quantity = 0;
        state.buyPrice = null;
        state.targetSellPrice = null;
        state.availableForTrading = sellPrice * state.quantity;
        state.lastTradeTime = Date.now();
        logToFile(
          `Sold ${symbol} @ ${sellPrice} | Profit: $${profit.toFixed(2)}`,
          "PROFIT"
        );
      }
    }
  } catch (e) {
    logToFile(`Error in trading ${symbol}: ${e.message}`, "ERROR");
  }

  state.isTrading = false;
};

const startTrading = async () => {
  logToFile("Starting Futures Trading Bot (0.2% ROI strategy)...", "SYSTEM");
  await distributeBalanceEqually();
  while (true) {
    try {
      const prices = await getAllPrices();
      for (const pair of TRADING_PAIRS) {
        const price = prices[pair.symbol];
        if (price) await executeTradingLogic(pair.symbol, price);
      }
    } catch (e) {
      logToFile(`Loop error: ${e.message}`, "ERROR");
    }
    await new Promise((res) => setTimeout(res, CHECK_INTERVAL));
  }
};

process.on("SIGINT", async () => {
  logToFile("Bot stopped manually", "SYSTEM");
  fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
  process.exit(0);
});

startTrading();
