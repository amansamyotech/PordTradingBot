const axios = require("axios");
const crypto = require("crypto");

const FUTURES_API_BASE = "https://fapi.binance.com";
const apiKey =
  "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
const apiSecret =
  "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";
const SYMBOL = "DOGEUSDT";
const PROFIT_PERCENTAGE = 0.01; // 0.01%

let position = null;
let buyPrice = 0;
let quantity = 0;

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

const getPrice = async () => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/ticker/price`, {
    params: { symbol: SYMBOL },
  });
  return parseFloat(res.data.price);
};

const getPrecision = async () => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/exchangeInfo`);
  const symbolInfo = res.data.symbols.find((s) => s.symbol === SYMBOL);
  const stepSize = symbolInfo.filters.find(
    (f) => f.filterType === "LOT_SIZE"
  ).stepSize;
  return Math.max(0, stepSize.indexOf("1") - 1);
};

const placeOrder = async (side, qty) => {
  try {
    const params = {
      symbol: SYMBOL,
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
    log(`❌ Order Error: ${e.response?.data?.msg || e.message}`);
    return null;
  }
};

const startBot = async () => {
  log("🚀 Starting Bot...");
  const precision = await getPrecision();

  while (true) {
    try {
      const currentPrice = await getPrice();

      // Buy if no position
      if (!position) {
        const balance = await getBalance();
        const buyAmount = balance;
        quantity = parseFloat((buyAmount / currentPrice).toFixed(precision));

        if (buyAmount < 5) {
          log(`⚠️ Buy amount too small: ${buyAmount.toFixed(2)} (minimum $5)`);
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
          continue;
        }

        const order = await placeOrder("BUY", quantity);
        if (order && order.status === "FILLED") {
          position = "LONG";
          buyPrice = currentPrice;
          log(`✅ BOUGHT ${quantity} ${SYMBOL} @ ${currentPrice}`);
        } else {
          log(`❌ Buy order failed`);
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
          continue;
        }
      }

      // Check if current price is higher than buy price and sell
      else if (position === "LONG" && currentPrice > buyPrice) {
        const order = await placeOrder("SELL", quantity);
        if (order && order.status === "FILLED") {
          const profit = (currentPrice - buyPrice) * quantity;
          log(
            `🎯 SOLD ${quantity} ${SYMBOL} @ ${currentPrice} | Profit: ${profit.toFixed(
              4
            )}`
          );
          position = null;
          buyPrice = 0;
          quantity = 0;
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        } else {
          log(`❌ Sell order failed`);
        }
      }

      // Status update if holding
      else if (position === "LONG") {
        const currentProfit = (currentPrice - buyPrice) * quantity;
        log(
          `📊 Holding ${quantity} ${SYMBOL} | Current: $${currentPrice} | Buy Price: $${buyPrice} | Profit: $${currentProfit.toFixed(
            4
          )}`
        );
      }
    } catch (e) {
      log(`❌ Error: ${e.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every 1 second
  }
};

startBot();
