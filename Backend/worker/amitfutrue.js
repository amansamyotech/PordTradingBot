const Binance = require("node-binance-api");
const TechnicalIndicators = require("technicalindicators");
const fs = require("fs");
// Initialize Binance client
const binance = new Binance().options({
  APIKEY: "6bd1UA2kXR2lgLPv1pt9bNEOJE70h1MbXMvmoH1SceWUNw0kvXAQEdigQUgfNprI",
  APISECRET: "4zHQjwWb8AopnJx0yPjTKBNpW3ntoLaNK7PnbJjxwoB8ZSeaAaGTRLdIKLsixmPR",
  futures: true, // Enable futures API
  test: process.env.TESTNET === "true", // Enable testnet mode
});
// Configuration
const config = {
  symbol: "DOGEUSDT",
  fastPeriod: 5, // Fast SMA period
  slowPeriod: 20, // Slow SMA period
  interval: "15m", // Candle interval
  riskPercentage: 1, // Risk per trade (% of balance)
  stopLossPercent: 2, // Stop loss percentage
  takeProfitPercent: 1, // Take profit percentage
  leverage: 10, // Trading leverage
  logFile: "trades.log",
};
// Trading state
const state = {
  position: {
    isOpen: false,
    side: null, // 'LONG' or 'SHORT'
    entryPrice: 0,
    quantity: 0,
    stopLoss: 0,
    takeProfit: 0,
  },
  indicators: {
    fastSMA: new TechnicalIndicators.SMA({
      period: config.fastPeriod,
      values: [],
    }),
    slowSMA: new TechnicalIndicators.SMA({
      period: config.slowPeriod,
      values: [],
    }),
  },
  candles: [],
  balance: 0,
};
// Initialize logger
const logger = {
  log: (message) => {
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(config.logFile, logEntry);
    console.log(logEntry.trim());
  },
  error: (error) => {
    const errorEntry = `[${new Date().toISOString()}] ERROR: ${error}\n`;
    fs.appendFileSync(config.logFile, errorEntry);
    console.error(errorEntry.trim());
  },
};
// Initialize bot
async function initializeBot() {
  try {
    logger.log(":rocket: Initializing trading bot...");
    // Set leverage
    await binance.futuresLeverage(config.symbol, config.leverage);
    logger.log(`:bar_chart: Leverage set to ${config.leverage}x`);
    // Fetch account balance
    const balances = await binance.futuresBalance();
    const usdtBalance = balances.find(
      (b) => b.asset === "USDT"
    ).availableBalance;
    state.balance = parseFloat(usdtBalance);
    logger.log(`:moneybag: Account balance: ${state.balance} USDT`);
    // Fetch historical candles
    logger.log(
      `:chart_with_upwards_trend: Fetching ${
        config.slowPeriod * 3
      } historical candles...`
    );
    const historical = await binance.futuresCandles(
      config.symbol,
      config.interval,
      { limit: config.slowPeriod * 3 }
    );
    state.candles = historical
      .map((c) => ({
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        time: new Date(c[0]),
        closed: true,
      }))
      .reverse();
    logger.log(
      `:white_check_mark: Loaded ${state.candles.length} historical candles`
    );
    // Start WebSocket
    startWebSocket();
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}
// Start WebSocket for real-time data
function startWebSocket() {
  binance.futuresWS.candles(config.symbol, config.interval, (candle) => {
    try {
      if (candle.k.x) {
        // Candle closed
        processNewCandle({
          open: parseFloat(candle.k.o),
          high: parseFloat(candle.k.h),
          low: parseFloat(candle.k.l),
          close: parseFloat(candle.k.c),
          volume: parseFloat(candle.k.v),
          time: new Date(candle.k.T),
          closed: true,
        });
      }
    } catch (error) {
      logger.error(`WebSocket error: ${error.message}`);
    }
  });
  logger.log(`:ear: Listening for real-time ${config.symbol} data...`);
  checkOpenPosition();
}
// Process new candle
function processNewCandle(candle) {
  // Add new candle and maintain fixed size
  state.candles.push(candle);
  if (state.candles.length > config.slowPeriod * 3) {
    state.candles.shift();
  }
  // Update indicators
  const closes = state.candles.map((c) => c.close);
  const fastSMA = state.indicators.fastSMA.nextValue(closes);
  const slowSMA = state.indicators.slowSMA.nextValue(closes);
  // Need at least 2 values for crossover detection
  if (!fastSMA || fastSMA.length < 2 || !slowSMA || slowSMA.length < 2) return;
  const currentFast = fastSMA[fastSMA.length - 1];
  const previousFast = fastSMA[fastSMA.length - 2];
  const currentSlow = slowSMA[slowSMA.length - 1];
  const previousSlow = slowSMA[slowSMA.length - 2];
  // Generate signals
  const goldenCross = previousFast < previousSlow && currentFast > currentSlow;
  const deathCross = previousFast > previousSlow && currentFast < currentSlow;
  logger.log(
    `:bar_chart: Indicators: FAST ${currentFast.toFixed(
      5
    )} | SLOW ${currentSlow.toFixed(5)}`
  );
  // Trading logic - only act if no position is open
  if (!state.position.isOpen) {
    if (goldenCross) {
      openPosition("LONG", candle.close);
    } else if (deathCross) {
      openPosition("SHORT", candle.close);
    }
  } else {
    // Check if we hit stop loss or take profit
    checkPositionExit(candle);
  }
}
// Open new position
async function openPosition(side, currentPrice) {
  try {
    // Calculate position size based on risk
    const riskAmount = state.balance * (config.riskPercentage / 100);
    const quantity = calculatePositionSize(riskAmount, currentPrice);
    // Set stop loss and take profit
    const stopLoss =
      side === "LONG"
        ? currentPrice * (1 - config.stopLossPercent / 100)
        : currentPrice * (1 + config.stopLossPercent / 100);
    const takeProfit =
      side === "LONG"
        ? currentPrice * (1 + config.takeProfitPercent / 100)
        : currentPrice * (1 - config.takeProfitPercent / 100);
    // Place order
    const order =
      side === "LONG"
        ? await binance.futuresMarketBuy(config.symbol, quantity)
        : await binance.futuresMarketSell(config.symbol, quantity);
    // Update state
    state.position = {
      isOpen: true,
      side,
      entryPrice: parseFloat(order.avgPrice),
      quantity,
      stopLoss,
      takeProfit,
    };
    logger.log(`:rocket: ${side} POSITION OPENED`);
    logger.log(`:arrow_upper_right: Entry: ${state.position.entryPrice}`);
    logger.log(`:no_entry: Stop: ${state.position.stopLoss}`);
    logger.log(`:dart: Target: ${state.position.takeProfit}`);
    logger.log(`:package: Quantity: ${state.position.quantity} DOGE`);
  } catch (error) {
    logger.error(`Failed to open position: ${error.body || error.message}`);
  }
}
// Check if position should be closed
async function checkPositionExit(candle) {
  const { high, low } = candle;
  const { stopLoss, takeProfit, side } = state.position;
  const hitStopLoss =
    (side === "LONG" && low <= stopLoss) ||
    (side === "SHORT" && high >= stopLoss);
  const hitTakeProfit =
    (side === "LONG" && high >= takeProfit) ||
    (side === "SHORT" && low <= takeProfit);
  const deathCross =
    side === "LONG" &&
    state.indicators.fastSMA.result < state.indicators.slowSMA.result;
  const goldenCross =
    side === "SHORT" &&
    state.indicators.fastSMA.result > state.indicators.slowSMA.result;
  if (hitStopLoss || hitTakeProfit || deathCross || goldenCross) {
    await closePosition(
      hitStopLoss ? "STOP_LOSS" : hitTakeProfit ? "TAKE_PROFIT" : "SIGNAL"
    );
  }
}
// Close open position
async function closePosition(reason) {
  try {
    const { quantity, side } = state.position;
    const order =
      side === "LONG"
        ? await binance.futuresMarketSell(config.symbol, quantity)
        : await binance.futuresMarketBuy(config.symbol, quantity);
    const exitPrice = parseFloat(order.avgPrice);
    const pnl =
      side === "LONG"
        ? (exitPrice - state.position.entryPrice) * quantity
        : (state.position.entryPrice - exitPrice) * quantity;
    // Update balance
    state.balance += pnl;
    logger.log(`:lock: POSITION CLOSED (${reason})`);
    logger.log(`:arrow_lower_right: Exit: ${exitPrice}`);
    logger.log(`:moneybag: PnL: ${pnl.toFixed(2)} USDT`);
    logger.log(`:bar_chart: New Balance: ${state.balance.toFixed(2)} USDT`);
    // Reset position
    state.position = {
      isOpen: false,
      side: null,
      entryPrice: 0,
      quantity: 0,
      stopLoss: 0,
      takeProfit: 0,
    };
  } catch (error) {
    logger.error(`Failed to close position: ${error.body || error.message}`);
  }
}
// Periodically check open position status
async function checkOpenPosition() {
  setInterval(async () => {
    if (!state.position.isOpen) return;
    try {
      const positionInfo = await binance.futuresPositionRisk({
        symbol: config.symbol,
      });
      const position = positionInfo.find((p) => p.positionAmt != 0);
      if (!position) {
        logger.log(
          ":warning: Position not found on exchange, resetting local state"
        );
        state.position.isOpen = false;
        return;
      }
      // Update unrealized PnL
      const unrealizedPnl = parseFloat(position.unRealizedProfit);
      logger.log(
        `:bar_chart: Unrealized PnL: ${unrealizedPnl.toFixed(2)} USDT`
      );
    } catch (error) {
      logger.error(`Position check error: ${error.message}`);
    }
  }, 30000); // Check every 30 seconds
}
// Calculate position size
function calculatePositionSize(riskAmount, entryPrice) {
  const dollarRisk = riskAmount;
  const priceRisk = entryPrice * (config.stopLossPercent / 100);
  const quantity = dollarRisk / priceRisk;
  return Math.floor(quantity); // Whole DOGE coins
}
// Run bot
initializeBot();
// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.log(":octagonal_sign: Shutting down bot...");
  // Close open position if exists
  if (state.position.isOpen) {
    logger.log(":warning: Closing open position before exit");
    await closePosition("SHUTDOWN");
  }
  process.exit();
});
