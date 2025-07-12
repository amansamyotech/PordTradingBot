// // const axios = require('axios');
// // const crypto = require('crypto');
// // const fs = require('fs');
// // const path = require('path');

// // // Replace with your actual Binance Testnet API key and secret
// // const apiKey = 'P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8';
// // const apiSecret = 'vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm';

// // // Trading configuration
// // const TRADING_PAIRS = [
// //   { symbol: 'SOLUSDT', asset: 'SOL', quantity: 1, name: 'Solana' },
// //   { symbol: 'SHIBUSDT', asset: 'SHIB', quantity: 100000, name: 'Shiba Inu' },
// //   { symbol: 'DOGEUSDT', asset: 'DOGE', quantity: 100, name: 'Dogecoin' },
// //   { symbol: 'ETHUSDT', asset: 'ETH', quantity: 0.01, name: 'Ethereum' },
// //   { symbol: 'BTCUSDT', asset: 'BTC', quantity: 0.001, name: 'Bitcoin' }
// // ];

// // const PRICE_THRESHOLD = 0.1; // Price difference threshold
// // const CHECK_INTERVAL = 5000; // Check price every 5 seconds

// // // Create logs directory if it doesn't exist
// // const logsDir = path.join(__dirname, 'logs');
// // if (!fs.existsSync(logsDir)) {
// //   fs.mkdirSync(logsDir);
// // }

// // // File paths for logging
// // const today = new Date().toISOString().split('T')[0];
// // const logFile = path.join(logsDir, `trading_log_${today}.txt`);
// // const tradesFile = path.join(logsDir, `trades_${today}.json`);
// // const profitFile = path.join(logsDir, `profit_summary_${today}.json`);

// // // Trading state for each pair
// // const tradingState = {};

// // // Overall profit/loss tracking
// // let overallStats = {
// //   totalProfit: 0,
// //   totalLoss: 0,
// //   totalTrades: 0,
// //   profitableTrades: 0,
// //   losingTrades: 0,
// //   coinStats: {}
// // };

// // // Initialize trading state and coin stats
// // TRADING_PAIRS.forEach(pair => {
// //   tradingState[pair.symbol] = {
// //     buyingPrice: null,
// //     position: null,
// //     isTrading: false,
// //     name: pair.name,
// //     asset: pair.asset,
// //     quantity: pair.quantity
// //   };

// //   overallStats.coinStats[pair.symbol] = {
// //     name: pair.name,
// //     profit: 0,
// //     loss: 0,
// //     trades: 0,
// //     profitableTrades: 0,
// //     losingTrades: 0
// //   };
// // });

// // // Load existing stats if file exists
// // if (fs.existsSync(profitFile)) {
// //   try {
// //     const savedStats = JSON.parse(fs.readFileSync(profitFile, 'utf8'));
// //     overallStats = { ...overallStats, ...savedStats };
// //   } catch (error) {
// //     console.log('Starting with fresh profit tracking');
// //   }
// // }

// // // Logging function
// // const logToFile = (message, type = 'INFO') => {
// //   const timestamp = new Date().toISOString();
// //   const logEntry = `[${timestamp}] [${type}] ${message}\n`;

// //   // Write to file
// //   fs.appendFileSync(logFile, logEntry);

// //   // Also log to console
// //   console.log(message);
// // };

// // // Save trade to JSON file
// // const saveTradeToFile = (tradeData) => {
// //   let trades = [];

// //   if (fs.existsSync(tradesFile)) {
// //     try {
// //       trades = JSON.parse(fs.readFileSync(tradesFile, 'utf8'));
// //     } catch (error) {
// //       trades = [];
// //     }
// //   }

// //   trades.push({
// //     ...tradeData,
// //     timestamp: new Date().toISOString()
// //   });

// //   fs.writeFileSync(tradesFile, JSON.stringify(trades, null, 2));
// // };

// // // Save profit summary to file
// // const saveProfitSummary = () => {
// //   fs.writeFileSync(profitFile, JSON.stringify(overallStats, null, 2));
// // };

// // // Update profit/loss statistics
// // const updateProfitStats = (symbol, profit, buyPrice, sellPrice) => {
// //   const coinStats = overallStats.coinStats[symbol];

// //   overallStats.totalTrades++;
// //   coinStats.trades++;

// //   if (profit > 0) {
// //     overallStats.totalProfit += profit;
// //     overallStats.profitableTrades++;
// //     coinStats.profit += profit;
// //     coinStats.profitableTrades++;
// //   } else {
// //     overallStats.totalLoss += Math.abs(profit);
// //     overallStats.losingTrades++;
// //     coinStats.loss += Math.abs(profit);
// //     coinStats.losingTrades++;
// //   }

// //   // Save trade details
// //   saveTradeToFile({
// //     symbol: symbol,
// //     coin: coinStats.name,
// //     action: 'SELL',
// //     buyPrice: buyPrice,
// //     sellPrice: sellPrice,
// //     profit: profit,
// //     quantity: tradingState[symbol].quantity
// //   });

// //   // Save updated stats
// //   saveProfitSummary();
// // };

// // // Function to generate the signature for Binance API
// // const generateSignature = (params, secret) => {
// //   const queryString = Object.keys(params)
// //     .map((key) => `${key}=${params[key]}`)
// //     .join('&');

// //   return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
// // };

// // // Function to get prices for multiple symbols
// // const getMultiplePrices = async (symbols) => {
// //   try {
// //     const symbolsParam = symbols.map(s => `"${s}"`).join(',');
// //     const params = { symbols: `[${symbolsParam}]` };

// //     const response = await axios.get('https://testnet.binance.vision/api/v3/ticker/price', {
// //       params: params
// //     });

// //     const prices = {};
// //     response.data.forEach(item => {
// //       prices[item.symbol] = parseFloat(item.price);
// //     });

// //     return prices;
// //   } catch (error) {
// //     if (error.response) {
// //       logToFile(`Error getting prices: ${JSON.stringify(error.response.data)}`, 'ERROR');
// //     } else {
// //       logToFile(`Error getting prices: ${error.message}`, 'ERROR');
// //     }
// //     return null;
// //   }
// // };

// // // Function to place a market order
// // const placeOrder = async (symbol, side, quantity) => {
// //   try {
// //     const params = {
// //       symbol: symbol,
// //       side: side,
// //       type: 'MARKET',
// //       quantity: quantity,
// //       timestamp: Date.now()
// //     };

// //     const signature = generateSignature(params, apiSecret);
// //     params.signature = signature;

// //     const response = await axios.post('https://testnet.binance.vision/api/v3/order', null, {
// //       params: params,
// //       headers: {
// //         'X-MBX-APIKEY': apiKey
// //       }
// //     });

// //     return response.data;
// //   } catch (error) {
// //     if (error.response) {
// //       logToFile(`Error placing ${side} order for ${symbol}: ${JSON.stringify(error.response.data)}`, 'ERROR');
// //     } else {
// //       logToFile(`Error placing ${side} order for ${symbol}: ${error.message}`, 'ERROR');
// //     }
// //     return null;
// //   }
// // };

// // // Function to get account balance
// // const getBalance = async (asset) => {
// //   try {
// //     const params = {
// //       timestamp: Date.now()
// //     };

// //     const signature = generateSignature(params, apiSecret);
// //     params.signature = signature;

// //     const response = await axios.get('https://testnet.binance.vision/api/v3/account', {
// //       params: params,
// //       headers: {
// //         'X-MBX-APIKEY': apiKey
// //       }
// //     });

// //     const balance = response.data.balances.find(b => b.asset === asset);
// //     return balance ? parseFloat(balance.free) : 0;
// //   } catch (error) {
// //     return 0;
// //   }
// // };

// // // Trading logic for a single pair
// // const executeTradingLogic = async (symbol, currentPrice, state) => {
// //   if (state.isTrading) return;

// //   if (state.position === null && state.buyingPrice === null) {
// //     state.buyingPrice = currentPrice;
// //     logToFile(`📊 ${state.name} initial reference price set: $${currentPrice}`);
// //     return;
// //   }

// //   if (state.position === null) {
// //     const buyTriggerPrice = state.buyingPrice - PRICE_THRESHOLD;

// //     if (currentPrice <= buyTriggerPrice) {
// //       logToFile(`🔽 ${state.name} price dropped to $${currentPrice} (trigger: $${buyTriggerPrice})`);

// //       state.isTrading = true;
// //       const order = await placeOrder(symbol, 'BUY', state.quantity);

// //       if (order) {
// //         state.position = 'long';
// //         state.buyingPrice = currentPrice;
// //         logToFile(`✅ BOUGHT ${state.quantity} ${state.name} at $${currentPrice}`, 'TRADE');

// //         // Save buy trade
// //         saveTradeToFile({
// //           symbol: symbol,
// //           coin: state.name,
// //           action: 'BUY',
// //           price: currentPrice,
// //           quantity: state.quantity
// //         });
// //       }
// //       state.isTrading = false;
// //     }
// //   } else if (state.position === 'long') {
// //     const sellTriggerPrice = state.buyingPrice + PRICE_THRESHOLD;

// //     if (currentPrice >= sellTriggerPrice) {
// //       logToFile(`🔼 ${state.name} price rose to $${currentPrice} (trigger: $${sellTriggerPrice})`);

// //       state.isTrading = true;
// //       const assetBalance = await getBalance(state.asset);

// //       if (assetBalance >= state.quantity) {
// //         const order = await placeOrder(symbol, 'SELL', state.quantity);

// //         if (order) {
// //           const profit = (currentPrice - state.buyingPrice) * state.quantity;
// //           logToFile(`✅ SOLD ${state.quantity} ${state.name} at $${currentPrice}`, 'TRADE');
// //           logToFile(`💰 ${state.name} Profit: $${profit.toFixed(6)}`, 'PROFIT');

// //           // Update profit statistics
// //           updateProfitStats(symbol, profit, state.buyingPrice, currentPrice);

// //           state.position = null;
// //           state.buyingPrice = currentPrice;
// //         }
// //       } else {
// //         logToFile(`❌ Insufficient ${state.asset} balance: ${assetBalance}`, 'ERROR');
// //       }
// //       state.isTrading = false;
// //     }
// //   }
// // };

// // // Display current status
// // const displayStatus = (prices) => {
// //   console.clear();

// //   const netProfit = overallStats.totalProfit - overallStats.totalLoss;
// //   const winRate = overallStats.totalTrades > 0 ? (overallStats.profitableTrades / overallStats.totalTrades * 100).toFixed(1) : 0;

// //   console.log(`🤖 Multi-Crypto Trading Bot Status`);
// //   console.log(`⏰ ${new Date().toLocaleTimeString()}`);
// //   console.log(`💰 Threshold: $${PRICE_THRESHOLD}`);
// //   console.log(`${'='.repeat(80)}`);
// //   console.log(`📊 OVERALL PERFORMANCE:`);
// //   console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}`);
// //   console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}`);
// //   console.log(`🎯 Net Profit: $${netProfit.toFixed(6)}`);
// //   console.log(`📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`);
// //   console.log(`${'='.repeat(80)}`);

// //   TRADING_PAIRS.forEach(pair => {
// //     const state = tradingState[pair.symbol];
// //     const currentPrice = prices[pair.symbol];
// //     const coinStats = overallStats.coinStats[pair.symbol];

// //     if (currentPrice) {
// //       const statusEmoji = state.position === 'long' ? '🟢' : '🔴';
// //       const positionText = state.position === 'long' ? 'HOLDING' : 'WAITING';
// //       const buyPrice = state.buyingPrice ? `$${state.buyingPrice.toFixed(6)}` : 'N/A';
// //       const coinNetProfit = coinStats.profit - coinStats.loss;

// //       console.log(`${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(7)} | Price: $${currentPrice.toFixed(6).padEnd(10)} | Ref: ${buyPrice.padEnd(12)} | P/L: $${coinNetProfit.toFixed(6)}`);
// //     }
// //   });

// //   console.log(`${'='.repeat(80)}`);
// //   console.log(`📁 Logs saved to: ${logFile}`);
// //   console.log(`📊 Trades saved to: ${tradesFile}`);
// // };

// // // Main monitoring loop
// // const startTrading = async () => {
// //   logToFile('🤖 Multi-Crypto Trading Bot Started', 'SYSTEM');
// //   logToFile(`📈 Trading pairs: ${TRADING_PAIRS.map(p => p.name).join(', ')}`, 'SYSTEM');
// //   logToFile(`📊 Price threshold: $${PRICE_THRESHOLD}`, 'SYSTEM');
// //   logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, 'SYSTEM');

// //   while (true) {
// //     try {
// //       const symbols = TRADING_PAIRS.map(pair => pair.symbol);
// //       const prices = await getMultiplePrices(symbols);

// //       if (prices) {
// //         displayStatus(prices);

// //         for (const pair of TRADING_PAIRS) {
// //           const currentPrice = prices[pair.symbol];
// //           if (currentPrice) {
// //             await executeTradingLogic(pair.symbol, currentPrice, tradingState[pair.symbol]);
// //           }
// //         }
// //       }

// //       await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
// //     } catch (error) {
// //       logToFile(`Error in trading loop: ${error.message}`, 'ERROR');
// //       await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
// //     }
// //   }
// // };

// // // Display detailed portfolio and profit summary
// // const showDetailedSummary = async () => {
// //   try {
// //     console.log(`\n📊 DETAILED PORTFOLIO & PROFIT SUMMARY:`);
// //     console.log(`${'='.repeat(80)}`);

// //     const netProfit = overallStats.totalProfit - overallStats.totalLoss;
// //     const winRate = overallStats.totalTrades > 0 ? (overallStats.profitableTrades / overallStats.totalTrades * 100).toFixed(1) : 0;

// //     console.log(`🎯 OVERALL PERFORMANCE:`);
// //     console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}`);
// //     console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}`);
// //     console.log(`🎯 Net Profit: $${netProfit.toFixed(6)}`);
// //     console.log(`📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`);
// //     console.log(`${'='.repeat(80)}`);

// //     for (const pair of TRADING_PAIRS) {
// //       const balance = await getBalance(pair.asset);
// //       const state = tradingState[pair.symbol];
// //       const coinStats = overallStats.coinStats[pair.symbol];
// //       const coinNetProfit = coinStats.profit - coinStats.loss;
// //       const coinWinRate = coinStats.trades > 0 ? (coinStats.profitableTrades / coinStats.trades * 100).toFixed(1) : 0;

// //       console.log(`${pair.name.padEnd(12)}: ${balance.toFixed(6)} ${pair.asset.padEnd(4)} | Status: ${(state.position || 'None').padEnd(7)} | P/L: $${coinNetProfit.toFixed(6).padEnd(10)} | Win: ${coinWinRate}% (${coinStats.profitableTrades}/${coinStats.trades})`);
// //     }

// //     console.log(`${'='.repeat(80)}`);
// //     console.log(`📁 All data saved to logs folder`);

// //     // Save final summary
// //     saveProfitSummary();

// //   } catch (error) {
// //     logToFile(`Error getting portfolio summary: ${error.message}`, 'ERROR');
// //   }
// // };

// // // Handle graceful shutdown
// // process.on('SIGINT', async () => {
// //   logToFile('🛑 Trading bot stopped by user', 'SYSTEM');
// //   await showDetailedSummary();
// //   process.exit(0);
// // });

// // // Start the trading bot
// // logToFile('🚀 Initializing Multi-Crypto Trading Bot...', 'SYSTEM');
// // startTrading().catch(error => {
// //   logToFile(`Fatal error: ${error.message}`, 'ERROR');
// //   process.exit(1);
// // });

// const axios = require("axios");
// const crypto = require("crypto");
// const fs = require("fs");
// const path = require("path");
// const { sendTelegram } = require("../services/telegramService");

// const apiKey =
//   "P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8";
// const apiSecret =
//   "vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm";

// const TRADING_PAIRS = [
//   {
//     symbol: "PEPEUSDT",
//     asset: "PEPE",
//     name: "Pepe Coin",
//     quantity: 1000000,
//   },
//   {
//     symbol: "BONKUSDT",
//     asset: "BONK",
//     name: "Bonk",
//     quantity: 100000000,
//   },
//   {
//     symbol: "FLOKIUSDT",
//     asset: "FLOKI",
//     name: "Floki Inu",
//     quantity: 5000000,
//   },
//   {
//     symbol: "SHIBUSDT",
//     asset: "SHIB",
//     name: "Shiba Inu",
//     quantity: 1000000000,
//   },
//   {
//     symbol: "DOGEUSDT",
//     asset: "DOGE",
//     name: "Dogecoin",
//     quantity: 1000,
//   },
//   {
//     symbol: "LEVUSDT",
//     asset: "LEV",
//     name: "Lever Token",
//     quantity: 100,
//   },
// ];

// const PRICE_THRESHOLD = 0.1;
// const CHECK_INTERVAL = 5000;
// const REFERENCE_UPDATE_INTERVAL = 5 * 60 * 1000;

// const logsDir = path.join(__dirname, "logs");
// if (!fs.existsSync(logsDir)) {
//   fs.mkdirSync(logsDir);
// }

// // File paths for logging
// const today = new Date().toISOString().split("T")[0];
// const logFile = path.join(logsDir, `trading_log_${today}.txt`);
// const tradesFile = path.join(logsDir, `trades_${today}.json`);
// const profitFile = path.join(logsDir, `profit_summary_${today}.json`);

// // Trading state for each pair
// const tradingState = {};

// // Overall profit/loss tracking
// let overallStats = {
//   totalProfit: 0,
//   totalLoss: 0,
//   totalTrades: 0,
//   profitableTrades: 0,
//   losingTrades: 0,
//   coinStats: {},
// };

// // Initialize trading state and coin stats
// TRADING_PAIRS.forEach((pair) => {
//   tradingState[pair.symbol] = {
//     buyingPrice: null,
//     position: null,
//     isTrading: false,
//     name: pair.name,
//     asset: pair.asset,
//     quantity: pair.quantity,
//     lastReferenceUpdate: null, // Track when reference price was last updated
//     waitingStartTime: null, // Track when waiting started
//   };

//   overallStats.coinStats[pair.symbol] = {
//     name: pair.name,
//     profit: 0,
//     loss: 0,
//     trades: 0,
//     profitableTrades: 0,
//     losingTrades: 0,
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

//   // Write to file
//   fs.appendFileSync(logFile, logEntry);

//   // Also log to console
//   console.log(message);
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

// // Update profit/loss statistics
// const updateProfitStats = (symbol, profit, buyPrice, sellPrice) => {
//   const coinStats = overallStats.coinStats[symbol];

//   overallStats.totalTrades++;
//   coinStats.trades++;

//   if (profit > 0) {
//     overallStats.totalProfit += profit;
//     overallStats.profitableTrades++;
//     coinStats.profit += profit;
//     coinStats.profitableTrades++;
//   } else {
//     overallStats.totalLoss += Math.abs(profit);
//     overallStats.losingTrades++;
//     coinStats.loss += Math.abs(profit);
//     coinStats.losingTrades++;
//   }

//   // Save trade details
//   saveTradeToFile({
//     symbol: symbol,
//     coin: coinStats.name,
//     action: "SELL",
//     buyPrice: buyPrice,
//     sellPrice: sellPrice,
//     profit: profit,
//     quantity: tradingState[symbol].quantity,
//   });

//   // Save updated stats
//   saveProfitSummary();
// };

// // Function to generate the signature for Binance API
// const generateSignature = (params, secret) => {
//   const queryString = Object.keys(params)
//     .map((key) => `${key}=${params[key]}`)
//     .join("&");

//   return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
// };

// // Function to get prices for multiple symbols
// const getMultiplePrices = async (symbols) => {
//   try {
//     const symbolsParam = symbols.map((s) => `"${s}"`).join(",");
//     const params = { symbols: `[${symbolsParam}]` };

//     const response = await axios.get(
//       "https://testnet.binance.vision/api/v3/ticker/price",
//       {
//         params: params,
//       }
//     );

//     const prices = {};
//     response.data.forEach((item) => {
//       prices[item.symbol] = parseFloat(item.price);
//     });

//     return prices;
//   } catch (error) {
//     if (error.response) {
//       logToFile(
//         `Error getting prices: ${JSON.stringify(error.response.data)}`,
//         "ERROR"
//       );
//     } else {
//       logToFile(`Error getting prices: ${error.message}`, "ERROR");
//     }
//     return null;
//   }
// };

// // Function to place a market order
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
//       "https://testnet.binance.vision/api/v3/order",
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
//     if (error.response) {
//       logToFile(
//         `Error placing ${side} order for ${symbol}: ${JSON.stringify(
//           error.response.data
//         )}`,
//         "ERROR"
//       );
//     } else {
//       logToFile(
//         `Error placing ${side} order for ${symbol}: ${error.message}`,
//         "ERROR"
//       );
//     }
//     return null;
//   }
// };

// // Function to get account balance
// const getBalance = async (asset) => {
//   try {
//     const params = {
//       timestamp: Date.now(),
//     };

//     const signature = generateSignature(params, apiSecret);
//     params.signature = signature;

//     const response = await axios.get(
//       "https://testnet.binance.vision/api/v3/account",
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
//     return 0;
//   }
// };

// // Function to check if reference price should be updated
// const shouldUpdateReferencePrice = (state) => {
//   const currentTime = Date.now();

//   // If position is null (waiting to buy) and we have a waiting start time
//   if (state.position === null && state.waitingStartTime) {
//     const waitingTime = currentTime - state.waitingStartTime;
//     return waitingTime >= REFERENCE_UPDATE_INTERVAL;
//   }

//   return false;
// };

// // Trading logic for a single pair
// const executeTradingLogic = async (symbol, currentPrice, state) => {
//   if (state.isTrading) return;

//   const currentTime = Date.now();

//   if (state.position === null && state.buyingPrice === null) {
//     state.buyingPrice = currentPrice;
//     state.lastReferenceUpdate = currentTime;
//     state.waitingStartTime = currentTime;
//     logToFile(`📊 ${state.name} initial reference price set: $${currentPrice}`);
//     return;
//   }

//   if (state.position === null) {
//     // Check if we need to update reference price after 5 minutes of waiting
//     if (shouldUpdateReferencePrice(state)) {
//       const oldPrice = state.buyingPrice;
//       state.buyingPrice = currentPrice;
//       state.lastReferenceUpdate = currentTime;
//       state.waitingStartTime = currentTime; // Reset waiting timer

//       logToFile(
//         `🔄 ${state.name} reference price updated after 5 minutes: $${oldPrice} → $${currentPrice}`,
//         "UPDATE"
//       );

//       // Save reference price update to trades file
//       saveTradeToFile({
//         symbol: symbol,
//         coin: state.name,
//         action: "REF_UPDATE",
//         oldPrice: oldPrice,
//         newPrice: currentPrice,
//         reason: "5_minute_wait",
//       });
//     }

//     const buyTriggerPrice = state.buyingPrice - PRICE_THRESHOLD;

//     if (currentPrice <= buyTriggerPrice) {
//       logToFile(
//         `🔽 ${state.name} price dropped to $${currentPrice} (trigger: $${buyTriggerPrice})`
//       );

//       state.isTrading = true;
//       const order = await placeOrder(symbol, "BUY", state.quantity);

//       if (order) {
//         state.position = "long";
//         state.buyingPrice = currentPrice;
//         state.waitingStartTime = null; // Clear waiting timer when position is taken
//         logToFile(
//           `✅ BOUGHT ${state.quantity} ${state.name} at $${currentPrice}`,
//           "TRADE"
//         );

//         // Save buy trade
//         saveTradeToFile({
//           symbol: symbol,
//           coin: state.name,
//           action: "BUY",
//           price: currentPrice,
//           quantity: state.quantity,
//         });
//       }
//       state.isTrading = false;
//     }
//   } else if (state.position === "long") {
//     const sellTriggerPrice = state.buyingPrice + PRICE_THRESHOLD;

//     if (currentPrice >= sellTriggerPrice) {
//       logToFile(
//         `🔼 ${state.name} price rose to $${currentPrice} (trigger: $${sellTriggerPrice})`
//       );

//       state.isTrading = true;
//       const assetBalance = await getBalance(state.asset);

//       if (assetBalance >= state.quantity) {
//         const order = await placeOrder(symbol, "SELL", state.quantity);

//         if (order) {
//           const profit = (currentPrice - state.buyingPrice) * state.quantity;
//           logToFile(
//             `✅ SOLD ${state.quantity} ${state.name} at $${currentPrice}`,
//             "TRADE"
//           );
//           logToFile(`💰 ${state.name} Profit: $${profit.toFixed(6)}`, "PROFIT");

//           // Update profit statistics
//           updateProfitStats(symbol, profit, state.buyingPrice, currentPrice);

//           state.position = null;
//           state.buyingPrice = currentPrice;
//           state.waitingStartTime = currentTime; // Start waiting timer again
//         }
//       } else {
//         logToFile(
//           `❌ Insufficient ${state.asset} balance: ${assetBalance}`,
//           "ERROR"
//         );
//       }
//       state.isTrading = false;
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
//   const currentTime = Date.now();

//   console.log(`🤖 Multi-Crypto Trading Bot Status`);
//   console.log(`⏰ ${new Date().toLocaleTimeString()}`);
//   console.log(`💰 Threshold: $${PRICE_THRESHOLD} | 🔄 Ref Update: 5min`);
//   console.log(`${"=".repeat(90)}`);
//   console.log(`📊 OVERALL PERFORMANCE:`);
//   console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}`);

//   console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}`);
//   console.log(`🎯 Net Profit: $${netProfit.toFixed(6)}`);
//   console.log(
//     `📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`
//   );
//   console.log(`${"=".repeat(90)}`);

//   TRADING_PAIRS.forEach((pair) => {
//     const state = tradingState[pair.symbol];
//     const currentPrice = prices[pair.symbol];
//     const coinStats = overallStats.coinStats[pair.symbol];

//     if (currentPrice) {
//       const statusEmoji = state.position === "long" ? "🟢" : "🔴";
//       const positionText = state.position === "long" ? "HOLDING" : "WAITING";
//       const buyPrice = state.buyingPrice
//         ? `$${state.buyingPrice.toFixed(6)}`
//         : "N/A";
//       const coinNetProfit = coinStats.profit - coinStats.loss;

//       // Calculate waiting time for display
//       let waitingTime = "";
//       if (state.position === null && state.waitingStartTime) {
//         const waitingMs = currentTime - state.waitingStartTime;
//         const waitingMinutes = Math.floor(waitingMs / 60000);
//         const waitingSeconds = Math.floor((waitingMs % 60000) / 1000);
//         waitingTime = `${waitingMinutes}:${waitingSeconds
//           .toString()
//           .padStart(2, "0")}`;
//       }

//       console.log(
//         `${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(
//           7
//         )} | Price: $${currentPrice
//           .toFixed(6)
//           .padEnd(10)} | Ref: ${buyPrice.padEnd(12)} | P/L: $${coinNetProfit
//           .toFixed(6)
//           .padEnd(10)} | Wait: ${waitingTime}`
//       );
//     }
//   });

//   console.log(`${"=".repeat(90)}`);
//   console.log(`📁 Logs saved to: ${logFile}`);
//   console.log(`📊 Trades saved to: ${tradesFile}`);
// };

// // Main monitoring loop
// const startTrading = async () => {
//   logToFile("🤖 Multi-Crypto Trading Bot Started", "SYSTEM");
//   logToFile(
//     `📈 Trading pairs: ${TRADING_PAIRS.map((p) => p.name).join(", ")}`,
//     "SYSTEM"
//   );
//   logToFile(`📊 Price threshold: $${PRICE_THRESHOLD}`, "SYSTEM");
//   logToFile(
//     `🔄 Reference price update interval: ${
//       REFERENCE_UPDATE_INTERVAL / 60000
//     } minutes`,
//     "SYSTEM"
//   );
//   logToFile(`⏰ Check interval: ${CHECK_INTERVAL}ms`, "SYSTEM");

//   while (true) {
//     try {
//       const symbols = TRADING_PAIRS.map((pair) => pair.symbol);
//       const prices = await getMultiplePrices(symbols);

//       if (prices) {
//         displayStatus(prices);

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

// // Display detailed portfolio and profit summary
// const showDetailedSummary = async () => {
//   try {
//     console.log(`\n📊 DETAILED PORTFOLIO & PROFIT SUMMARY:`);
//     console.log(`${"=".repeat(90)}`);

//     const netProfit = overallStats.totalProfit - overallStats.totalLoss;
//     const winRate =
//       overallStats.totalTrades > 0
//         ? (
//             (overallStats.profitableTrades / overallStats.totalTrades) *
//             100
//           ).toFixed(1)
//         : 0;

//     console.log(`🎯 OVERALL PERFORMANCE:`);
//     console.log(`💚 Total Profit: $${overallStats.totalProfit.toFixed(6)}`);
//     console.log(`💔 Total Loss: $${overallStats.totalLoss.toFixed(6)}`);
//     console.log(`🎯 Net Profit: $${netProfit.toFixed(6)}`);
//     console.log(
//       `📈 Win Rate: ${winRate}% (${overallStats.profitableTrades}/${overallStats.totalTrades})`
//     );
//     console.log(`${"=".repeat(90)}`);

//     for (const pair of TRADING_PAIRS) {
//       const balance = await getBalance(pair.asset);
//       const state = tradingState[pair.symbol];
//       const coinStats = overallStats.coinStats[pair.symbol];
//       const coinNetProfit = coinStats.profit - coinStats.loss;
//       const coinWinRate =
//         coinStats.trades > 0
//           ? ((coinStats.profitableTrades / coinStats.trades) * 100).toFixed(1)
//           : 0;

//       console.log(
//         `${pair.name.padEnd(12)}: ${balance.toFixed(6)} ${pair.asset.padEnd(
//           4
//         )} | Status: ${(state.position || "None").padEnd(
//           7
//         )} | P/L: $${coinNetProfit
//           .toFixed(6)
//           .padEnd(10)} | Win: ${coinWinRate}% (${coinStats.profitableTrades}/${
//           coinStats.trades
//         })`
//       );
//     }

//     console.log(`${"=".repeat(90)}`);
//     console.log(`📁 All data saved to logs folder`);

//     // Save final summary
//     saveProfitSummary();
//   } catch (error) {
//     logToFile(`Error getting portfolio summary: ${error.message}`, "ERROR");
//   }
// };

// // Handle graceful shutdown
// process.on("SIGINT", async () => {
//   logToFile("🛑 Trading bot stopped by user", "SYSTEM");
//   await showDetailedSummary();
//   process.exit(0);
// });

// // Start the trading bot
// logToFile("🚀 Initializing Multi-Crypto Trading Bot...", "SYSTEM");
// startTrading().catch((error) => {
//   logToFile(`Fatal error: ${error.message}`, "ERROR");
//   process.exit(1);
// });



const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("../services/telegramService");

const apiKey =
  "P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8";
const apiSecret =
  "vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm";

const TRADING_PAIRS = [
   { symbol: 'SOLUSDT', asset: 'SOL', quantity: 1, name: 'Solana' },
   { symbol: 'SHIBUSDT', asset: 'SHIB', quantity: 100000, name: 'Shiba Inu' },
   { symbol: 'DOGEUSDT', asset: 'DOGE', quantity: 100, name: 'Dogecoin' },
   { symbol: 'ETHUSDT', asset: 'ETH', quantity: 0.01, name: 'Ethereum' },
   { symbol: 'BTCUSDT', asset: 'BTC', quantity: 0.001, name: 'Bitcoin' }
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
    quantity: pair.quantity,
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

  // Write to file
  fs.appendFileSync(logFile, logEntry);

  // Also log to console
  console.log(message);

  // Send Telegram notification for specific types
  if (['TRADE', 'PROFIT', 'ERROR', 'SYSTEM', 'UPDATE'].includes(type)) {
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

  // Send Telegram notification for trade
  const message = `💸 TRADE: ${tradeEntry.coin} (${tradeEntry.symbol})\n` +
                  `Action: ${tradeEntry.action}\n` +
                  (tradeEntry.price ? `Price: $${tradeEntry.price.toFixed(6)}\n` : '') +
                  (tradeEntry.quantity ? `Quantity: ${tradeEntry.quantity}\n` : '') +
                  (tradeEntry.profit ? `Profit: $${tradeEntry.profit.toFixed(6)}\n` : '') +
                  (tradeEntry.oldPrice ? `Old Ref Price: $${tradeEntry.oldPrice.toFixed(6)}\n` : '') +
                  (tradeEntry.newPrice ? `New Ref Price: $${tradeEntry.newPrice.toFixed(6)}\n` : '') +
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

  // Save trade details
  saveTradeToFile({
    symbol: symbol,
    coin: coinStats.name,
    action: "SELL",
    buyPrice: buyPrice,
    sellPrice: sellPrice,
    profit: profit,
    quantity: tradingState[symbol].quantity,
  });

  // Send Telegram notification for profit/loss
  const netProfit = overallStats.totalProfit - overallStats.totalLoss;
  const winRate = overallStats.totalTrades > 0
    ? ((overallStats.profitableTrades / overallStats.totalTrades) * 100).toFixed(1)
    : 0;
  const message = `📊 PROFIT UPDATE: ${coinStats.name} (${symbol})\n` +
                  `Profit/Loss: $${profit.toFixed(6)}\n` +
                  `Total Trades: ${overallStats.totalTrades}\n` +
                  `Total Profit: $${overallStats.totalProfit.toFixed(6)}\n` +
                  `Total Loss: $${overallStats.totalLoss.toFixed(6)}\n` +
                  `Net Profit: $${netProfit.toFixed(6)}\n` +
                  `Win Rate: ${winRate}%`;
  sendTelegram(message);

  // Save updated stats
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
      "https://testnet.binance.vision/api/v3/ticker/price",
      {
        params: params,
      }
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
      "https://testnet.binance.vision/api/v3/order",
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

    const response = await axios.get(
      "https://testnet.binance.vision/api/v3/account",
      {
        params: params,
        headers: {
          "X-MBX-APIKEY": apiKey,
        },
      }
    );

    const balance = response.data.balances.find((b) => b.asset === asset);
    return balance ? parseFloat(balance.free) : 0;
  } catch (error) {
    return 0;
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
  if (state.isTrading) return;

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
          .padEnd(10)} | Wait: ${waitingTime}`
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

  while (true) {
    try {
      const symbols = TRADING_PAIRS.map((pair) => pair.symbol);
      const prices = await getMultiplePrices(symbols);

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

    let message = `📊 DETAILED PORTFOLIO & PROFIT SUMMARY:\n` +
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

      message += `${pair.name}: ${balance.toFixed(6)} ${pair.asset} | ` +
                 `Status: ${state.position || "None"} | ` +
                 `P/L: $${coinNetProfit.toFixed(6)} | ` +
                 `Win: ${coinWinRate}% (${coinStats.profitableTrades}/${coinStats.trades})\n`;
    }

    console.log(`${"=".repeat(90)}`);
    console.log(`📁 All data saved to logs folder`);

    // Send Telegram notification for summary
    sendTelegram(message);

    // Save final summary
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