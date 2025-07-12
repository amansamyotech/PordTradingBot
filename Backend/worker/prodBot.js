// const axios = require("axios");
// const crypto = require("crypto");
// const fs = require("fs");
// const path = require("path");

// // PRODUCTION API CONFIGURATION
// const apiKey =
//   "VdE7IrcWyAHA9sk6ZA3bqjrgK6CiJPYN9syZO5Glqk0LJOF5p3d5dgMWdTjL9ENC"; // Replace with your production API key
// const apiSecret =
//   "MKvMiyekLaXCJqALjyv7jq0PjHv7v1ruZnf69MTWxxCmnS20G7ZxyAPkdV7o1ojC"; // Replace with your production API secret

// // Trading pairs configuration
// const TRADING_PAIRS = [
//   { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
//   { symbol: "BONKUSDT", asset: "BONK", name: "Bonk" },
//   { symbol: "FLOKIUSDT", asset: "FLOKI", name: "Floki Inu" },
//   { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
//   { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
// ];

// // Trading parameters
// const PROFIT_TARGET = 0.02; // 2% profit target
// const CHECK_INTERVAL = 5000; // 5 seconds
// const BASE_CURRENCY = "USDT"; // Base currency for trading

// // Create logs directory
// const logsDir = path.join(__dirname, "logs");
// if (!fs.existsSync(logsDir)) {
//   fs.mkdirSync(logsDir);
// }

// // File paths for logging
// const today = new Date().toISOString().split("T")[0];
// const logFile = path.join(logsDir, `production_trading_log_${today}.txt`);
// const tradesFile = path.join(logsDir, `production_trades_${today}.json`);
// const profitFile = path.join(logsDir, `production_profit_${today}.json`);

// // Trading state for each pair
// const tradingState = {};

// // Overall profit/loss tracking
// let overallStats = {
//   totalProfit: 0,
//   totalLoss: 0,
//   totalTrades: 0,
//   profitableTrades: 0,
//   losingTrades: 0,
//   initialBalance: 0,
//   currentBalance: 0,
//   coinStats: {},
// };

// // Initialize trading state and coin stats
// TRADING_PAIRS.forEach((pair) => {
//   tradingState[pair.symbol] = {
//     buyPrice: null,
//     quantity: 0,
//     position: null, // null = no position, 'long' = holding
//     isTrading: false,
//     name: pair.name,
//     asset: pair.asset,
//     allocatedAmount: 0,
//   };

//   overallStats.coinStats[pair.symbol] = {
//     name: pair.name,
//     profit: 0,
//     loss: 0,
//     trades: 0,
//     profitableTrades: 0,
//     losingTrades: 0,
//     allocatedAmount: 0,
//   };
// });

// // Load existing stats if file exists
// if (fs.existsSync(profitFile)) {
//   try {
//     const savedStats = JSON.parse(fs.readFileSync(profitFile, "utf8"));
//     overallStats = { ...overallStats, ...savedStats };
//   } catch (error) {
//     console.log("Starting with fresh profit tracking");
//   }
// }

// // Logging function
// const logToFile = (message, type = "INFO") => {
//   const timestamp = new Date().toISOString();
//   const logEntry = `[${timestamp}] [${type}] ${message}\n`;

//   fs.appendFileSync(logFile, logEntry);
//   console.log(`[${type}] ${message}`);
// };

// // Save trade to JSON file
// const saveTradeToFile = (tradeData) => {
//   let trades = [];

//   if (fs.existsSync(tradesFile)) {
//     try {
//       trades = JSON.parse(fs.readFileSync(tradesFile, "utf8"));
//     } catch (error) {
//       trades = [];
//     }
//   }

//   trades.push({
//     ...tradeData,
//     timestamp: new Date().toISOString(),
//   });

//   fs.writeFileSync(tradesFile, JSON.stringify(trades, null, 2));
// };

// // Save profit summary to file
// const saveProfitSummary = () => {
//   fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
// };

// // Generate signature for Binance API
// const generateSignature = (params, secret) => {
//   const queryString = Object.keys(params)
//     .map((key) => `${key}=${params[key]}`)
//     .join("&");

//   return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
// };

// // Get current prices for multiple symbols
// const getMultiplePrices = async (symbols) => {
//   try {
//     const symbolsParam = symbols.map((s) => `"${s}"`).join(",");
//     const params = { symbols: `[${symbolsParam}]` };

//     const response = await axios.get(
//       "https://api.binance.com/api/v3/ticker/price", // Production API
//       { params: params }
//     );

//     const prices = {};
//     response.data.forEach((item) => {
//       prices[item.symbol] = parseFloat(item.price);
//     });

//     return prices;
//   } catch (error) {
//     logToFile(`Error getting prices: ${error.message}`, "ERROR");
//     return null;
//   }
// };

// // Get account balance
// const getBalance = async (asset) => {
//   try {
//     const params = {
//       timestamp: Date.now(),
//     };

//     const signature = generateSignature(params, apiSecret);
//     params.signature = signature;

//     const response = await axios.get(
//       "https://api.binance.com/api/v3/account", // Production API
//       {
//         params: params,
//         headers: {
//           "X-MBX-APIKEY": apiKey,
//         },
//       }
//     );

//     const balance = response.data.balances.find((b) => b.asset === asset);
//     return balance ? parseFloat(balance.free) : 0;
//   } catch (error) {
//     logToFile(`Error getting balance for ${asset}: ${error.message}`, "ERROR");
//     return 0;
//   }
// };

// // Get symbol info for minimum order requirements
// const getSymbolInfo = async (symbol) => {
//   try {
//     const response = await axios.get(
//       "https://api.binance.com/api/v3/exchangeInfo"
//     );

//     const symbolInfo = response.data.symbols.find((s) => s.symbol === symbol);
//     if (!symbolInfo) return null;

//     const minQtyFilter = symbolInfo.filters.find(
//       (f) => f.filterType === "LOT_SIZE"
//     );
//     const minNotionalFilter = symbolInfo.filters.find(
//       (f) => f.filterType === "MIN_NOTIONAL"
//     );

//     return {
//       minQty: parseFloat(minQtyFilter?.minQty || 0),
//       stepSize: parseFloat(minQtyFilter?.stepSize || 0),
//       minNotional: parseFloat(minNotionalFilter?.minNotional || 0),
//     };
//   } catch (error) {
//     logToFile(
//       `Error getting symbol info for ${symbol}: ${error.message}`,
//       "ERROR"
//     );
//     return null;
//   }
// };

// // Round quantity to valid step size
// const roundToStepSize = (quantity, stepSize) => {
//   const precision = stepSize.toString().split(".")[1]?.length || 0;
//   return Math.floor(quantity / stepSize) * stepSize;
// };

// // Place market order
// const placeOrder = async (symbol, side, quantity) => {
//   try {
//     const params = {
//       symbol: symbol,
//       side: side,
//       type: "MARKET",
//       quantity: quantity,
//       timestamp: Date.now(),
//     };

//     const signature = generateSignature(params, apiSecret);
//     params.signature = signature;

//     const response = await axios.post(
//       "https://api.binance.com/api/v3/order", // Production API
//       null,
//       {
//         params: params,
//         headers: {
//           "X-MBX-APIKEY": apiKey,
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     logToFile(
//       `Error placing ${side} order for ${symbol}: ${
//         error.response?.data?.msg || error.message
//       }`,
//       "ERROR"
//     );
//     return null;
//   }
// };

// // Initialize trading with balance allocation
// const initializeTradingAmounts = async () => {
//   try {
//     const usdtBalance = await getBalance(BASE_CURRENCY);

//     if (usdtBalance <= 0) {
//       logToFile("No USDT balance available for trading!", "ERROR");
//       return false;
//     }

//     overallStats.initialBalance = usdtBalance;
//     overallStats.currentBalance = usdtBalance;

//     // Allocate balance equally among coins
//     const amountPerCoin = usdtBalance / TRADING_PAIRS.length;

//     logToFile(`Total USDT Balance: ${usdtBalance.toFixed(2)}`, "SYSTEM");
//     logToFile(`Amount per coin: ${amountPerCoin.toFixed(2)} USDT`, "SYSTEM");

//     // Set allocated amounts
//     TRADING_PAIRS.forEach((pair) => {
//       tradingState[pair.symbol].allocatedAmount = amountPerCoin;
//       overallStats.coinStats[pair.symbol].allocatedAmount = amountPerCoin;
//     });

//     return true;
//   } catch (error) {
//     logToFile(`Error initializing trading amounts: ${error.message}`, "ERROR");
//     return false;
//   }
// };

// // Execute buy order for a coin
// const executeBuyOrder = async (symbol, currentPrice, state) => {
//   if (state.isTrading || state.position === "long") return;

//   try {
//     state.isTrading = true;

//     const symbolInfo = await getSymbolInfo(symbol);
//     if (!symbolInfo) {
//       logToFile(`Could not get symbol info for ${symbol}`, "ERROR");
//       state.isTrading = false;
//       return;
//     }

//     // Calculate quantity based on allocated amount
//     let quantity = state.allocatedAmount / currentPrice;

//     // Round to valid step size
//     quantity = roundToStepSize(quantity, symbolInfo.stepSize);

//     // Check minimum quantity and notional requirements
//     const notional = quantity * currentPrice;

//     if (quantity < symbolInfo.minQty || notional < symbolInfo.minNotional) {
//       logToFile(
//         `${state.name}: Order too small. Qty: ${quantity}, MinQty: ${
//           symbolInfo.minQty
//         }, Notional: ${notional.toFixed(2)}, MinNotional: ${
//           symbolInfo.minNotional
//         }`,
//         "WARNING"
//       );
//       state.isTrading = false;
//       return;
//     }

//     logToFile(
//       `Attempting to buy ${quantity} ${state.name} at $${currentPrice}`,
//       "TRADE"
//     );

//     const order = await placeOrder(symbol, "BUY", quantity);

//     if (order) {
//       state.position = "long";
//       state.buyPrice = currentPrice;
//       state.quantity = quantity;

//       logToFile(
//         `✅ BOUGHT ${quantity} ${
//           state.name
//         } at $${currentPrice} (${state.allocatedAmount.toFixed(2)} USDT)`,
//         "TRADE"
//       );

//       // Save buy trade
//       saveTradeToFile({
//         symbol: symbol,
//         coin: state.name,
//         action: "BUY",
//         price: currentPrice,
//         quantity: quantity,
//         amount: state.allocatedAmount,
//         orderId: order.orderId,
//       });
//     }

//     state.isTrading = false;
//   } catch (error) {
//     logToFile(
//       `Error executing buy order for ${symbol}: ${error.message}`,
//       "ERROR"
//     );
//     state.isTrading = false;
//   }
// };

// // Execute sell order for a coin
// const executeSellOrder = async (symbol, currentPrice, state) => {
//   if (state.isTrading || state.position !== "long") return;

//   try {
//     state.isTrading = true;

//     // Check if we have enough balance to sell
//     const balance = await getBalance(state.asset);

//     if (balance < state.quantity) {
//       logToFile(
//         `Insufficient ${state.asset} balance. Have: ${balance}, Need: ${state.quantity}`,
//         "WARNING"
//       );
//       state.isTrading = false;
//       return;
//     }

//     logToFile(
//       `Attempting to sell ${state.quantity} ${state.name} at $${currentPrice}`,
//       "TRADE"
//     );

//     const order = await placeOrder(symbol, "SELL", state.quantity);

//     if (order) {
//       const sellAmount = state.quantity * currentPrice;
//       const profit = sellAmount - state.allocatedAmount;
//       const profitPercent = (profit / state.allocatedAmount) * 100;

//       logToFile(
//         `✅ SOLD ${state.quantity} ${
//           state.name
//         } at $${currentPrice} (${sellAmount.toFixed(2)} USDT)`,
//         "TRADE"
//       );
//       logToFile(
//         `💰 ${state.name} Profit: $${profit.toFixed(
//           2
//         )} (${profitPercent.toFixed(2)}%)`,
//         "PROFIT"
//       );

//       // Update statistics
//       overallStats.totalTrades++;
//       overallStats.coinStats[symbol].trades++;

//       if (profit > 0) {
//         overallStats.totalProfit += profit;
//         overallStats.profitableTrades++;
//         overallStats.coinStats[symbol].profit += profit;
//         overallStats.coinStats[symbol].profitableTrades++;
//       } else {
//         overallStats.totalLoss += Math.abs(profit);
//         overallStats.losingTrades++;
//         overallStats.coinStats[symbol].loss += Math.abs(profit);
//         overallStats.coinStats[symbol].losingTrades++;
//       }

//       // Save sell trade
//       saveTradeToFile({
//         symbol: symbol,
//         coin: state.name,
//         action: "SELL",
//         buyPrice: state.buyPrice,
//         sellPrice: currentPrice,
//         quantity: state.quantity,
//         profit: profit,
//         profitPercent: profitPercent,
//         orderId: order.orderId,
//       });

//       // Reset position and update allocated amount for next trade
//       state.position = null;
//       state.buyPrice = null;
//       state.quantity = 0;
//       state.allocatedAmount = sellAmount; // Use proceeds for next trade

//       // Save updated stats
//       saveProfitSummary();
//     }

//     state.isTrading = false;
//   } catch (error) {
//     logToFile(
//       `Error executing sell order for ${symbol}: ${error.message}`,
//       "ERROR"
//     );
//     state.isTrading = false;
//   }
// };

// // Main trading logic
// const executeTradingLogic = async (symbol, currentPrice, state) => {
//   if (state.position === null) {
//     // No position - ready to buy
//     await executeBuyOrder(symbol, currentPrice, state);
//   } else if (state.position === "long") {
//     // Holding position - check for profit target
//     const profitPercent = (currentPrice - state.buyPrice) / state.buyPrice;

//     if (profitPercent >= PROFIT_TARGET) {
//       logToFile(
//         `🎯 ${state.name} hit profit target: ${(profitPercent * 100).toFixed(
//           2
//         )}% (Target: ${PROFIT_TARGET * 100}%)`,
//         "PROFIT"
//       );
//       await executeSellOrder(symbol, currentPrice, state);
//     }
//   }
// };

// // Display current status
// const displayStatus = (prices) => {
//   console.clear();

//   const netProfit = overallStats.totalProfit - overallStats.totalLoss;
//   const winRate =
//     overallStats.totalTrades > 0
//       ? (
//           (overallStats.profitableTrades / overallStats.totalTrades) *
//           100
//         ).toFixed(1)
//       : 0;

//   console.log(`🤖 PRODUCTION Multi-Crypto Trading Bot`);
//   console.log(`⏰ ${new Date().toLocaleTimeString()}`);
//   console.log(`🎯 Profit Target: ${PROFIT_TARGET * 100}%`);
//   console.log(`${"=".repeat(100)}`);
//   console.log(`📊 OVERALL PERFORMANCE:`);
//   console.log(`💰 Initial Balance: $${overallStats.initialBalance.toFixed(2)}`);
//   console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(2)}`);
//   console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(2)}`);
//   console.log(`🎯 Net Profit: $${netProfit.toFixed(2)}`);
//   console.log(
//     `📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`
//   );
//   console.log(`${"=".repeat(100)}`);

//   TRADING_PAIRS.forEach((pair) => {
//     const state = tradingState[pair.symbol];
//     const currentPrice = prices[pair.symbol];
//     const coinStats = overallStats.coinStats[pair.symbol];

//     if (currentPrice) {
//       const statusEmoji = state.position === "long" ? "🟢" : "🔴";
//       const positionText = state.position === "long" ? "HOLDING" : "WAITING";
//       const coinNetProfit = coinStats.profit - coinStats.loss;

//       let profitPercent = "";
//       if (state.position === "long" && state.buyPrice) {
//         const currentProfitPercent =
//           ((currentPrice - state.buyPrice) / state.buyPrice) * 100;
//         profitPercent = `${currentProfitPercent.toFixed(2)}%`;
//       }

//       console.log(
//         `${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(
//           7
//         )} | Price: $${currentPrice
//           .toFixed(6)
//           .padEnd(10)} | Allocated: $${state.allocatedAmount
//           .toFixed(2)
//           .padEnd(8)} | P/L: $${coinNetProfit
//           .toFixed(2)
//           .padEnd(8)} | Current: ${profitPercent}`
//       );
//     }
//   });

//   console.log(`${"=".repeat(100)}`);
//   console.log(`📁 Logs: ${logFile}`);
//   console.log(`📊 Trades: ${tradesFile}`);
// };

// // Main trading loop
// const startTrading = async () => {
//   logToFile("🤖 PRODUCTION Multi-Crypto Trading Bot Started", "SYSTEM");
//   logToFile(
//     "⚠️  WARNING: This is running on PRODUCTION Binance API!",
//     "WARNING"
//   );

//   // Initialize trading amounts
//   const initialized = await initializeTradingAmounts();
//   if (!initialized) {
//     logToFile("Failed to initialize trading amounts. Exiting.", "ERROR");
//     return;
//   }

//   logToFile(`🎯 Profit target: ${PROFIT_TARGET * 100}%`, "SYSTEM");
//   logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, "SYSTEM");

//   while (true) {
//     try {
//       const symbols = TRADING_PAIRS.map((pair) => pair.symbol);
//       const prices = await getMultiplePrices(symbols);

//       if (prices) {
//         displayStatus(prices);

//         // Execute trading logic for each pair
//         for (const pair of TRADING_PAIRS) {
//           const currentPrice = prices[pair.symbol];
//           if (currentPrice) {
//             await executeTradingLogic(
//               pair.symbol,
//               currentPrice,
//               tradingState[pair.symbol]
//             );
//           }
//         }
//       }

//       await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
//     } catch (error) {
//       logToFile(`Error in trading loop: ${error.message}`, "ERROR");
//       await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
//     }
//   }
// };

// // Handle graceful shutdown
// process.on("SIGINT", async () => {
//   logToFile("🛑 Trading bot stopped by user", "SYSTEM");

//   // Show final summary
//   const usdtBalance = await getBalance(BASE_CURRENCY);
//   const netProfit = overallStats.totalProfit - overallStats.totalLoss;

//   console.log(`\n📊 FINAL SUMMARY:`);
//   console.log(`💰 Initial Balance: $${overallStats.initialBalance.toFixed(2)}`);
//   console.log(`💰 Current USDT Balance: $${usdtBalance.toFixed(2)}`);
//   console.log(`🎯 Net Profit: $${netProfit.toFixed(2)}`);
//   console.log(`📈 Total Trades: ${overallStats.totalTrades}`);

//   saveProfitSummary();
//   process.exit(0);
// });

// // Start the bot
// console.log("🚀 Starting PRODUCTION Multi-Crypto Trading Bot...");
// console.log("⚠️  Make sure you have set your PRODUCTION API keys!");
// console.log("⚠️  This bot will trade with REAL money!");
// console.log("Press Ctrl+C to stop the bot safely.");

// setTimeout(() => {
//   startTrading().catch((error) => {
//     logToFile(`Fatal error: ${error.message}`, "ERROR");
//     process.exit(1);
//   });
// }, 3000); // 3 second delay to read warnings

const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("../services/telegramService");

const apiKey =
  "VdE7IrcWyAHA9sk6ZA3bqjrgK6CiJPYN9syZO5Glqk0LJOF5p3d5dgMWdTjL9ENC";
const apiSecret =
  "MKvMiyekLaXCJqALjyv7jq0PjHv7v1ruZnf69MTWxxCmnS20G7ZxyAPkdV7o1ojC";

const TRADING_PAIRS = [
  { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
  { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
  { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
  { symbol: "BONKUSDT", asset: "BONK", name: "Bonk" },
  { symbol: "FLOKIUSDT", asset: "FLOKI", name: "Floki Inu" },
];

const PRICE_THRESHOLD = 0.1;
const CHECK_INTERVAL = 5000;
const REFERENCE_UPDATE_INTERVAL = 5 * 60 * 1000;

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// File paths for logging
const today = new Date().toISOString().split("T")[0];
const logFile = path.join(logsDir, `trading_log_${today}.txt`);
const tradesFile = path.join(logsDir, `trades_${today}.json`);
const profitFile = path.join(logsDir, `profit_summary_${today}.json`);

// Trading state for each pair
const tradingState = {};

// Overall profit/loss tracking
let overallStats = {
  totalProfit: 0,
  totalLoss: 0,
  totalTrades: 0,
  profitableTrades: 0,
  losingTrades: 0,
  coinStats: {},
};

// Initialize trading state and coin stats
TRADING_PAIRS.forEach((pair) => {
  tradingState[pair.symbol] = {
    buyingPrice: null,
    position: null,
    isTrading: false,
    name: pair.name,
    asset: pair.asset,
    quantity: null, // Will be set after balance calculation
    lastReferenceUpdate: null,
    waitingStartTime: null,
  };

  overallStats.coinStats[pair.symbol] = {
    name: pair.name,
    profit: 0,
    loss: 0,
    trades: 0,
    profitableTrades: 0,
    losingTrades: 0,
  };
});

// Load existing stats if file exists
if (fs.existsSync(profitFile)) {
  try {
    const savedStats = JSON.parse(fs.readFileSync(profitFile, "utf8"));
    overallStats = { ...overallStats, ...savedStats };
  } catch (error) {
    console.log("Starting with fresh profit tracking");
  }
}

// Logging function with Telegram notification
const logToFile = (message, type = "INFO") => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(message);
  if (["TRADE", "PROFIT", "ERROR", "SYSTEM", "UPDATE"].includes(type)) {
    sendTelegram(`[${type}] ${message}`);
  }
};

// Save trade to JSON file with Telegram notification
const saveTradeToFile = (tradeData) => {
  let trades = [];
  if (fs.existsSync(tradesFile)) {
    try {
      trades = JSON.parse(fs.readFileSync(tradesFile, "utf8"));
    } catch (error) {
      trades = [];
    }
  }
  const tradeEntry = {
    ...tradeData,
    timestamp: new Date().toISOString(),
  };
  trades.push(tradeEntry);
  fs.writeFileSync(tradesFile, JSON.stringify(trades, null, 2));
  const message =
    `💸 TRADE: ${tradeEntry.coin} (${tradeEntry.symbol})\n` +
    `Action: ${tradeEntry.action}\n` +
    (tradeEntry.price ? `Price: $${tradeEntry.price.toFixed(6)}\n` : "") +
    (tradeEntry.quantity ? `Quantity: ${tradeEntry.quantity}\n` : "") +
    (tradeEntry.profit ? `Profit: $${tradeEntry.profit.toFixed(6)}\n` : "") +
    (tradeEntry.oldPrice
      ? `Old Ref Price: $${tradeEntry.oldPrice.toFixed(6)}\n`
      : "") +
    (tradeEntry.newPrice
      ? `New Ref Price: $${tradeEntry.newPrice.toFixed(6)}\n`
      : "") +
    `Time: ${tradeEntry.timestamp}`;
  sendTelegram(message);
};

// Save profit summary to file
const saveProfitSummary = () => {
  fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
};

// Update profit/loss statistics with Telegram notification
const updateProfitStats = (symbol, profit, buyPrice, sellPrice) => {
  const coinStats = overallStats.coinStats[symbol];
  overallStats.totalTrades++;
  coinStats.trades++;
  if (profit > 0) {
    overallStats.totalProfit += profit;
    overallStats.profitableTrades++;
    coinStats.profit += profit;
    coinStats.profitableTrades++;
  } else {
    overallStats.totalLoss += Math.abs(profit);
    overallStats.losingTrades++;
    coinStats.loss += Math.abs(profit);
    coinStats.losingTrades++;
  }
  saveTradeToFile({
    symbol: symbol,
    coin: coinStats.name,
    action: "SELL",
    buyPrice: buyPrice,
    sellPrice: sellPrice,
    profit: profit,
    quantity: tradingState[symbol].quantity,
  });
  const netProfit = overallStats.totalProfit - overallStats.totalLoss;
  const winRate =
    overallStats.totalTrades > 0
      ? (
          (overallStats.profitableTrades / overallStats.totalTrades) *
          100
        ).toFixed(1)
      : 0;
  const message =
    `📊 PROFIT UPDATE: ${coinStats.name} (${symbol})\n` +
    `Profit/Loss: $${profit.toFixed(6)}\n` +
    `Total Trades: ${overallStats.totalTrades}\n` +
    `Total Profit: $${overallStats.totalProfit.toFixed(6)}\n` +
    `Total Loss: $${overallStats.totalLoss.toFixed(6)}\n` +
    `Net Profit: $${netProfit.toFixed(6)}\n` +
    `Win Rate: ${winRate}%`;
  sendTelegram(message);
  saveProfitSummary();
};

// Function to generate the signature for Binance API
const generateSignature = (params, secret) => {
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
};

// Function to get prices for multiple symbols
const getMultiplePrices = async (symbols) => {
  try {
    const symbolsParam = symbols.map((s) => `"${s}"`).join(",");
    const params = { symbols: `[${symbolsParam}]` };
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price",
      { params: params }
    );
    const prices = {};
    response.data.forEach((item) => {
      prices[item.symbol] = parseFloat(item.price);
    });
    return prices;
  } catch (error) {
    if (error.response) {
      logToFile(
        `Error getting prices: ${JSON.stringify(error.response.data)}`,
        "ERROR"
      );
    } else {
      logToFile(`Error getting prices: ${error.message}`, "ERROR");
    }
    return null;
  }
};

// Function to place a market order
const placeOrder = async (symbol, side, quantity) => {
  try {
    const params = {
      symbol: symbol,
      side: side,
      type: "MARKET",
      quantity: quantity,
      timestamp: Date.now(),
    };
    const signature = generateSignature(params, apiSecret);
    params.signature = signature;
    const response = await axios.post(
      "https://api.binance.com/api/v3/order",
      null,
      {
        params: params,
        headers: {
          "X-MBX-APIKEY": apiKey,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      logToFile(
        `Error placing ${side} order for ${symbol}: ${JSON.stringify(
          error.response.data
        )}`,
        "ERROR"
      );
    } else {
      logToFile(
        `Error placing ${side} order for ${symbol}: ${error.message}`,
        "ERROR"
      );
    }
    return null;
  }
};

// Function to get account balance
const getBalance = async (asset) => {
  try {
    const params = {
      timestamp: Date.now(),
    };
    const signature = generateSignature(params, apiSecret);
    params.signature = signature;
    const response = await axios.get("https://api.binance.com/api/v3/account", {
      params: params,
      headers: {
        "X-MBX-APIKEY": apiKey,
      },
    });
    const balance = response.data.balances.find((b) => b.asset === asset);
    return balance ? parseFloat(balance.free) : 0;
  } catch (error) {
    logToFile(`Error getting balance for ${asset}: ${error.message}`, "ERROR");
    return 0;
  }
};

// Function to calculate quantities based on USDT balance
const calculateQuantities = async (prices) => {
  const usdtBalance = await getBalance("USDT");
  if (usdtBalance === 0) {
    logToFile("No USDT balance available for trading", "ERROR");
    return false;
  }

  const allocationPerCoin = usdtBalance / TRADING_PAIRS.length;
  logToFile(
    `Total USDT Balance: $${usdtBalance.toFixed(
      6
    )} | Allocation per coin: $${allocationPerCoin.toFixed(6)}`,
    "SYSTEM"
  );

  for (const pair of TRADING_PAIRS) {
    const currentPrice = prices[pair.symbol];
    if (currentPrice) {
      // Calculate quantity based on allocated USDT amount
      let quantity = allocationPerCoin / currentPrice;

      // Adjust quantity to match Binance precision requirements
      const stepSize = await getSymbolStepSize(pair.symbol);
      quantity = Math.floor(quantity / stepSize) * stepSize;

      tradingState[pair.symbol].quantity = quantity;
      logToFile(
        `Set ${
          pair.name
        } quantity to ${quantity} based on $${allocationPerCoin.toFixed(
          6
        )} allocation`,
        "SYSTEM"
      );
    }
  }
  return true;
};

// Function to get symbol step size (lot size) for quantity precision
const getSymbolStepSize = async (symbol) => {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/exchangeInfo",
      {
        params: { symbol },
      }
    );
    const symbolInfo = response.data.symbols[0];
    const quantityPrecision = symbolInfo.quantityPrecision;
    return parseFloat(`0.${"0".repeat(quantityPrecision - 1)}1`);
  } catch (error) {
    logToFile(
      `Error getting symbol info for ${symbol}: ${error.message}`,
      "ERROR"
    );
    return 0.00000001; // Default fallback precision
  }
};

// Function to check if reference price should be updated
const shouldUpdateReferencePrice = (state) => {
  const currentTime = Date.now();
  if (state.position === null && state.waitingStartTime) {
    const waitingTime = currentTime - state.waitingStartTime;
    return waitingTime >= REFERENCE_UPDATE_INTERVAL;
  }
  return false;
};

// Trading logic for a single pair
const executeTradingLogic = async (symbol, currentPrice, state) => {
  if (state.isTrading || !state.quantity) return;

  const currentTime = Date.now();

  if (state.position === null && state.buyingPrice === null) {
    state.buyingPrice = currentPrice;
    state.lastReferenceUpdate = currentTime;
    state.waitingStartTime = currentTime;
    logToFile(`📊 ${state.name} initial reference price set: $${currentPrice}`);
    return;
  }

  if (state.position === null) {
    if (shouldUpdateReferencePrice(state)) {
      const oldPrice = state.buyingPrice;
      state.buyingPrice = currentPrice;
      state.lastReferenceUpdate = currentTime;
      state.waitingStartTime = currentTime;
      logToFile(
        `🔄 ${state.name} reference price updated after 5 minutes: $${oldPrice} → $${currentPrice}`,
        "UPDATE"
      );
      saveTradeToFile({
        symbol: symbol,
        coin: state.name,
        action: "REF_UPDATE",
        oldPrice: oldPrice,
        newPrice: currentPrice,
        reason: "5_minute_wait",
      });
    }

    const buyTriggerPrice = state.buyingPrice - PRICE_THRESHOLD;
    if (currentPrice <= buyTriggerPrice) {
      logToFile(
        `🔽 ${state.name} price dropped to $${currentPrice} (trigger: $${buyTriggerPrice})`
      );
      state.isTrading = true;
      const order = await placeOrder(symbol, "BUY", state.quantity);
      if (order) {
        state.position = "long";
        state.buyingPrice = currentPrice;
        state.waitingStartTime = null;
        logToFile(
          `✅ BOUGHT ${state.quantity} ${state.name} at $${currentPrice}`,
          "TRADE"
        );
        saveTradeToFile({
          symbol: symbol,
          coin: state.name,
          action: "BUY",
          price: currentPrice,
          quantity: state.quantity,
        });
      }
      state.isTrading = false;
    }
  } else if (state.position === "long") {
    const sellTriggerPrice = state.buyingPrice + PRICE_THRESHOLD;
    if (currentPrice >= sellTriggerPrice) {
      logToFile(
        `🔼 ${state.name} price rose to $${currentPrice} (trigger: $${sellTriggerPrice})`
      );
      state.isTrading = true;
      const assetBalance = await getBalance(state.asset);
      if (assetBalance >= state.quantity) {
        const order = await placeOrder(symbol, "SELL", state.quantity);
        if (order) {
          const profit = (currentPrice - state.buyingPrice) * state.quantity;
          logToFile(
            `✅ SOLD ${state.quantity} ${state.name} at $${currentPrice}`,
            "TRADE"
          );
          logToFile(`💰 ${state.name} Profit: $${profit.toFixed(6)}`, "PROFIT");
          updateProfitStats(symbol, profit, state.buyingPrice, currentPrice);
          state.position = null;
          state.buyingPrice = currentPrice;
          state.waitingStartTime = currentTime;
        }
      } else {
        logToFile(
          `❌ Insufficient ${state.asset} balance: ${assetBalance}`,
          "ERROR"
        );
      }
      state.isTrading = false;
    }
  }
};

// Display current status
const displayStatus = (prices) => {
  console.clear();
  const netProfit = overallStats.totalProfit - overallStats.totalLoss;
  const winRate =
    overallStats.totalTrades > 0
      ? (
          (overallStats.profitableTrades / overallStats.totalTrades) *
          100
        ).toFixed(1)
      : 0;
  const currentTime = Date.now();

  console.log(`🤖 Multi-Crypto Trading Bot Status`);
  console.log(`⏰ ${new Date().toLocaleTimeString()}`);
  console.log(`💰 Threshold: $${PRICE_THRESHOLD} | 🔄 Ref Update: 5min`);
  console.log(`${"=".repeat(90)}`);
  console.log(`📊 OVERALL PERFORMANCE:`);
  console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}`);
  console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}`);
  console.log(`🎯 Net Profit: $${netProfit.toFixed(6)}`);
  console.log(
    `📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`
  );
  console.log(`${"=".repeat(90)}`);

  TRADING_PAIRS.forEach((pair) => {
    const state = tradingState[pair.symbol];
    const currentPrice = prices[pair.symbol];
    const coinStats = overallStats.coinStats[pair.symbol];

    if (currentPrice) {
      const statusEmoji = state.position === "long" ? "🟢" : "🔴";
      const positionText = state.position === "long" ? "HOLDING" : "WAITING";
      const buyPrice = state.buyingPrice
        ? `$${state.buyingPrice.toFixed(6)}`
        : "N/A";
      const coinNetProfit = coinStats.profit - coinStats.loss;
      let waitingTime = "";
      if (state.position === null && state.waitingStartTime) {
        const waitingMs = currentTime - state.waitingStartTime;
        const waitingMinutes = Math.floor(waitingMs / 60000);
        const waitingSeconds = Math.floor((waitingMs % 60000) / 1000);
        waitingTime = `${waitingMinutes}:${waitingSeconds
          .toString()
          .padStart(2, "0")}`;
      }
      console.log(
        `${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(
          7
        )} | Price: $${currentPrice
          .toFixed(6)
          .padEnd(10)} | Ref: ${buyPrice.padEnd(12)} | P/L: $${coinNetProfit
          .toFixed(6)
          .padEnd(10)} | Wait: ${waitingTime} | Qty: ${state.quantity || "N/A"}`
      );
    }
  });
  console.log(`${"=".repeat(90)}`);
  console.log(`📁 Logs saved to: ${logFile}`);
  console.log(`📊 Trades saved to: ${tradesFile}`);
};

// Main monitoring loop
const startTrading = async () => {
  logToFile("🤖 Multi-Crypto Trading Bot Started", "SYSTEM");
  logToFile(
    `📈 Trading pairs: ${TRADING_PAIRS.map((p) => p.name).join(", ")}`,
    "SYSTEM"
  );
  logToFile(`📊 Price threshold: $${PRICE_THRESHOLD}`, "SYSTEM");
  logToFile(
    `🔄 Reference price update interval: ${
      REFERENCE_UPDATE_INTERVAL / 60000
    } minutes`,
    "SYSTEM"
  );
  logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, "SYSTEM");

  // Initial quantity calculation
  const symbols = TRADING_PAIRS.map((pair) => pair.symbol);
  let prices = await getMultiplePrices(symbols);
  if (!prices || !(await calculateQuantities(prices))) {
    logToFile("Failed to initialize quantities. Stopping bot.", "ERROR");
    process.exit(1);
  }

  while (true) {
    try {
      prices = await getMultiplePrices(symbols);
      if (prices) {
        displayStatus(prices);
        for (const pair of TRADING_PAIRS) {
          const currentPrice = prices[pair.symbol];
          if (currentPrice) {
            await executeTradingLogic(
              pair.symbol,
              currentPrice,
              tradingState[pair.symbol]
            );
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    } catch (error) {
      logToFile(`Error in trading loop: ${error.message}`, "ERROR");
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
};

// Display detailed portfolio and profit summary
const showDetailedSummary = async () => {
  try {
    console.log(`\n📊 DETAILED PORTFOLIO & PROFIT SUMMARY:`);
    console.log(`${"=".repeat(90)}`);
    const netProfit = overallStats.totalProfit - overallStats.totalLoss;
    const winRate =
      overallStats.totalTrades > 0
        ? (
            (overallStats.profitableTrades / overallStats.totalTrades) *
            100
          ).toFixed(1)
        : 0;
    let message =
      `📊 DETAILED PORTFOLIO & PROFIT SUMMARY:\n` +
      `${"=".repeat(50)}\n` +
      `🎯 OVERALL PERFORMANCE:\n` +
      `💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}\n` +
      `💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}\n` +
      `🎯 Net Profit: $${netProfit.toFixed(6)}\n` +
      `📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})\n` +
      `${"=".repeat(50)}\n`;
    for (const pair of TRADING_PAIRS) {
      const balance = await getBalance(pair.asset);
      const state = tradingState[pair.symbol];
      const coinStats = overallStats.coinStats[pair.symbol];
      const coinNetProfit = coinStats.profit - coinStats.loss;
      const coinWinRate =
        coinStats.trades > 0
          ? ((coinStats.profitableTrades / coinStats.trades) * 100).toFixed(1)
          : 0;
      console.log(
        `${pair.name.padEnd(12)}: ${balance.toFixed(6)} ${pair.asset.padEnd(
          4
        )} | Status: ${(state.position || "None").padEnd(
          7
        )} | P/L: $${coinNetProfit
          .toFixed(6)
          .padEnd(10)} | Win: ${coinWinRate}% (${coinStats.profitableTrades}/${
          coinStats.trades
        })`
      );
      message +=
        `${pair.name}: ${balance.toFixed(6)} ${pair.asset} | ` +
        `Status: ${state.position || "None"} | ` +
        `P/L: $${coinNetProfit.toFixed(6)} | ` +
        `Win: ${coinWinRate}% (${coinStats.profitableTrades}/${coinStats.trades})\n`;
    }
    console.log(`${"=".repeat(90)}`);
    console.log(`📁 All data saved to logs folder`);
    sendTelegram(message);
    saveProfitSummary();
  } catch (error) {
    logToFile(`Error getting portfolio summary: ${error.message}`, "ERROR");
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logToFile("🛑 Trading bot stopped by user", "SYSTEM");
  await showDetailedSummary();
  process.exit(0);
});

// Start the trading bot
logToFile("🚀 Initializing Multi-Crypto Trading Bot...", "SYSTEM");
startTrading().catch((error) => {
  logToFile(`Fatal error: ${error.message}`, "ERROR");
  process.exit(1);
});
