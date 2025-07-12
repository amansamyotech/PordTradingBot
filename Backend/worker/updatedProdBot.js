const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("../services/telegramService");

const apiKey =
  "VdE7IrcWyAHA9sk6ZA3bqjrgK6CiJPYN9syZO5Glqk0LJOF5p3d5dgMWdTjL9ENC";
const apiSecret =
  "MKvMiyekLaXCJqALjyv7jq0PjHv7v1ruZnf69MTWxxCmnS20G7ZxyAPkdV7o1ojC";

// Trading pairs configuration
const TRADING_PAIRS = [
  { symbol: "SOLUSDT", asset: "SOL", name: "Solana" },
  { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu" },
  { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin" },
  { symbol: "ETHUSDT", asset: "ETH", name: "Ethereum" },
  { symbol: "BTCUSDT", asset: "BTC", name: "Bitcoin" },
];

const ROI_PERCENTAGE = 2; // 2% ROI target
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const MIN_USDT_PER_TRADE = 1; // Minimum USDT per trade (above Binance minimum)

// Create logs directory
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
    lastTradeTime: 0,
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

// Function to place a market order with better error handling
const placeOrder = async (symbol, side, quantity) => {
  try {
    // Round quantity to avoid precision issues
    const roundedQuantity = parseFloat(quantity.toFixed(8));

    const params = {
      symbol: symbol,
      side: side,
      type: "MARKET",
      quantity: roundedQuantity,
      timestamp: Date.now(),
    };

    const signature = generateSignature(params, apiSecret);
    params.signature = signature;

    logToFile(
      `Placing ${side} order: ${symbol} quantity: ${roundedQuantity}`,
      "TRADE"
    );

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

    logToFile(
      `Order placed successfully: ${JSON.stringify(response.data)}`,
      "TRADE"
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

// Function to get symbol filters for proper quantity formatting
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
        minNotional: 10,
        quantityPrecision: 6,
      };
    }

    const lotSizeFilter = symbolInfo.filters.find(
      (f) => f.filterType === "LOT_SIZE"
    );
    const notionalFilter = symbolInfo.filters.find(
      (f) => f.filterType === "NOTIONAL"
    );

    return {
      stepSize: parseFloat(lotSizeFilter?.stepSize || 0.000001),
      minQty: parseFloat(lotSizeFilter?.minQty || 0),
      minNotional: parseFloat(notionalFilter?.minNotional || 10),
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
      minNotional: 10,
      quantityPrecision: 6,
    };
  }
};

// Function to format quantity according to symbol rules
const formatQuantity = (quantity, stepSize, precision) => {
  const factor = 1 / stepSize;
  const rounded = Math.floor(quantity * factor) / factor;
  return parseFloat(rounded.toFixed(precision));
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
  balanceMessage += `Available for trading: $${usdtBalance.toFixed(6)}`;

  logToFile(balanceMessage, "BALANCE");

  overallStats.initialBalance = totalPortfolioValue;
  overallStats.currentBalance = totalPortfolioValue;

  return usdtBalance;
};

// Main trading logic - simplified and more robust
const executeTradingLogic = async (symbol, currentPrice, state) => {
  if (state.isTrading) return;

  const now = Date.now();
  // Prevent rapid trading - wait at least 30 seconds between trades
  if (now - state.lastTradeTime < 30000) return;

  const coinStats = overallStats.coinStats[symbol];

  try {
    // If no position, try to buy
    if (state.position === null) {
      const usdtBalance = await getBalance("USDT");

      // Calculate how much to invest per coin (split available balance)
      const investmentAmount = Math.max(
        MIN_USDT_PER_TRADE,
        usdtBalance / TRADING_PAIRS.length
      );

      // Only trade if we have enough balance
      if (
        usdtBalance >= investmentAmount &&
        investmentAmount >= MIN_USDT_PER_TRADE
      ) {
        state.isTrading = true;
        state.lastTradeTime = now;

        // Get symbol filters for proper quantity calculation
        const { stepSize, minQty, minNotional, quantityPrecision } =
          await getSymbolFilters(symbol);

        // Calculate quantity
        let quantity = investmentAmount / currentPrice;
        quantity = formatQuantity(quantity, stepSize, quantityPrecision);

        const notionalValue = quantity * currentPrice;

        // Check if trade meets minimum requirements
        if (quantity < minQty || notionalValue < minNotional) {
          logToFile(
            `❌ ${symbol} - Insufficient quantity: ${quantity} (min: ${minQty}) or notional: $${notionalValue.toFixed(
              2
            )} (min: $${minNotional})`,
            "SYSTEM"
          );
          state.isTrading = false;
          return;
        }

        logToFile(
          `🔄 Attempting to buy ${quantity} ${symbol} at $${currentPrice.toFixed(
            6
          )} (Total: $${notionalValue.toFixed(2)})`,
          "TRADE"
        );

        // Place buy order
        const buyOrder = await placeOrder(symbol, "BUY", quantity);

        if (buyOrder && buyOrder.status === "FILLED") {
          // Calculate actual executed price from order
          const executedPrice =
            parseFloat(buyOrder.cummulativeQuoteQty) /
            parseFloat(buyOrder.executedQty);

          state.position = "long";
          state.buyPrice = executedPrice;
          state.quantity = parseFloat(buyOrder.executedQty);
          state.targetSellPrice = executedPrice * (1 + ROI_PERCENTAGE / 100);

          logToFile(
            `✅ BOUGHT ${state.quantity} ${
              state.name
            } at $${executedPrice.toFixed(6)}`,
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
            price: executedPrice,
            quantity: state.quantity,
            targetSellPrice: state.targetSellPrice,
            orderId: buyOrder.orderId,
          });
        } else {
          logToFile(`❌ Failed to buy ${symbol}`, "ERROR");
        }

        state.isTrading = false;
      }
    }
    // If holding position, check if we should sell
    else if (state.position === "long" && state.targetSellPrice) {
      // Check if price reached target
      if (currentPrice >= state.targetSellPrice) {
        state.isTrading = true;
        state.lastTradeTime = now;

        // Get current balance of the asset
        const assetBalance = await getBalance(state.asset);
        const sellQuantity = Math.min(assetBalance, state.quantity);

        if (sellQuantity > 0) {
          logToFile(
            `🔄 Attempting to sell ${sellQuantity} ${symbol} at $${currentPrice.toFixed(
              6
            )}`,
            "TRADE"
          );

          // Place sell order
          const sellOrder = await placeOrder(symbol, "SELL", sellQuantity);

          if (sellOrder && sellOrder.status === "FILLED") {
            // Calculate actual executed price from order
            const executedPrice =
              parseFloat(sellOrder.cummulativeQuoteQty) /
              parseFloat(sellOrder.executedQty);
            const profit =
              (executedPrice - state.buyPrice) *
              parseFloat(sellOrder.executedQty);
            const roiAchieved =
              ((executedPrice - state.buyPrice) / state.buyPrice) * 100;

            logToFile(
              `✅ SOLD ${sellOrder.executedQty} ${
                state.name
              } at $${executedPrice.toFixed(6)}`,
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
              executedPrice,
              parseFloat(sellOrder.executedQty)
            );

            // Reset for next trade
            state.position = null;
            state.buyPrice = null;
            state.quantity = 0;
            state.targetSellPrice = null;
          } else {
            logToFile(`❌ Failed to sell ${symbol}`, "ERROR");
          }
        }

        state.isTrading = false;
      }
    }
  } catch (error) {
    logToFile(
      `Error in trading logic for ${symbol}: ${error.message}`,
      "ERROR"
    );
    state.isTrading = false;
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
  const usdtBalance = await initializeBalanceAllocation();
  if (usdtBalance < MIN_USDT_PER_TRADE) {
    logToFile(
      `❌ Insufficient USDT balance: $${usdtBalance.toFixed(
        6
      )}. Minimum required: $${MIN_USDT_PER_TRADE}`,
      "ERROR"
    );
    return;
  }

  logToFile(
    `📊 Trading pairs: ${TRADING_PAIRS.map((p) => p.name).join(", ")}`,
    "SYSTEM"
  );
  logToFile(`🎯 ROI target: ${ROI_PERCENTAGE}%`, "SYSTEM");
  logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, "SYSTEM");
  logToFile(`💰 Available USDT: $${usdtBalance.toFixed(6)}`, "SYSTEM");

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
