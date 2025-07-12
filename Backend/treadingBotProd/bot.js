const axios = require("axios");
const crypto = require("crypto");

const FUTURES_API_BASE = "https://fapi.binance.com";
const apiKey =
  "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI";
const apiSecret =
  "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR";

const SYMBOLS = ["DOGEUSDT", "1000SHIBUSDT"];

const MIN_BALANCE = 5; // Step 1: Balance should be > $5
const TRADE_AMOUNT = 6; // Step 2: $6 per trade
const PROFIT_TARGET = 0.03; // Step 4: 2% profit target (was 0.03)

let coinStates = {}; // Store state per symbol
console.log(`coinStates:- `, coinStates);

const log = (msg) =>
  console.log(`date :- [${new Date().toISOString()}] ${msg}`);

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
  console.log(
    `my balance : -  ${parseFloat(
      res.data.assets.find((a) => a.asset === "USDT").availableBalance
    )}`
  );

  return parseFloat(
    res.data.assets.find((a) => a.asset === "USDT").availableBalance
  );
};

const getPrecisionMap = async () => {
  const res = await axios.get(`${FUTURES_API_BASE}/fapi/v1/exchangeInfo`);
  const precisionMap = {};
  SYMBOLS.forEach((symbol) => {
    const info = res.data.symbols.find((s) => s.symbol === symbol);
    const stepSize = info.filters.find(
      (f) => f.filterType === "LOT_SIZE"
    ).stepSize;
    const precision = Math.max(0, stepSize.indexOf("1") - 1);
    precisionMap[symbol] = precision;
  });
  console.log(`symball match`, precisionMap);

  return precisionMap;
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
    console.log("order details --->>", params);

    const sig = sign(params);
    const res = await axios.post(`${FUTURES_API_BASE}/fapi/v1/order`, null, {
      params: { ...params, signature: sig },
      headers: { "X-MBX-APIKEY": apiKey },
    });
    if (res.data && res.data.status === "FILLED") {
      log(`✅ Order SUCCESS for ${symbol} | Side: ${side} | Qty: ${quantity}`);
      log("📄 Order Response:", JSON.stringify(res.data, null, 2));
    } else {
      log(
        `⚠️ Order placed but not filled immediately for ${symbol} | Side: ${side} | Qty: ${quantity}`
      );
      log("📄 Order Response:", JSON.stringify(res.data, null, 2));
    }
    return res.data;
  } catch (e) {
    const errMsg =
      error.response?.data?.msg || error.message || "Unknown error";
    log(
      `❌ Order ERROR for ${symbol} | Side: ${side} | Qty: ${quantity} | Error: ${errMsg}`
    );
    if (error.response?.data) {
      log("📄 Error Details:", JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
};

const tradeBot = async () => {
  const precisionMap = await getPrecisionMap();

  while (true) {
    // Step 1: Get balance and check if > $5
    const balance = await getBalance();
    log(`💰 Current Balance: $${balance.toFixed(2)}`);

    if (balance < MIN_BALANCE) {
      log("❗ Balance too low for trading (< $5). Waiting...");
      await new Promise((res) => setTimeout(res, 5000));
      continue;
    }

    for (const symbol of SYMBOLS) {
      const precision = precisionMap[symbol];

      // Get latest price
      let currentPrice;
      try {
        const res = await axios.get(
          `${FUTURES_API_BASE}/fapi/v1/ticker/price`,
          {
            params: { symbol },
          }
        );
        currentPrice = parseFloat(res.data.price);
      } catch (err) {
        log(`❌ Price fetch failed for ${symbol}: ${err.message}`);
        continue;
      }

      // Step 2: If not holding and balance allows, buy $6 worth
      if (!coinStates[symbol]) {
        if (balance >= TRADE_AMOUNT) {
          const quantity = parseFloat(
            (TRADE_AMOUNT / currentPrice).toFixed(precision)
          );
          const buyOrder = await placeOrder(symbol, "BUY", quantity);

          if (buyOrder && buyOrder.status === "FILLED") {
            coinStates[symbol] = {
              buyPrice: currentPrice,
              quantity,
              targetPrice: currentPrice * (1 + PROFIT_TARGET),
            };
            log(
              `✅ BOUGHT ${quantity} ${symbol} @ $${currentPrice.toFixed(
                6
              )} | Target: $${coinStates[symbol].targetPrice.toFixed(6)}`
            );
          }
        } else {
          log(
            `⚠️ Insufficient balance for ${symbol} (need $${TRADE_AMOUNT}, have $${balance.toFixed(
              2
            )})`
          );
        }
      } else {
        // Step 3: Monitor buy-price vs current-price
        const state = coinStates[symbol];
        const priceChangePercent = (
          ((currentPrice - state.buyPrice) / state.buyPrice) *
          100
        ).toFixed(2);

        log(
          `📊 ${symbol} | Buy: $${state.buyPrice.toFixed(
            6
          )} | Now: $${currentPrice.toFixed(
            6
          )} | Change: ${priceChangePercent}% | Target: $${state.targetPrice.toFixed(
            6
          )}`
        );

        // Step 4: If current-price >= buy-price + 2%, sell all
        if (currentPrice >= state.targetPrice) {
          const sellOrder = await placeOrder(symbol, "SELL", state.quantity);
          if (sellOrder && sellOrder.status === "FILLED") {
            const profit = (currentPrice - state.buyPrice) * state.quantity;
            log(
              `🎯 SOLD ${state.quantity} ${symbol} @ $${currentPrice.toFixed(
                6
              )} | Profit: $${profit.toFixed(4)}`
            );

            // Step 5: Reset state to restart cycle from step 1
            delete coinStates[symbol];
            log(`🔄 ${symbol} cycle completed. Restarting from step 1...`);
          }
        }
      }
    }

    await new Promise((res) => setTimeout(res, 2000)); // 2s delay
  }
};

// Start the bot
log("🚀 Starting Trading Bot...");
log(
  `📋 Settings: Min Balance: $${MIN_BALANCE}, Trade Amount: $${TRADE_AMOUNT}, Profit Target: ${
    PROFIT_TARGET * 100
  }%`
);
tradeBot().catch((err) => {
  log(`💥 Bot crashed: ${err.message}`);
  process.exit(1);
});
