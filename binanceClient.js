const ccxt = require("ccxt");

class BinanceClient {
  constructor(apiKey, apiSecret, baseURL = null) {
    this.isTestnet = !!baseURL;

    const config = {
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      rateLimit: 500,
      options: {
        defaultType: "future",
        adjustForTimeDifference: true,
        recvWindow: 60000,
      },
    };

    this.exchange = new ccxt.binance(config);

    if (this.isTestnet) {
      this.exchange.hostname = "testnet.binancefuture.com";
      const testnetBase = "https://testnet.binancefuture.com";

      this.exchange.urls["api"] = {
        public: testnetBase + "/fapi/v1",
        private: testnetBase + "/fapi/v1",
        fapiPublic: testnetBase + "/fapi/v1",
        fapiPrivate: testnetBase + "/fapi/v1",
        fapiPublicV2: testnetBase + "/fapi/v2",
        fapiPrivateV2: testnetBase + "/fapi/v2",
        dapiPublic: testnetBase + "/dapi/v1",
        dapiPrivate: testnetBase + "/dapi/v1",
      };

      // Prevent CCXT from auto-loading markets which hits SAPI endpoints
      // SAPI is not supported on testnet and causes rate limit issues
      this.exchange.options["checkOrderWhenCanceling"] = false;
      this.exchange.options["fetchCurrencies"] = false;
      this.exchange.options["fetchMarkets"] = false;
    }
  }

  async setLeverage(symbol, leverage) {
    try {
      await this.exchange.fapiPrivatePostLeverage({
        symbol: symbol.replace("/", ""),
        leverage: leverage,
      });
    } catch (e) {
      console.warn("Set leverage warning:", e.message);
    }
  }

  async getBalance() {
    try {
      const response = await this.exchange.fapiPrivateV2GetAccount();
      const result = {
        info: response,
        timestamp: response.updateTime,
        datetime: this.exchange.iso8601(response.updateTime),
      };

      response.assets.forEach((asset) => {
        const code = asset.asset;
        const account = {
          free: parseFloat(asset.availableBalance),
          used: parseFloat(asset.initialMargin),
          total: parseFloat(asset.walletBalance),
        };
        result[code] = account;
      });

      return result;
    } catch (error) {
      console.error("fetchBalance error:", error.message);
      throw error;
    }
  }

  async getOHLCV(symbol, timeframe, limit = 200) {
    try {
      const response = await this.exchange.fapiPublicGetKlines({
        symbol: symbol.replace("/", ""),
        interval: timeframe,
        limit: limit,
      });
      return response.map((c) => ({
        timestamp: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
      }));
    } catch (error) {
      console.error("getOHLCV error:", error.message);
      throw error;
    }
  }

  async getOrderBook(symbol, limit = 20) {
    try {
      const response = await this.exchange.fapiPublicGetDepth({
        symbol: symbol.replace("/", ""),
        limit: limit,
      });
      return {
        bids: response.bids.map((b) => [parseFloat(b[0]), parseFloat(b[1])]),
        asks: response.asks.map((a) => [parseFloat(a[0]), parseFloat(a[1])]),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("getOrderBook error:", error.message);
      throw error;
    }
  }

  async getTicker(symbol) {
    try {
      const response = await this.exchange.fapiPublicGetTicker24hr({
        symbol: symbol.replace("/", ""),
      });
      return {
        symbol: symbol,
        last: parseFloat(response.lastPrice),
        percentage: parseFloat(response.priceChangePercent),
        high: parseFloat(response.highPrice),
        low: parseFloat(response.lowPrice),
        volume: parseFloat(response.volume),
        timestamp: response.closeTime,
      };
    } catch (error) {
      console.error("getTicker error:", error.message);
      throw error;
    }
  }

  async getOpenOrders(symbol) {
    try {
      // Use direct fapi endpoint to avoid SAPI issue on testnet
      const response = await this.exchange.fapiPrivateGetOpenOrders({
        symbol: symbol.replace("/", ""),
      });
      return response.map((order) => ({
        id: order.orderId.toString(),
        symbol: symbol,
        type: order.type.toLowerCase(),
        side: order.side.toLowerCase(),
        price: parseFloat(order.price),
        amount: parseFloat(order.origQty),
        status: order.status.toLowerCase(),
      }));
    } catch (error) {
      console.error("getOpenOrders error:", error.message);
      return [];
    }
  }

  async getPositions(symbol) {
    try {
      const response = await this.exchange.fapiPrivateV2GetPositionRisk({
        symbol: symbol.replace("/", ""),
      });

      if (!response || response.length === 0) {
        return null;
      }

      const position = response[0];
      const contracts = Math.abs(parseFloat(position.positionAmt));

      if (contracts === 0) {
        return null;
      }

      return {
        symbol: symbol,
        contracts: contracts,
        side: parseFloat(position.positionAmt) > 0 ? "long" : "short",
        entryPrice: parseFloat(position.entryPrice),
        unrealizedPnl: parseFloat(position.unRealizedProfit),
        leverage: parseFloat(position.leverage),
      };
    } catch (error) {
      console.error("getPositions error:", error.message);
      return null;
    }
  }

  async getFundingRate(symbol) {
    try {
      const response = await this.exchange.fapiPublicGetPremiumIndex({
        symbol: symbol.replace("/", ""),
      });
      return parseFloat(response.lastFundingRate);
    } catch (error) {
      console.warn("getFundingRate error:", error.message);
      return 0;
    }
  }

  async createLimitOrder(symbol, side, amount, price) {
    try {
      // Round price to appropriate precision (2 decimals for most pairs)
      const roundedPrice = Math.round(price * 100) / 100;

      const params = {
        symbol: symbol.replace("/", ""),
        side: side.toUpperCase(),
        type: "LIMIT",
        quantity: amount,
        price: roundedPrice,
        timeInForce: "GTC",
      };

      const response = await this.exchange.fapiPrivatePostOrder(params);

      return {
        id: response.orderId.toString(),
        symbol: symbol,
        type: "limit",
        side: side,
        amount: parseFloat(response.origQty),
        price: parseFloat(response.price),
        status: response.status.toLowerCase(),
        timestamp: response.updateTime,
      };
    } catch (error) {
      console.error("createLimitOrder error:", error.message);
      throw error;
    }
  }

  async createStopLossOrder(symbol, side, amount, stopPrice, limitPrice) {
    try {
      const roundedStopPrice = Math.round(stopPrice * 100) / 100;

      const params = {
        symbol: symbol.replace("/", ""),
        side: side.toUpperCase(),
        algoType: "CONDITIONAL",
        type: "STOP_MARKET",
        orderType: "STOP_MARKET",
        triggerPrice: roundedStopPrice,
        closePosition: true, // Automatically closes entire position (no quantity needed)
      };

      const response = await this.exchange.fapiPrivatePostAlgoOrder(params);

      return {
        id: response.algoId
          ? response.algoId.toString()
          : response.orderId.toString(),
        symbol: symbol,
        type: "stop",
        side: side,
        amount: amount,
        stopPrice: roundedStopPrice,
        status: "new",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("createStopLossOrder error:", error.message);
      throw error;
    }
  }

  async createTakeProfitOrder(symbol, side, amount, price) {
    try {
      const roundedPrice = Math.round(price * 100) / 100;

      const params = {
        symbol: symbol.replace("/", ""),
        side: side.toUpperCase(),
        algoType: "CONDITIONAL",
        type: "TAKE_PROFIT_MARKET",
        orderType: "TAKE_PROFIT_MARKET",
        triggerPrice: roundedPrice,
        closePosition: true, // Automatically closes entire position (no quantity needed)
      };

      const response = await this.exchange.fapiPrivatePostAlgoOrder(params);

      return {
        id: response.algoId
          ? response.algoId.toString()
          : response.orderId.toString(),
        symbol: symbol,
        type: "take_profit",
        side: side,
        amount: amount,
        stopPrice: roundedPrice,
        status: "new",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("createTakeProfitOrder error:", error.message);
      throw error;
    }
  }

  async cancelOrder(orderId, symbol) {
    try {
      // Check if this is an algo order (algoId is typically longer or string)
      const isAlgoOrder = String(orderId).length > 12;

      if (isAlgoOrder) {
        const response = await this.exchange.fapiPrivateDeleteAlgoOrder({
          symbol: symbol.replace("/", ""),
          algoId: orderId,
        });
        return { id: orderId, status: "canceled" };
      } else {
        const response = await this.exchange.fapiPrivateDeleteOrder({
          symbol: symbol.replace("/", ""),
          orderId: orderId,
        });
        return { id: response.orderId.toString(), status: "canceled" };
      }
    } catch (error) {
      console.error("cancelOrder error:", error.message);
      throw error;
    }
  }

  async getMarkPrice(symbol) {
    const ticker = await this.exchange.fetchTicker(symbol);
    return ticker.last;
  }
}

module.exports = BinanceClient;
