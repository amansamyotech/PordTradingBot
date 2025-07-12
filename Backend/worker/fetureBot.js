const axios = require("axios");
const crypto = require("crypto");

const FUTURES_API_BASE = "https://fapi.binance.com";
const apiKey =
  "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
const apiSecret =
  "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";

const SYMBOL = "DOGEUSDT";
// const SYMBOL = "1000PEPEUSDT";
// const SYMBOL = "1000SHIBUSDT";
// const SYMBOL = "1000BONKUSDT";
// const SYMBOL = "1000FLOKIUSDT";
const PROFIT_PERCENTAGE = 0.01; // 0.01%

let position = null;
let buyPrice = 0;
let quantity = 0;
let targetPrice = 0;

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

const setLeverage = async () => {
  const params = {
    symbol: SYMBOL,
    leverage: 1,
    timestamp: Date.now(),
  };
  const sig = sign(params);
  await axios.post(`${FUTURES_API_BASE}/fapi/v1/leverage`, null, {
    params: { ...params, signature: sig },
    headers: { "X-MBX-APIKEY": apiKey },
  });
};

const setMarginType = async () => {
  const params = {
    symbol: SYMBOL,
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

const placeOrder = async (side, qty) => {
  try {
    // await setMarginType();
    // await setLeverage();

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
      position = "LONG";
      quantity = 5
      // BUY - if no position
      if (!position) {
        const balance = await getBalance();
        const buyAmount = balance;
        quantity = parseFloat((buyAmount / currentPrice).toFixed(precision));

        log(
          `💰 Balance: ${balance.toFixed(2)} | Buying with ${buyAmount.toFixed(
            2
          )}`
        );

        // Check minimum order value (usually $5-10)
        if (buyAmount < 5) {
          log(`⚠️ Buy amount too small: ${buyAmount.toFixed(2)} (minimum $5)`);
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
          // send telly message
          continue;
        }

        const order = await placeOrder("BUY", quantity);
        if (order && order.status === "FILLED") {
          position = "LONG";
          buyPrice = currentPrice;
          targetPrice = currentPrice * (1 + PROFIT_PERCENTAGE / 100);

          log(
            `✅ BOUGHT ${quantity} ${SYMBOL} @ ${currentPrice} | Target: ${targetPrice.toFixed(
              6
            )}`
          );
        } else if (order === null) {
          log(`❌ Buy order failed`);
        }
      }

      // SELL - if have position and target reached
    //   else if (position === "LONG" && currentPrice >= targetPrice) {
      else if (position === "LONG") {
        const order = await placeOrder("SELL", quantity);
        if (order && order.status === "FILLED") {
          const profit = (currentPrice - buyPrice) * quantity;

          log(
            `🎯 SOLD ${quantity} ${SYMBOL} @ ${currentPrice} | Profit: ${profit.toFixed(
              4
            )}`
          );

          // Reset for next cycle
          position = null;
          buyPrice = 0;
          quantity = 0;
          targetPrice = 0;
        } else if (order === null) {
          log(`❌ Sell order failed`);
        }
      }

      // Status update
      else if (position === "LONG") {
        const currentProfit = (currentPrice - buyPrice) * quantity;
        log(
          `📊 Holding ${quantity} ${SYMBOL} | Current: $${currentPrice} | Target: $${targetPrice.toFixed(
            6
          )} | Profit: $${currentProfit.toFixed(4)}`
        );
      }
    } catch (e) {
      log(`❌ Error: ${e.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
  }
};

startBot();
