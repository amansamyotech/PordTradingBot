const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("../services/telegramService");

const apiKey =
  "VdE7IrcWyAHA9sk6ZA3bqjrgK6CiJPYN9syZO5Glqk0LJOF5p3d5dgMWdTjL9ENC";
const apiSecret =
  "MKvMiyekLaXCJqALjyv7jq0PjHv7v1ruZnf69MTWxxCmnS20G7ZxyAPkdV7o1ojC";

// const TRADING_PAIRS = [
//   { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
//   { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
//   { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe Coin" },
//   { symbol: "BONKUSDT", asset: "BONK", name: "Bonk" },
//   { symbol: "FLOKIUSDT", asset: "FLOKI", name: "Floki Inu" },
// ];

const TRADING_PAIRS = ["SOLUSDT", "SHIBUSDT", "DOGEUSDT", "ETHUSDT", "BTCUSDT"];

const ROI_PERCENTAGE = 2; // 2% ROI target
const CHECK_INTERVAL = 5000; // Check every 5 seconds

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
  initialBalance: 0,
  currentBalance: 0,
};

// Initialize trading state and coin stats
TRADING_PAIRS.forEach((pair) => {
  tradingState[pair.symbol] = {
    buyPrice: null,
    sellPrice: null,
    position: null,
    isTrading: false,
    name: pair.name,
    asset: pair.asset,
    allocatedAmount: 0,
    quantity: 0,
    targetSellPrice: null,
  };

  overallStats.coinStats[pair.symbol] = {
    name: pair.name,
    profit: 0,
    loss: 0,
    trades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    currentHolding: 0,
    allocatedUSDT: 0,
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
  if (["TRADE", "PROFIT", "ERROR", "SYSTEM", "BALANCE"].includes(type)) {
    sendTelegram(`[${type}] ${message}`);
  }
};

// Save trade to JSON file
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
};

// Save profit summary to file
const saveProfitSummary = () => {
  fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
};

// Update profit/loss statistics
const updateProfitStats = (symbol, profit, buyPrice, sellPrice, quantity) => {
  const coinStats = overallStats.coinStats[symbol];
  const state = tradingState[symbol];

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
    quantity: quantity,
    roiPercentage: (((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2),
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
    `💰 TRADE COMPLETED: ${coinStats.name}\n` +
    `Buy: $${buyPrice.toFixed(6)} | Sell: $${sellPrice.toFixed(6)}\n` +
    `ROI: ${(((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2)}%\n` +
    `Profit: $${profit.toFixed(6)}\n` +
    `Total Net: $${netProfit.toFixed(6)} | Win Rate: ${winRate}%`;

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

// Function to get current price for a symbol
const getCurrentPrice = async (symbol) => {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );
    return parseFloat(response.data.price);
  } catch (error) {
    logToFile(`Error getting price for ${symbol}: ${error.message}`, "ERROR");
    return null;
  }
};

// Function to get prices for multiple symbols
// const getMultiplePrices = async (symbols) => {
//   try {
//     const symbolsParam = symbols.map((s) => `"${s}"`).join(",");
//     const params = { symbols: `[${symbolsParam}]` };
//     const response = await axios.get(
//       "https://api.binance.com/api/v3/ticker/price",
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

const getMultiplePrices = async (symbols) => {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price"
    );
    const prices = {};
    response.data.forEach((item) => {
      if (symbols.includes(item.symbol)) {
        prices[item.symbol] = parseFloat(item.price);
      }
    });
    return prices;
  } catch (error) {
    logToFile(`Error getting prices: ${error.message}`, "ERROR");
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

// Function to get all account balances
const getAllBalances = async () => {
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

    return response.data.balances;
  } catch (error) {
    logToFile(`Error getting all balances: ${error.message}`, "ERROR");
    return [];
  }
};

// Function to get symbol step size (lot size) for quantity precision
// const getSymbolStepSize = async (symbol) => {
//   try {
//     const response = await axios.get(
//       "https://api.binance.com/api/v3/exchangeInfo",
//       { params: { symbol } }
//     );
//     const symbolInfo = response.data.symbols[0];
//     const quantityPrecision = symbolInfo.quantityPrecision;
//     return parseFloat(`0.${"0".repeat(quantityPrecision - 1)}1`);
//   } catch (error) {
//     logToFile(`Error getting symbol info for ${symbol}: ${error.message}`, "ERROR");
//     return 0.00000001;
//   }
// };
const getSymbolFilters = async (symbol) => {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/exchangeInfo"
    );
    const symbolInfo = response.data.symbols.find(
      (s) => s.symbol === symbol.toUpperCase()
    );

    if (!symbolInfo) {
      logToFile(`Symbol info not found for ${symbol}`, "ERROR");
      return {
        stepSize: 0.000001,
        minQty: 0,
        minNotional: 0,
        quantityPrecision: 6,
      };
    }

    const lotSizeFilter = symbolInfo.filters.find(
      (f) => f.filterType === "LOT_SIZE"
    );
    const notionalFilter = symbolInfo.filters.find(
      (f) => f.filterType === "MIN_NOTIONAL"
    );

    return {
      stepSize: parseFloat(lotSizeFilter.stepSize),
      minQty: parseFloat(lotSizeFilter.minQty),
      minNotional: parseFloat(notionalFilter.minNotional),
      quantityPrecision: symbolInfo.quantityPrecision || 6,
    };
  } catch (error) {
    logToFile(
      `Error fetching filters for ${symbol}: ${error.message}`,
      "ERROR"
    );
    return {
      stepSize: 0.000001,
      minQty: 0,
      minNotional: 0,
      quantityPrecision: 6,
    };
  }
};
// Function to display current balances and allocate funds
const initializeBalanceAllocation = async () => {
  logToFile("🔍 Getting current account balances...", "SYSTEM");

  const balances = await getAllBalances();
  const usdtBalance = await getBalance("USDT");

  // Calculate current portfolio value
  let totalPortfolioValue = usdtBalance;
  const prices = await getMultiplePrices(TRADING_PAIRS.map((p) => p.symbol));

  let balanceMessage = `💰 CURRENT ACCOUNT BALANCES:\n`;
  balanceMessage += `USDT: ${usdtBalance.toFixed(6)}\n`;

  for (const pair of TRADING_PAIRS) {
    const balance = await getBalance(pair.asset);
    const currentPrice = prices[pair.symbol];
    const usdtValue = balance * currentPrice;
    totalPortfolioValue += usdtValue;

    overallStats.coinStats[pair.symbol].currentHolding = balance;

    balanceMessage += `${pair.asset}: ${balance.toFixed(
      6
    )} (~$${usdtValue.toFixed(6)})\n`;
  }

  balanceMessage += `\nTotal Portfolio Value: $${totalPortfolioValue.toFixed(
    6
  )}\n`;
  balanceMessage += `Allocation per coin: $${(
    totalPortfolioValue / TRADING_PAIRS.length
  ).toFixed(6)}`;

  logToFile(balanceMessage, "BALANCE");

  // Set allocation amounts
  const allocationPerCoin = totalPortfolioValue / TRADING_PAIRS.length;

  for (const pair of TRADING_PAIRS) {
    tradingState[pair.symbol].allocatedAmount = allocationPerCoin;
    overallStats.coinStats[pair.symbol].allocatedUSDT = allocationPerCoin;
  }

  overallStats.initialBalance = totalPortfolioValue;
  overallStats.currentBalance = totalPortfolioValue;

  return totalPortfolioValue;
};

// Trading logic for a single pair
// const executeTradingLogic = async (symbol, currentPrice, state) => {
//   if (state.isTrading) return;

//   const coinStats = overallStats.coinStats[symbol];

//   // If we don't have a position, check if we should buy
//   if (state.position === null) {
//     // Check if we have enough USDT to buy
//     const usdtBalance = await getBalance("USDT");
//     const requiredAmount = state.allocatedAmount * 0.99; // Use 99% to account for fees

//     if (usdtBalance >= requiredAmount) {
//       state.isTrading = true;

//       // Calculate quantity based on allocated amount
//       const stepSize = await getSymbolStepSize(symbol);
//       let quantity = requiredAmount / currentPrice;
//       quantity = Math.floor(quantity / stepSize) * stepSize;

//       if (quantity > 0) {
//         const order = await placeOrder(symbol, "BUY", quantity);
//         if (order) {
//           state.position = "long";
//           state.buyPrice = currentPrice;
//           state.quantity = quantity;
//           state.targetSellPrice = currentPrice * (1 + ROI_PERCENTAGE / 100);

//           logToFile(
//             `✅ BOUGHT ${quantity} ${state.name} at $${currentPrice.toFixed(6)}`,
//             "TRADE"
//           );
//           logToFile(
//             `🎯 Target sell price: $${state.targetSellPrice.toFixed(6)} (${ROI_PERCENTAGE}% ROI)`,
//             "TRADE"
//           );

//           saveTradeToFile({
//             symbol: symbol,
//             coin: state.name,
//             action: "BUY",
//             price: currentPrice,
//             quantity: quantity,
//             targetSellPrice: state.targetSellPrice,
//           });
//         }
//       }
//       state.isTrading = false;
//     }
//   }
//   // If we have a position, check if we should sell
//   else if (state.position === "long" && state.targetSellPrice) {
//     if (currentPrice >= state.targetSellPrice) {
//       state.isTrading = true;

//       // Check actual balance before selling
//       const assetBalance = await getBalance(state.asset);
//       const sellQuantity = Math.min(assetBalance, state.quantity);

//       if (sellQuantity > 0) {
//         const order = await placeOrder(symbol, "SELL", sellQuantity);
//         if (order) {
//           const profit = (currentPrice - state.buyPrice) * sellQuantity;
//           const roiAchieved = ((currentPrice - state.buyPrice) / state.buyPrice * 100);

//           logToFile(
//             `✅ SOLD ${sellQuantity} ${state.name} at $${currentPrice.toFixed(6)}`,
//             "TRADE"
//           );
//           logToFile(
//             `💰 ROI Achieved: ${roiAchieved.toFixed(2)}% | Profit: $${profit.toFixed(6)}`,
//             "PROFIT"
//           );

//           updateProfitStats(symbol, profit, state.buyPrice, currentPrice, sellQuantity);

//           // Reset for next trade
//           state.position = null;
//           state.buyPrice = null;
//           state.quantity = 0;
//           state.targetSellPrice = null;
//         }
//       }
//       state.isTrading = false;
//     }
//   }
// };

const executeTradingLogic = async (symbol, currentPrice, state) => {
  if (state.isTrading) return;
  const coinStats = overallStats.coinStats[symbol];

  if (state.position === null) {
    const usdtBalance = await getBalance("USDT");
    const requiredAmount = (usdtBalance * 0.9) / TRADING_PAIRS.length; // Use 90% of balance evenly split

    if (usdtBalance >= requiredAmount) {
      state.isTrading = true;

      const { stepSize, minQty, minNotional } = await getSymbolFilters(symbol);
      let quantity = requiredAmount / currentPrice;
      quantity = Math.floor(quantity / stepSize) * stepSize;

      const notional = quantity * currentPrice;

      if (quantity < minQty || notional < minNotional) {
        logToFile(
          `Skipping ${symbol} - Quantity ${quantity} or Notional $${notional.toFixed(
            6
          )} below minimum`,
          "SYSTEM"
        );
        state.isTrading = false;
        return;
      }

      const order = await placeOrder(symbol, "BUY", quantity);
      if (order) {
        state.position = "long";
        state.buyPrice = currentPrice;
        state.quantity = quantity;
        state.targetSellPrice = currentPrice * (1 + ROI_PERCENTAGE / 100);

        logToFile(
          `✅ BOUGHT ${quantity} ${state.name} at $${currentPrice.toFixed(6)}`,
          "TRADE"
        );
        logToFile(
          `🎯 Target sell price: $${state.targetSellPrice.toFixed(
            6
          )} (${ROI_PERCENTAGE}% ROI)`,
          "TRADE"
        );

        saveTradeToFile({
          symbol: symbol,
          coin: state.name,
          action: "BUY",
          price: currentPrice,
          quantity: quantity,
          targetSellPrice: state.targetSellPrice,
        });
      }

      state.isTrading = false;
    }
  } else if (state.position === "long" && state.targetSellPrice) {
    if (currentPrice >= state.targetSellPrice) {
      state.isTrading = true;
      const assetBalance = await getBalance(state.asset);
      const sellQuantity = Math.min(assetBalance, state.quantity);

      if (sellQuantity > 0) {
        const order = await placeOrder(symbol, "SELL", sellQuantity);
        if (order) {
          const profit = (currentPrice - state.buyPrice) * sellQuantity;
          const roiAchieved =
            ((currentPrice - state.buyPrice) / state.buyPrice) * 100;

          logToFile(
            `✅ SOLD ${sellQuantity} ${state.name} at $${currentPrice.toFixed(
              6
            )}`,
            "TRADE"
          );
          logToFile(
            `💰 ROI Achieved: ${roiAchieved.toFixed(
              2
            )}% | Profit: $${profit.toFixed(6)}`,
            "PROFIT"
          );

          updateProfitStats(
            symbol,
            profit,
            state.buyPrice,
            currentPrice,
            sellQuantity
          );

          state.position = null;
          state.buyPrice = null;
          state.quantity = 0;
          state.targetSellPrice = null;
        }
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

  console.log(`🤖 Crypto Trading Bot - ${ROI_PERCENTAGE}% ROI Strategy`);
  console.log(`⏰ ${new Date().toLocaleTimeString()}`);
  console.log(
    `🎯 Target ROI: ${ROI_PERCENTAGE}% | 🔄 Check: ${CHECK_INTERVAL}ms`
  );
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
      const buyPrice = state.buyPrice ? `$${state.buyPrice.toFixed(6)}` : "N/A";
      const targetPrice = state.targetSellPrice
        ? `$${state.targetSellPrice.toFixed(6)}`
        : "N/A";
      const coinNetProfit = coinStats.profit - coinStats.loss;

      let progressBar = "";
      if (
        state.position === "long" &&
        state.buyPrice &&
        state.targetSellPrice
      ) {
        const progress = Math.min(
          100,
          Math.max(
            0,
            ((currentPrice - state.buyPrice) /
              (state.targetSellPrice - state.buyPrice)) *
              100
          )
        );
        const filled = Math.floor(progress / 10);
        progressBar = `[${"█".repeat(filled)}${"░".repeat(
          10 - filled
        )}] ${progress.toFixed(1)}%`;
      }

      console.log(
        `${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(
          7
        )} | ` +
          `Price: $${currentPrice.toFixed(6).padEnd(10)} | ` +
          `Buy: ${buyPrice.padEnd(12)} | Target: ${targetPrice.padEnd(12)} | ` +
          `P/L: $${coinNetProfit.toFixed(6).padEnd(10)} | ${progressBar}`
      );
    }
  });

  console.log(`${"=".repeat(90)}`);
  console.log(`📁 Logs: ${logFile}`);
  console.log(`📊 Trades: ${tradesFile}`);
};

// Main trading loop
const startTrading = async () => {
  logToFile("🚀 Starting 2% ROI Trading Bot...", "SYSTEM");

  // Initialize balance allocation
  const totalBalance = await initializeBalanceAllocation();
  if (totalBalance === 0) {
    logToFile("❌ No balance found. Cannot start trading.", "ERROR");
    return;
  }

  logToFile(
    `📊 Trading pairs: ${TRADING_PAIRS.map((p) => p.name).join(", ")}`,
    "SYSTEM"
  );
  logToFile(`🎯 ROI target: ${ROI_PERCENTAGE}%`, "SYSTEM");
  logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, "SYSTEM");

  const symbols = TRADING_PAIRS.map((pair) => pair.symbol);

  while (true) {
    try {
      const prices = await getMultiplePrices(symbols);
      if (prices) {
        displayStatus(prices);

        // Execute trading logic for each pair
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

// Display detailed summary
const showDetailedSummary = async () => {
  console.log(`\n📊 DETAILED TRADING SUMMARY:`);
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
    `📊 FINAL TRADING SUMMARY:\n` +
    `💰 Total Profit: $${overallStats.totalProfit.toFixed(6)}\n` +
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
      )} | ` +
        `Status: ${(state.position || "None").padEnd(7)} | ` +
        `P/L: $${coinNetProfit.toFixed(6).padEnd(10)} | ` +
        `Win: ${coinWinRate}% (${coinStats.profitableTrades}/${coinStats.trades})`
    );

    message +=
      `${pair.name}: ${balance.toFixed(6)} ${pair.asset} | ` +
      `P/L: $${coinNetProfit.toFixed(6)} | Win: ${coinWinRate}%\n`;
  }

  sendTelegram(message);
  saveProfitSummary();
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logToFile("🛑 Trading bot stopped by user", "SYSTEM");
  await showDetailedSummary();
  process.exit(0);
});

// Start the bot
startTrading().catch((error) => {
  logToFile(`Fatal error: ${error.message}`, "ERROR");
  process.exit(1);
});
