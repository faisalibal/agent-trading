const ccxt = require("ccxt");

class BinanceClient {
  constructor(apiKey, apiSecret, baseURL = null) {
    const config = {
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: "future",
      },
    };

    // Jika baseURL diberikan (untuk testnet), set urls.api
    if (baseURL) {
      config.urls = {
        api: {
          public: baseURL,
          private: baseURL,
        },
      };
    }

    this.exchange = new ccxt.binance(config);
  }

  async setLeverage(symbol, leverage) {
    try {
      await this.exchange.setLeverage(leverage, symbol);
    } catch (e) {
      console.warn("Set leverage warning:", e.message);
    }
  }

  async getBalance() {
    const balance = await this.exchange.fetchBalance();
    return balance;
  }

  async getOHLCV(symbol, timeframe, limit = 200) {
    const ohlcv = await this.exchange.fetchOHLCV(
      symbol,
      timeframe,
      undefined,
      limit,
    );
    return ohlcv.map((c) => ({
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
  }

  async getOrderBook(symbol, limit = 20) {
    return await this.exchange.fetchOrderBook(symbol, limit);
  }

  async getTicker(symbol) {
    return await this.exchange.fetchTicker(symbol);
  }

  async getOpenOrders(symbol) {
    return await this.exchange.fetchOpenOrders(symbol);
  }

  async getPositions(symbol) {
    try {
      // Untuk futures, kadang perlu parameter [symbol] atau []
      const positions = await this.exchange.fetchPositions([symbol]);
      return positions.find((p) => p.symbol === symbol) || null;
    } catch (error) {
      // Fallback ke method lama jika error
      const positions = await this.exchange.fetchPositions();
      return positions.find((p) => p.symbol === symbol) || null;
    }
  }

  async getFundingRate(symbol) {
    try {
      const funding = await this.exchange.fetchFundingRate(symbol);
      return funding.fundingRate;
    } catch {
      return 0;
    }
  }

  async createLimitOrder(symbol, side, amount, price) {
    return await this.exchange.createOrder(
      symbol,
      "limit",
      side,
      amount,
      price,
    );
  }

  async createStopLossOrder(symbol, side, amount, stopPrice, limitPrice) {
    return await this.exchange.createOrder(
      symbol,
      "stop",
      side,
      amount,
      limitPrice,
      { stopPrice },
    );
  }

  async createTakeProfitOrder(symbol, side, amount, price) {
    return await this.exchange.createOrder(
      symbol,
      "take_profit_limit",
      side,
      amount,
      price,
      { stopPrice: price },
    );
  }

  async cancelOrder(orderId, symbol) {
    return await this.exchange.cancelOrder(orderId, symbol);
  }

  async getMarkPrice(symbol) {
    const ticker = await this.exchange.fetchTicker(symbol);
    return ticker.last;
  }
}

module.exports = BinanceClient;
