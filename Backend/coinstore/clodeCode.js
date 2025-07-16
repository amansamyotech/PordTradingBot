const axios = require("axios");
const crypto = require("crypto");

const SPOT_API_BASE = "https://api.coinstore.com";
const apiKey = "460e56f22bedb4cbb9908603dcd6f7b1";
const secretKey = "31e4c0d4d894de2250c4e0c152cb8158";

const SYMBOL = "DOGEUSDT";
const PROFIT_PERCENTAGE = 0.01; // 0.01%

let position = null;
let buyPrice = 0;
let quantity = 0;
let targetPrice = 0;

const log = (msg) => {
  console.log(`[${new Date().toISOString()}] ${msg}`);
};

// Retry logic with exponential backoff
const retry = async (fn, maxRetries = 3, baseDelay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      const delay = baseDelay * Math.pow(2, i); // Exponential backoff
      log(`Retrying after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const sign = (payload, expires) => {
  const expiresKey = Math.floor(expires / 30000).toString();
  const key = crypto
    .createHmac("sha256", secretKey)
    .update(expiresKey, "utf8")
    .digest("hex");
  return crypto.createHmac("sha256", key).update(payload, "utf8").digest("hex");
};

const getBalance = async () => {
  const url = `${SPOT_API_BASE}/api/spot/accountList`;
  const expires = Date.now();
  const payload = JSON.stringify({});
  const headers = {
    "X-CS-APIKEY": apiKey,
    "X-CS-SIGN": sign(payload, expires),
    "X-CS-EXPIRES": expires.toString(),
    "exch-language": "en_US",
    "Content-Type": "application/json",
    Accept: "*/*",
    Connection: "keep-alive",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  try {
    const res = await axios.post(url, payload, { headers });
    if (res.data.code !== 0) {
      log(`❌ Balance Error: ${res.data.message || "Unknown error"}`);
      return 0;
    }
    const usdtAccount = res.data.data.find(
      (a) => a.currency === "USDT" && a.type === 1
    );
    return parseFloat(usdtAccount?.balance || 0);
  } catch (e) {
    log(`❌ Balance Error: ${JSON.stringify(e.response?.data || e.message)}`);
    return 0;
  }
};

const getPrice = async () => {
  const url = `${SPOT_API_BASE}/api/v2/public/ticker?symbolCode=${SYMBOL}`;
  const headers = {
    Accept: "*/*",
    Connection: "keep-alive",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  try {
    const res = await axios.get(url, { headers });
    if (res.data.code !== 0) {
      log(`❌ Price Error: ${res.data.message || "Unknown error"}`);
      return 0;
    }
    const ticker = res.data.data.find((s) => s.symbolCode === SYMBOL);
    return parseFloat(ticker?.lastPrice || 0);
  } catch (e) {
    log(`❌ Price Error: ${JSON.stringify(e.response?.data || e.message)}`);
    return 0;
  }
};

const getPrecision = async () => {
  const url = `${SPOT_API_BASE}/v2/public/config/spot/symbols`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    Connection: "keep-alive",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };
  try {
    const res = await axios.post(url, { symbolCodes: [SYMBOL] }, { headers });
    if (res.data.code !== 0) {
      log(`❌ Precision Error: ${res.data.message || "Unknown error"}`);
      return 0;
    }
    const symbolInfo = res.data.data.find((s) => s.symbolCode === SYMBOL);
    return parseInt(symbolInfo?.quantityPrecision || 0);
  } catch (e) {
    log(`❌ Precision Error: ${JSON.stringify(e.response?.data || e.message)}`);
    return 0;
  }
};

const placeOrder = async (side, qty, price) => {
  const url = `${SPOT_API_BASE}/api/trade/order/place`;
  const expires = Date.now();
  const payload = JSON.stringify({
    symbol: SYMBOL,
    side,
    ordType: "MARKET",
    ordQty: qty.toString(),
    timestamp: expires,
  });
  const headers = {
    "X-CS-APIKEY": apiKey,
    "X-CS-SIGN": sign(payload, expires),
    "X-CS-EXPIRES": expires.toString(),
    "exch-language": "en_US",
    "Content-Type": "application/json",
    Accept: "*/*",
    Connection: "keep-alive",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  try {
    const res = await axios.post(url, payload, { headers });
    if (res.data.code === 0) {
      return {
        status: "FILLED",
        orderId: res.data.data.orderId,
      };
    }
    log(`❌ Order Error: ${res.data.message || "Unknown error"}`);
    return null;
  } catch (e) {
    log(`❌ Order Error: ${JSON.stringify(e.response?.data || e.message)}`);
    return null;
  }
};

const startBot = async () => {
  log("🚀 Starting Bot...");
  const precision = await retry(getPrecision);

  while (true) {
    try {
      const currentPrice = await retry(getPrice);
      console.log(`currentPrice >=`, currentPrice);
      console.log(`targetPrice`, targetPrice);
      console.log(`position  -- `, position);

      if (!position) {
        const balance = await retry(getBalance);
        const buyAmount = balance;
        quantity = parseFloat((buyAmount / currentPrice).toFixed(precision));

        log(
          `💰 Balance: ${balance.toFixed(2)} | Buying with ${buyAmount.toFixed(
            2
          )}`
        );

        if (buyAmount < 5) {
          log(`⚠️ Buy amount too small: ${buyAmount.toFixed(2)} (minimum $5)`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const order = await retry(() =>
          placeOrder("BUY", quantity, currentPrice)
        );
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
      } else if (position === "LONG" && currentPrice >= targetPrice) {
        const order = await retry(() =>
          placeOrder("SELL", quantity, currentPrice)
        );

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
          targetPrice = 0;
        } else if (order === null) {
          log(`❌ Sell order failed`);
        }
      } else if (position === "LONG") {
        const currentProfit = (currentPrice - buyPrice) * quantity;
        log(
          `📊 Holding ${quantity} ${SYMBOL} | Current: $${currentPrice} | Target: $${targetPrice.toFixed(
            6
          )} | Profit: $${currentProfit.toFixed(4)}`
        );
      }
    } catch (e) {
      log(`❌ Error: ${JSON.stringify(e.response?.data || e.message)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Increased delay
  }
};

startBot();
