const axios = require('axios');
const crypto = require('crypto');

class CoinStoreTradingBot {
  constructor(apiKey, apiSecret, baseUrl = 'https://api.coinstore.com') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  // Generate signature for authenticated requests
  generateSignature(timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const path = endpoint;
    const body = method === 'POST' ? JSON.stringify(params) : '';
    const signature = this.generateSignature(timestamp, method, path, body);

    const headers = {
      'X-CS-APIKEY': this.apiKey,
      'X-CS-SIGN': signature,
      'X-CS-EXPIRES': timestamp,
      'Content-Type': 'application/json',
      'User-Agent': 'CoinStore-Trading-Bot/1.0'
    };

    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers,
      timeout: 10000
    };

    if (method === 'POST') {
      config.data = params;
    } else if (method === 'GET' && Object.keys(params).length > 0) {
      config.params = params;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('API Request Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get account balance
  async getBalance() {
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/api/v1/account/balances');
      return response.data;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get market ticker
  async getTicker(symbol) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/market/ticker`, {
        params: { symbol },
        headers: {
          'User-Agent': 'CoinStore-Trading-Bot/1.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting ticker:', error);
      throw error;
    }
  }

  // Place buy order
  async buyOrder(symbol, quantity, price = null, type = 'MARKET') {
    try {
      const orderData = {
        symbol,
        side: 'BUY',
        type,
        quantity: quantity.toString()
      };

      if (type === 'LIMIT' && price) {
        orderData.price = price.toString();
      }

      const response = await this.makeAuthenticatedRequest('POST', '/api/v1/trade/order/place', orderData);
      console.log(`Buy order placed for ${symbol}: ${quantity} at ${price || 'market price'}`);
      return response;
    } catch (error) {
      console.error('Error placing buy order:', error);
      throw error;
    }
  }

  // Place sell order
  async sellOrder(symbol, quantity, price = null, type = 'MARKET') {
    try {
      const orderData = {
        symbol,
        side: 'SELL',
        type,
        quantity: quantity.toString()
      };

      if (type === 'LIMIT' && price) {
        orderData.price = price.toString();
      }

      const response = await this.makeAuthenticatedRequest('POST', '/api/v1/trade/order/place', orderData);
      console.log(`Sell order placed for ${symbol}: ${quantity} at ${price || 'market price'}`);
      return response;
    } catch (error) {
      console.error('Error placing sell order:', error);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(orderId) {
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/api/v1/trade/order/active', {
        orderId
      });
      return response.data;
    } catch (error) {
      console.error('Error getting order status:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      const response = await this.makeAuthenticatedRequest('POST', '/api/v1/trade/order/cancel', {
        orderId
      });
      console.log(`Order ${orderId} cancelled`);
      return response;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Simple trading strategy example
  async simpleMovingAverageStrategy(symbol, shortPeriod = 5, longPeriod = 20) {
    try {
      // Get recent price data (you'll need to implement this based on CoinStore's historical data endpoint)
      const ticker = await this.getTicker(symbol);
      const currentPrice = parseFloat(ticker.data.price);
      
      console.log(`Current price for ${symbol}: ${currentPrice}`);
      
      // Get account balance
      const balance = await this.getBalance();
      console.log('Account balance:', balance);
      
      // Simple example: buy if price is above a threshold, sell if below
      // You should implement proper technical indicators here
      
      return {
        currentPrice,
        balance,
        recommendation: 'HOLD' // Replace with actual strategy logic
      };
    } catch (error) {
      console.error('Error in trading strategy:', error);
      throw error;
    }
  }

  // Start automated trading
  async startTrading(symbol, interval = 60000) { // 1 minute interval
    console.log(`Starting automated trading for ${symbol}`);
    
    const trade = async () => {
      try {
        const analysis = await this.simpleMovingAverageStrategy(symbol);
        
        // Implement your trading logic here
        if (analysis.recommendation === 'BUY') {
          // Place buy order
          console.log('Buy signal detected');
          // await this.buyOrder(symbol, quantity);
        } else if (analysis.recommendation === 'SELL') {
          // Place sell order
          console.log('Sell signal detected');
          // await this.sellOrder(symbol, quantity);
        }
        
      } catch (error) {
        console.error('Trading error:', error);
      }
    };

    // Initial trade
    await trade();
    
    // Set up interval trading
    setInterval(trade, interval);
  }
}

// Usage example
async function main() {
  const bot = new CoinStoreTradingBot(
    '460e56f22bedb4cbb9908603dcd6f7b1',
    '31e4c0d4d894de2250c4e0c152cb8158'
  );

  try {
    // Test connection
    const ticker = await bot.getTicker('BTCUSDT');
    console.log('Ticker:', ticker);

    // Get balance
    const balance = await bot.getBalance();
    console.log('Balance:', balance);

    // Start automated trading (uncomment when ready)
    await bot.startTrading('BTCUSDT', 60000); // 1 minute interval

  } catch (error) {
    console.error('Bot error:', error);
  }
}

// Export the class for use in other files
module.exports = CoinStoreTradingBot;

// Run if this file is executed directly
if (require.main === module) {
  main();
}