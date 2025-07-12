const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
// Commented out Telegram for now
// const { sendTelegram } = require("../services/telegramService");

const FUTURES_BASE_URL = "https://testnet.binancefuture.com";
const apiKey =
  "P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8";
const apiSecret =
  "vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm";

// Example: Use DOGEUSDT, PEPEUSDT etc.
const TRADING_PAIRS = [
  { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
  { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
];

const ROI_PERCENTAGE = 0.2;
const CHECK_INTERVAL = 5000;

function generateSignature(params, secret) {
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function getFuturesPrice(symbol) {
  const res = await axios.get(
    `${FUTURES_BASE_URL}/fapi/v1/ticker/price?symbol=${symbol}`
  );
  return parseFloat(res.data.price);
}

async function getFuturesBalance(asset) {
  const params = { timestamp: Date.now() };
  const signature = generateSignature(params, apiSecret);
  const res = await axios.get(`${FUTURES_BASE_URL}/fapi/v2/account`, {
    params: { ...params, signature },
    headers: { "X-MBX-APIKEY": apiKey },
  });
  const assetData = res.data.assets.find((a) => a.asset === asset);
  return assetData ? parseFloat(assetData.availableBalance) : 0;
}

async function getFuturesFilters(symbol) {
  const res = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/exchangeInfo`);
  const info = res.data.symbols.find((s) => s.symbol === symbol);
  const lotSize = info.filters.find((f) => f.filterType === "LOT_SIZE");
  return {
    minQty: parseFloat(lotSize.minQty),
    stepSize: parseFloat(lotSize.stepSize),
    precision: info.quantityPrecision,
  };
}

function formatQty(qty, stepSize, precision) {
  const factor = 1 / stepSize;
  const floored = Math.floor(qty * factor) / factor;
  return parseFloat(floored.toFixed(precision));
}

async function placeFuturesOrder(symbol, side, quantity) {
  const params = {
    symbol,
    side,
    type: "MARKET",
    quantity,
    timestamp: Date.now(),
  };
  const signature = generateSignature(params, apiSecret);
  try {
    const res = await axios.post(`${FUTURES_BASE_URL}/fapi/v1/order`, null, {
      params: { ...params, signature },
      headers: { "X-MBX-APIKEY": apiKey },
    });
    console.log(`[ORDER] ✅ ${side} ${symbol} | Qty: ${quantity}`);
    // sendTelegram(`[ORDER] ✅ ${side} ${symbol} | Qty: ${quantity}`);
    return res.data;
  } catch (error) {
    const msg = error.response?.data?.msg || error.message;
    console.error(`[ERROR] ❌ ${side} ${symbol} failed: ${msg}`);
    // sendTelegram(`[ERROR] ❌ ${side} ${symbol} failed: ${msg}`);
    return null;
  }
}

async function tradePair(pair) {
  const price = await getFuturesPrice(pair.symbol);
  const balance = await getFuturesBalance("USDT");
  const invest = balance / TRADING_PAIRS.length;

  const { stepSize, minQty, precision } = await getFuturesFilters(pair.symbol);

  let quantity = invest / price;
  quantity = formatQty(quantity, stepSize, precision);

  if (quantity < minQty) {
    console.log(`❌ Quantity too low for ${pair.symbol}`);
    return;
  }

  console.log(`🔄 Buying ${quantity} ${pair.symbol} at $${price}`);
  const buyOrder = await placeFuturesOrder(pair.symbol, "BUY", quantity);

  if (!buyOrder) return;

  const targetPrice = price * (1 + ROI_PERCENTAGE / 100);
  const interval = setInterval(async () => {
    const currPrice = await getFuturesPrice(pair.symbol);
    if (currPrice >= targetPrice) {
      console.log(`🎯 Target reached! Selling ${quantity} at $${currPrice}`);
      await placeFuturesOrder(pair.symbol, "SELL", quantity);
      clearInterval(interval);
    } else {
      console.log(
        `${pair.symbol} waiting... Price: $${currPrice}, Target: $${targetPrice}`
      );
    }
  }, CHECK_INTERVAL);
}

(async () => {
  console.log("🚀 Futures Trading Bot Starting on Testnet...");
  for (const pair of TRADING_PAIRS) {
    await tradePair(pair);
  }
})();
