// const axios = require('axios');
// const crypto = require('crypto');

// // Replace with your actual Binance Testnet API key and secret
// const apiKey = 'P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8';
// const apiSecret = 'vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm';

// // Trading configuration
// const SYMBOL = 'IOTAUSDT';
// const PRICE_THRESHOLD = 0.00001; // Price difference threshold
// const TRADE_QUANTITY = 10; // Amount of IOTA to trade
// const CHECK_INTERVAL = 5000; // Check price every 5 seconds

// // Trading state
// let buyingPrice = null;
// let position = null; // 'long' when we own IOTA, null when we don't
// let isTrading = false;

// // Function to generate the signature for Binance API
// const generateSignature = (params, secret) => {
//   const queryString = Object.keys(params)
//     .map((key) => `${key}=${params[key]}`)
//     .join('&');
    
//   return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
// };

// // Function to get the latest price for the given symbol
// const getTickerPrice = async (symbol) => {
//   try {
//     const params = { symbol: symbol };
    
//     const response = await axios.get('https://testnet.binance.vision/api/v3/ticker/price', {
//       params: params
//     });

//     return parseFloat(response.data.price);
//   } catch (error) {
//     if (error.response) {
//       console.error('Error getting price:', error.response.data);
//     } else {
//       console.error('Error getting price:', error.message);
//     }
//     return null;
//   }
// };

// // Function to place a market order
// const placeOrder = async (symbol, side, quantity) => {
//   try {
//     const params = {
//       symbol: symbol,
//       side: side, // 'BUY' or 'SELL'
//       type: 'MARKET',
//       quantity: quantity,
//       timestamp: Date.now()
//     };

//     const signature = generateSignature(params, apiSecret);
//     params.signature = signature;

//     const response = await axios.post('https://testnet.binance.vision/api/v3/order', null, {
//       params: params,
//       headers: {
//         'X-MBX-APIKEY': apiKey
//       }
//     });

//     console.log(`✅ ${side} order placed successfully:`, response.data);
//     return response.data;
//   } catch (error) {
//     if (error.response) {
//       console.error(`❌ Error placing ${side} order:`, error.response.data);
//     } else {
//       console.error(`❌ Error placing ${side} order:`, error.message);
//     }
//     return null;
//   }
// };

// // Function to get account balance
// const getBalance = async (asset = 'IOTA') => {
//   try {
//     const params = {
//       timestamp: Date.now()
//     };

//     const signature = generateSignature(params, apiSecret);
//     params.signature = signature;

//     const response = await axios.get('https://testnet.binance.vision/api/v3/account', {
//       params: params,
//       headers: {
//         'X-MBX-APIKEY': apiKey
//       }
//     });

//     const balance = response.data.balances.find(b => b.asset === asset);
//     return balance ? parseFloat(balance.free) : 0;
//   } catch (error) {
//     if (error.response) {
//       console.error('Error getting balance:', error.response.data);
//     } else {
//       console.error('Error getting balance:', error.message);
//     }
//     return 0;
//   }
// };

// // Main trading logic
// const executeTradingLogic = async (currentPrice) => {
//   if (isTrading) return; // Prevent multiple simultaneous trades

//   // Check if we should BUY (when price drops by threshold)
//   if (position === null && buyingPrice === null) {
//     // First time - set initial reference price
//     buyingPrice = currentPrice;
//     console.log(`📊 Initial reference price set: $${currentPrice}`);
//     return;
//   }

//   if (position === null) {
//     // We don't own IOTA, check if price dropped enough to buy
//     const buyTriggerPrice = buyingPrice - PRICE_THRESHOLD;
    
//     if (currentPrice <= buyTriggerPrice) {
//       console.log(`🔽 Price dropped to $${currentPrice} (trigger: $${buyTriggerPrice})`);
      
//       isTrading = true;
//       const order = await placeOrder(SYMBOL, 'BUY', TRADE_QUANTITY);
      
//       if (order) {
//         position = 'long';
//         buyingPrice = currentPrice;
//         console.log(`✅ BOUGHT ${TRADE_QUANTITY} IOTA at $${currentPrice}`);
//       }
//       isTrading = false;
//     }
//   } else if (position === 'long') {
//     // We own IOTA, check if price rose enough to sell
//     const sellTriggerPrice = buyingPrice + PRICE_THRESHOLD;
    
//     if (currentPrice >= sellTriggerPrice) {
//       console.log(`🔼 Price rose to $${currentPrice} (trigger: $${sellTriggerPrice})`);
      
//       isTrading = true;
//       const iotaBalance = await getBalance('IOTA');
      
//       if (iotaBalance >= TRADE_QUANTITY) {
//         const order = await placeOrder(SYMBOL, 'SELL', TRADE_QUANTITY);
        
//         if (order) {
//           const profit = (currentPrice - buyingPrice) * TRADE_QUANTITY;
//           console.log(`✅ SOLD ${TRADE_QUANTITY} IOTA at $${currentPrice}`);
//           console.log(`💰 Profit: $${profit.toFixed(6)}`);
          
//           position = null;
//           buyingPrice = currentPrice; // Reset reference price
//         }
//       } else {
//         console.log(`❌ Insufficient IOTA balance: ${iotaBalance}`);
//       }
//       isTrading = false;
//     }
//   }
// };

// // Main monitoring loop
// const startTrading = async () => {
//   console.log(`🤖 IOTA Trading Bot Started`);
//   console.log(`📈 Symbol: ${SYMBOL}`);
//   console.log(`💰 Quantity: ${TRADE_QUANTITY} IOTA`);
//   console.log(`📊 Price threshold: $${PRICE_THRESHOLD}`);
//   console.log(`⏰ Check interval: ${CHECK_INTERVAL}ms`);
//   console.log(`${'='.repeat(50)}`);

//   while (true) {
//     try {
//       const currentPrice = await getTickerPrice(SYMBOL);
      
//       if (currentPrice) {
//         const statusEmoji = position === 'long' ? '🟢' : '🔴';
//         const positionText = position === 'long' ? 'HOLDING' : 'WAITING';
        
//         console.log(`${statusEmoji} ${positionText} | Price: $${currentPrice} | Ref: $${buyingPrice || 'N/A'}`);
        
//         await executeTradingLogic(currentPrice);
//       }
      
//       await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
//     } catch (error) {
//       console.error('Error in trading loop:', error.message);
//       await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
//     }
//   }
// };

// // Handle graceful shutdown
// process.on('SIGINT', () => {
//   console.log('\n🛑 Trading bot stopped by user');
//   process.exit(0);
// });

// // Start the trading bot
// startTrading().catch(error => {
//   console.error('Fatal error:', error.message);
//   process.exit(1);
// });


const axios = require('axios');
const crypto = require('crypto');

// Replace with your actual Binance Testnet API key and secret
const apiKey = 'P2qSAbkzrvU2ZkXL7zAH1cfsvpB4jrPBEInLEHsmY4zbUhLW4w8paHqdxZeTY7z8';
const apiSecret = 'vZkmBJu2Lx49HkEJEpCAQSYqn1wkRnYJ6VgGtNlUYRcYAppTDVN9I6ltmNEBUztm';

// Trading configuration
const TRADING_PAIRS = [
  { symbol: 'SOLUSDT', asset: 'SOL', quantity: 1, name: 'Solana' },
  { symbol: 'SHIBUSDT', asset: 'SHIB', quantity: 100000, name: 'Shiba Inu' },
  { symbol: 'DOGEUSDT', asset: 'DOGE', quantity: 100, name: 'Dogecoin' },
  { symbol: 'ETHUSDT', asset: 'ETH', quantity: 0.01, name: 'Ethereum' },
  { symbol: 'BTCUSDT', asset: 'BTC', quantity: 0.001, name: 'Bitcoin' }
];

const PRICE_THRESHOLD = 0.00001; // Price difference threshold
const CHECK_INTERVAL = 5000; // Check price every 5 seconds

// Trading state for each pair
const tradingState = {};

// Initialize trading state for each pair
TRADING_PAIRS.forEach(pair => {
  tradingState[pair.symbol] = {
    buyingPrice: null,
    position: null, // 'long' when we own the asset, null when we don't
    isTrading: false,
    name: pair.name,
    asset: pair.asset,
    quantity: pair.quantity
  };
});

// Function to generate the signature for Binance API
const generateSignature = (params, secret) => {
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&');
    
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
};

// Function to get prices for multiple symbols
const getMultiplePrices = async (symbols) => {
  try {
    const symbolsParam = symbols.map(s => `"${s}"`).join(',');
    const params = { symbols: `[${symbolsParam}]` };
    
    const response = await axios.get('https://testnet.binance.vision/api/v3/ticker/price', {
      params: params
    });

    const prices = {};
    response.data.forEach(item => {
      prices[item.symbol] = parseFloat(item.price);
    });
    
    return prices;
  } catch (error) {
    if (error.response) {
      console.error('Error getting prices:', error.response.data);
    } else {
      console.error('Error getting prices:', error.message);
    }
    return null;
  }
};

// Function to place a market order
const placeOrder = async (symbol, side, quantity) => {
  try {
    const params = {
      symbol: symbol,
      side: side, // 'BUY' or 'SELL'
      type: 'MARKET',
      quantity: quantity,
      timestamp: Date.now()
    };

    const signature = generateSignature(params, apiSecret);
    params.signature = signature;

    const response = await axios.post('https://testnet.binance.vision/api/v3/order', null, {
      params: params,
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error placing ${side} order for ${symbol}:`, error.response.data);
    } else {
      console.error(`❌ Error placing ${side} order for ${symbol}:`, error.message);
    }
    return null;
  }
};

// Function to get account balance
const getBalance = async (asset) => {
  try {
    const params = {
      timestamp: Date.now()
    };

    const signature = generateSignature(params, apiSecret);
    params.signature = signature;

    const response = await axios.get('https://testnet.binance.vision/api/v3/account', {
      params: params,
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    const balance = response.data.balances.find(b => b.asset === asset);
    return balance ? parseFloat(balance.free) : 0;
  } catch (error) {
    return 0;
  }
};

// Trading logic for a single pair
const executeTradingLogic = async (symbol, currentPrice, state) => {
  if (state.isTrading) return; // Prevent multiple simultaneous trades

  // Check if we should BUY (when price drops by threshold)
  if (state.position === null && state.buyingPrice === null) {
    // First time - set initial reference price
    state.buyingPrice = currentPrice;
    console.log(`📊 ${state.name} initial reference price set: $${currentPrice}`);
    return;
  }

  if (state.position === null) {
    // We don't own the asset, check if price dropped enough to buy
    const buyTriggerPrice = state.buyingPrice - PRICE_THRESHOLD;
    
    if (currentPrice <= buyTriggerPrice) {
      console.log(`🔽 ${state.name} price dropped to $${currentPrice} (trigger: $${buyTriggerPrice})`);
      
      state.isTrading = true;
      const order = await placeOrder(symbol, 'BUY', state.quantity);
      
      if (order) {
        state.position = 'long';
        state.buyingPrice = currentPrice;
        console.log(`✅ BOUGHT ${state.quantity} ${state.name} at $${currentPrice}`);
      }
      state.isTrading = false;
    }
  } else if (state.position === 'long') {
    // We own the asset, check if price rose enough to sell
    const sellTriggerPrice = state.buyingPrice + PRICE_THRESHOLD;
    
    if (currentPrice >= sellTriggerPrice) {
      console.log(`🔼 ${state.name} price rose to $${currentPrice} (trigger: $${sellTriggerPrice})`);
      
      state.isTrading = true;
      const assetBalance = await getBalance(state.asset);
      
      if (assetBalance >= state.quantity) {
        const order = await placeOrder(symbol, 'SELL', state.quantity);
        
        if (order) {
          const profit = (currentPrice - state.buyingPrice) * state.quantity;
          console.log(`✅ SOLD ${state.quantity} ${state.name} at $${currentPrice}`);
          console.log(`💰 ${state.name} Profit: $${profit.toFixed(6)}`);
          
          state.position = null;
          state.buyingPrice = currentPrice; // Reset reference price
        }
      } else {
        console.log(`❌ Insufficient ${state.asset} balance: ${assetBalance}`);
      }
      state.isTrading = false;
    }
  }
};

// Display current status
const displayStatus = (prices) => {
  console.clear();
  console.log(`🤖 Multi-Crypto Trading Bot Status`);
  console.log(`⏰ ${new Date().toLocaleTimeString()}`);
  console.log(`💰 Threshold: $${PRICE_THRESHOLD}`);
  console.log(`${'='.repeat(80)}`);
  
  TRADING_PAIRS.forEach(pair => {
    const state = tradingState[pair.symbol];
    const currentPrice = prices[pair.symbol];
    
    if (currentPrice) {
      const statusEmoji = state.position === 'long' ? '🟢' : '🔴';
      const positionText = state.position === 'long' ? 'HOLDING' : 'WAITING';
      const buyPrice = state.buyingPrice ? `$${state.buyingPrice.toFixed(6)}` : 'N/A';
      
      console.log(`${statusEmoji} ${state.name.padEnd(12)} | ${positionText.padEnd(7)} | Price: $${currentPrice.toFixed(6).padEnd(10)} | Ref: ${buyPrice}`);
    }
  });
  
  console.log(`${'='.repeat(80)}`);
};

// Main monitoring loop
const startTrading = async () => {
  console.log(`🤖 Multi-Crypto Trading Bot Started`);
  console.log(`📈 Trading pairs: ${TRADING_PAIRS.map(p => p.name).join(', ')}`);
  console.log(`📊 Price threshold: $${PRICE_THRESHOLD}`);
  console.log(`⏰ Check interval: ${CHECK_INTERVAL}ms`);
  console.log(`${'='.repeat(80)}`);

  while (true) {
    try {
      const symbols = TRADING_PAIRS.map(pair => pair.symbol);
      const prices = await getMultiplePrices(symbols);
      
      if (prices) {
        // Display current status
        displayStatus(prices);
        
        // Execute trading logic for each pair
        for (const pair of TRADING_PAIRS) {
          const currentPrice = prices[pair.symbol];
          if (currentPrice) {
            await executeTradingLogic(pair.symbol, currentPrice, tradingState[pair.symbol]);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    } catch (error) {
      console.error('Error in trading loop:', error.message);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
};

// Display portfolio summary
const showPortfolio = async () => {
  try {
    console.log(`\n📊 Portfolio Summary:`);
    console.log(`${'='.repeat(50)}`);
    
    for (const pair of TRADING_PAIRS) {
      const balance = await getBalance(pair.asset);
      const state = tradingState[pair.symbol];
      
      console.log(`${pair.name.padEnd(12)}: ${balance.toFixed(6)} ${pair.asset} | Status: ${state.position || 'None'}`);
    }
    
    console.log(`${'='.repeat(50)}`);
  } catch (error) {
    console.error('Error getting portfolio:', error.message);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Trading bot stopped by user');
  await showPortfolio();
  process.exit(0);
});

// Start the trading bot
console.log('🚀 Initializing Multi-Crypto Trading Bot...');
startTrading().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});