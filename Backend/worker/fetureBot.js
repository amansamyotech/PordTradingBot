const axios = require("axios");
const crypto = require("crypto");

const FUTURES_API_BASE = "https://fapi.binance.com";
const apiKey = "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
const apiSecret = "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";

const TRADING_PAIRS = [
  { symbol: "DOGEUSDT", name: "Dogecoin" },
];

const PROFIT_PERCENTAGE = 0.01; // 0.01% profit
const CHECK_INTERVAL = 2000; // Check every 2 seconds

let tradingState = {};
TRADING_PAIRS.forEach((pair) => {
  tradingState[pair.symbol] = {
    position: null,
    buyPrice: 0,
    quantity: 0,
    targetPrice: 0,
    isTrading: false,
  };
});

const log = (msg) => {
  console.log(`[${new Date().toISOString()}] ${msg}`);
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

const getPrice = async (symbol) => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`, {
    params: { symbol }
  });
  return parseFloat(res.data.price);
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
    log(`Order error on ${symbol} ${side}: ${e.message}`);
    return null;
  }
};

const trade = async (symbol) => {
  const state = tradingState[symbol];
  if (state.isTrading) return;

  state.isTrading = true;

  try {
    const currentPrice = await getPrice(symbol);
    const precision = await getPrecision(symbol);

    // If no position, buy
    if (!state.position) {
      const balance = await getBalance();
      if (balance > 10) { // Only trade if we have more than $10
        const qty = parseFloat((balance * 0.9 / currentPrice).toFixed(precision)); // Use 90% of balance
        
        const order = await placeOrder(symbol, "BUY", qty);
        if (order && order.status === "FILLED") {
          state.buyPrice = currentPrice;
          state.quantity = qty;
          state.position = "LONG";
          state.targetPrice = currentPrice * (1 + PROFIT_PERCENTAGE / 100);
          
          log(`✅ BOUGHT ${qty} ${symbol} @ $${currentPrice} | Target: $${state.targetPrice.toFixed(6)}`);
        }
      }
    }
    // If have position and price reached target, sell
    else if (state.position === "LONG" && currentPrice >= state.targetPrice) {
      const order = await placeOrder(symbol, "SELL", state.quantity);
      if (order && order.status === "FILLED") {
        const profit = (currentPrice - state.buyPrice) * state.quantity;
        
        log(`🎯 SOLD ${state.quantity} ${symbol} @ $${currentPrice} | Profit: $${profit.toFixed(4)}`);
        
        // Reset position
        state.position = null;
        state.quantity = 0;
        state.buyPrice = 0;
        state.targetPrice = 0;
      }
    }
  } catch (e) {
    log(`Trading error on ${symbol}: ${e.message}`);
  }

  state.isTrading = false;
};

const startBot = async () => {
  log("🚀 Starting 0.01% Profit Trading Bot...");
  
  while (true) {
    try {
      for (const { symbol } of TRADING_PAIRS) {
        await trade(symbol);
      }
    } catch (e) {
      log(`Loop error: ${e.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
  }
};

process.on("SIGINT", () => {
  log("Bot stopped manually");
  process.exit();
});

startBot();