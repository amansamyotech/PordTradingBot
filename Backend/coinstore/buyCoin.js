const axios = require("axios");
const crypto = require("crypto");

const FUTURES_API_BASE = "https://api.coinstore.com/api";
const apiKey = "460e56f22bedb4cbb9908603dcd6f7b1";
const apiSecret = "31e4c0d4d894de2250c4e0c152cb8158";

const SYMBOL = "BTCUSDT";
// const SYMBOL = "PEPEUSDT";
// const SYMBOL = "SHIBUSDT";
// const SYMBOL = "BONKUSDT";
// const SYMBOL = "FLOKIUSDT";
const PROFIT_PERCENTAGE = 0.001; // 0.01%

let position = null;
let buyPrice = 0;
let quantity = 0;
let targetPrice = 0;

const log = (msg) => {
  console.log(`[${new Date().toISOString()}] ${msg}`);
};

// Coinstore uses different signature method
const sign = (method, endpoint, params = {}) => {
  const timestamp = Date.now();
  const queryString =
    Object.keys(params).length > 0
      ? "?" + new URLSearchParams(params).toString()
      : "";

  const signaturePayload = `${method}${endpoint}${queryString}${timestamp}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signaturePayload)
    .digest("hex");

  return { timestamp, signature };
};

const getBalance = async () => {
  try {
    const endpoint = "/account/balances";
    const { timestamp, signature } = sign("GET", endpoint);

    const res = await axios.get(`${FUTURES_API_BASE}${endpoint}`, {
      headers: {
        "X-CS-APIKEY": apiKey,
        "X-CS-SIGN": signature,
        "X-CS-EXPIRES": timestamp,
        "Content-Type": "application/json",
      },
    });

    const usdtBalance = res.data.data.find(
      (balance) => balance.currency === "USDT"
    );
    return usdtBalance ? parseFloat(usdtBalance.available) : 0;
  } catch (e) {
    log(`❌ Balance Error: ${e.response?.data?.msg || e.message}`);
    return 0;
  }
};

const getPrice = async () => {
  try {
    const endpoint = "/market/ticker";
    const params = { symbol: SYMBOL };
    const { timestamp, signature } = sign("GET", endpoint, params);

    const res = await axios.get(`${FUTURES_API_BASE}${endpoint}`, {
      params,
      headers: {
        "X-CS-APIKEY": apiKey,
        "X-CS-SIGN": signature,
        "X-CS-EXPIRES": timestamp,
        "Content-Type": "application/json",
      },
    });

    return parseFloat(res.data.data.c);
  } catch (e) {
    log(`❌ Price Error: ${e.response?.data?.msg || e.message}`);
    return 0;
  }
};

const getSymbolInfo = async () => {
  try {
    const endpoint = "/market/symbols";
    const { timestamp, signature } = sign("GET", endpoint);

    const res = await axios.get(`${FUTURES_API_BASE}${endpoint}`, {
      headers: {
        "X-CS-APIKEY": apiKey,
        "X-CS-SIGN": signature,
        "X-CS-EXPIRES": timestamp,
        "Content-Type": "application/json",
      },
    });

    return res.data.data.find((s) => s.symbol === SYMBOL);
  } catch (e) {
    log(`❌ Symbol Info Error: ${e.response?.data?.msg || e.message}`);
    return null;
  }
};
const getPrecision = async () => {
  const symbolInfo = await getSymbolInfo();
  if (symbolInfo) {
    return symbolInfo.basePrecision || 8; // Default to 8 if not specified
  }
  return 8;
};

const placeOrder = async (side, qty) => {
  try {
    const endpoint = "/trade/order/place";
    const params = {
      symbol: SYMBOL,
      side: side.toLowerCase(), // Coinstore uses lowercase
      type: "MARKET",
      quantity: qty.toString(),
    };

    const { timestamp, signature } = sign("POST", endpoint, params);

    console.log(`params---->>>>>>>>>>>> place order   `, params);

    const res = await axios.post(`${FUTURES_API_BASE}${endpoint}`, params, {
      headers: {
        "X-CS-APIKEY": apiKey,
        "X-CS-SIGN": signature,
        "X-CS-EXPIRES": timestamp,
        "Content-Type": "application/json",
      },
    });

    console.log(`place order response  ----`, res.data);
    return res.data.data;
  } catch (e) {
    log(`❌ Order Error: ${e.response?.data?.msg || e.message}`);
    return null;
  }
};

const getOrderStatus = async (orderId) => {
  try {
    const endpoint = "/trade/order/active";
    const params = { orderId: orderId };
    const { timestamp, signature } = sign("GET", endpoint, params);

    const res = await axios.get(`${FUTURES_API_BASE}${endpoint}`, {
      params,
      headers: {
        "X-CS-APIKEY": apiKey,
        "X-CS-SIGN": signature,
        "X-CS-EXPIRES": timestamp,
        "Content-Type": "application/json",
      },
    });

    return res.data.data;
  } catch (e) {
    log(`❌ Order Status Error: ${e.response?.data?.msg || e.message}`);
    return null;
  }
};

const startBot = async () => {
  log("🚀 Starting Coinstore Bot...");
  const precision = await getPrecision();

  while (true) {
    try {
      const currentPrice = await getPrice();

      if (currentPrice === 0) {
        log("❌ Failed to get current price, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      console.log(`currentPrice >=`, currentPrice);
      console.log(`targetPrice`, targetPrice);
      console.log(`position  -- `, position);

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
          // Uncomment the next line if you want to simulate having a position for testing
          // position = "LONG";
          continue;
        }

        const order = await placeOrder("BUY", quantity);
        if (order && order.orderId) {
          // Wait a bit and check order status
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const orderStatus = await getOrderStatus(order.orderId);

          if (orderStatus && orderStatus.status === "FILLED") {
            position = "LONG";
            buyPrice = currentPrice;
            targetPrice = currentPrice * (1 + PROFIT_PERCENTAGE / 100);

            log(
              `✅ BOUGHT ${quantity} ${SYMBOL} @ ${currentPrice} | Target: ${targetPrice.toFixed(
                6
              )}`
            );
          } else {
            log(`⏳ Buy order pending or failed`);
          }
        } else {
          log(`❌ Buy order failed`);
        }
      }

      // SELL - if have position and target reached
      else if (position === "LONG" && currentPrice >= targetPrice) {
        console.log("🔄 Target reached! Attempting to sell...");

        const order = await placeOrder("SELL", quantity);

        if (order && order.orderId) {
          console.log("✅ Sell order placed, ID:", order.orderId);

          // Wait a bit and check order status
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const orderStatus = await getOrderStatus(order.orderId);

          if (orderStatus && orderStatus.status === "FILLED") {
            const profit = (currentPrice - buyPrice) * quantity;
            const profitPercentage =
              ((currentPrice - buyPrice) / buyPrice) * 100;

            log(
              `🎯 SOLD ${quantity} ${SYMBOL} @ ${currentPrice} | Profit: ${profit.toFixed(
                4
              )} (${profitPercentage.toFixed(2)}%)`
            );

            // Reset for next cycle
            position = null;
            buyPrice = 0;
            quantity = 0;
            targetPrice = 0;
          } else if (orderStatus && orderStatus.status === "PENDING") {
            log(`⏳ Sell order still pending, waiting...`);
            // Keep position, don't reset - will check again next cycle
          } else {
            log(`❌ Sell order failed or cancelled, will retry next cycle`);
            // Keep position, don't reset - will retry next cycle
          }
        } else {
          log(`❌ Failed to place sell order, will retry next cycle`);
          // Keep position, don't reset - will retry next cycle
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

// startBot();

getSymbolInfo();
