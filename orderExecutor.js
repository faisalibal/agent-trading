class OrderExecutor {
  constructor(client, symbol, leverage) {
    this.client = client;
    this.symbol = symbol;
    this.leverage = leverage;
    this.activePosition = null;
  }

  async syncPosition() {
    const position = await this.client.getPositions(this.symbol);
    if (position && position.contracts > 0) {
      this.activePosition = {
        entryPrice: position.entryPrice,
        quantity: Math.abs(position.contracts),
        side: position.side === "long" ? "long" : "short",
        stopLoss: null,
        takeProfit: null,
        stopLossOrderId: null,
        takeProfitOrderId: null,
        highestPrice: position.entryPrice,
        lowestPrice: position.entryPrice,
        trailingActivated: false,
        trailingDistance: 0.01,
      };
      const openOrders = await this.client.getOpenOrders(this.symbol);
      for (const order of openOrders) {
        if (
          order.type === "stop" &&
          order.side === (position.side === "long" ? "sell" : "buy")
        ) {
          this.activePosition.stopLoss = order.stopPrice;
          this.activePosition.stopLossOrderId = order.id;
        }
        if (
          order.type === "take_profit_limit" &&
          order.side === (position.side === "long" ? "sell" : "buy")
        ) {
          this.activePosition.takeProfit = order.price;
          this.activePosition.takeProfitOrderId = order.id;
        }
      }
    } else {
      this.activePosition = null;
    }
    return this.activePosition;
  }

  /**
   * Smart order execution with LIMIT order + MARKET fallback
   * @param {Object} decision - Trading decision with action, entry_price, stop_loss, take_profit
   * @param {Number} quantity - Order quantity
   * @param {Object} options - Execution options
   * @returns {Object} Execution result
   */
  async executeDecision(decision, quantity, options = {}) {
    const { action, entry_price, stop_loss, take_profit } = decision;
    const {
      useLimitOrder = true,
      limitTimeout = 30000, // 30 seconds
      limitPriceOffset = 0.0005, // 0.05% better than market
    } = options;

    try {
      await this.client.setLeverage(this.symbol, this.leverage);

      if (action === "BUY") {
        // Step 1: Place entry order (LIMIT with MARKET fallback)
        const entryResult = await this.placeSmartEntryOrder(
          "buy",
          quantity,
          entry_price,
          { useLimitOrder, limitTimeout, limitPriceOffset },
        );

        if (!entryResult.success) {
          console.error("Failed to open position:", entryResult.error);
          return { success: false, error: entryResult.error };
        }

        console.log(
          `✅ Position opened: ${entryResult.orderType} order filled at $${entryResult.fillPrice}`,
        );

        // Step 2: Wait for position to be confirmed
        await this.sleep(2000);

        // Step 3: Verify position exists before placing TP/SL
        const position = await this.client.getPositions(this.symbol);
        if (!position || position.contracts === 0) {
          console.error(
            "⚠️ Position not found after entry order. Skipping TP/SL.",
          );
          return {
            success: true,
            warning: "Position not confirmed, TP/SL not placed",
          };
        }

        console.log(
          `📊 Position confirmed: ${position.side} ${Math.abs(position.contracts)} @ $${position.entryPrice}`,
        );

        // Step 4: Place Stop Loss & Take Profit
        const stopLimitPrice = stop_loss * 0.999;
        const slOrder = await this.client.createStopLossOrder(
          this.symbol,
          "sell",
          quantity,
          stop_loss,
          stopLimitPrice,
        );
        console.log(`🛑 Stop Loss placed at $${stop_loss}`);

        const tpOrder = await this.client.createTakeProfitOrder(
          this.symbol,
          "sell",
          quantity,
          take_profit,
        );
        console.log(`🎯 Take Profit placed at $${take_profit}`);

        this.activePosition = {
          entryPrice: entry_price,
          quantity,
          side: "long",
          stopLoss: stop_loss,
          takeProfit: take_profit,
          stopLossOrderId: slOrder.id,
          takeProfitOrderId: tpOrder.id,
          highestPrice: entry_price,
          trailingActivated: false,
          trailingDistance: 0.01,
        };
      } else if (action === "SELL") {
        // Step 1: Place entry order (LIMIT with MARKET fallback)
        const entryResult = await this.placeSmartEntryOrder(
          "sell",
          quantity,
          entry_price,
          { useLimitOrder, limitTimeout, limitPriceOffset },
        );

        if (!entryResult.success) {
          console.error("Failed to open position:", entryResult.error);
          return { success: false, error: entryResult.error };
        }

        console.log(
          `✅ Position opened: ${entryResult.orderType} order filled at $${entryResult.fillPrice}`,
        );

        // Step 2: Wait for position to be confirmed
        await this.sleep(2000);

        // Step 3: Verify position exists before placing TP/SL
        const position = await this.client.getPositions(this.symbol);
        if (!position || position.contracts === 0) {
          console.error(
            "⚠️ Position not found after entry order. Skipping TP/SL.",
          );
          return {
            success: true,
            warning: "Position not confirmed, TP/SL not placed",
          };
        }

        console.log(
          `📊 Position confirmed: ${position.side} ${Math.abs(position.contracts)} @ $${position.entryPrice}`,
        );

        // Step 4: Place Stop Loss & Take Profit
        const stopLimitPrice = stop_loss * 1.001;
        const slOrder = await this.client.createStopLossOrder(
          this.symbol,
          "buy",
          quantity,
          stop_loss,
          stopLimitPrice,
        );
        console.log(`🛑 Stop Loss placed at $${stop_loss}`);

        const tpOrder = await this.client.createTakeProfitOrder(
          this.symbol,
          "buy",
          quantity,
          take_profit,
        );
        console.log(`🎯 Take Profit placed at $${take_profit}`);

        this.activePosition = {
          entryPrice: entry_price,
          quantity,
          side: "short",
          stopLoss: stop_loss,
          takeProfit: take_profit,
          stopLossOrderId: slOrder.id,
          takeProfitOrderId: tpOrder.id,
          lowestPrice: entry_price,
          trailingActivated: false,
          trailingDistance: 0.01,
        };
      }
    } catch (error) {
      console.error("Execution error:", error);
    }
  }

  /**
   * Smart entry order placement with LIMIT + MARKET fallback
   * @param {String} side - 'buy' or 'sell'
   * @param {Number} quantity - Order quantity
   * @param {Number} targetPrice - Target entry price
   * @param {Object} options - Execution options
   * @returns {Object} Result with success, orderType, fillPrice
   */
  async placeSmartEntryOrder(side, quantity, targetPrice, options = {}) {
    const { useLimitOrder, limitTimeout, limitPriceOffset } = options;

    if (!useLimitOrder) {
      // Use MARKET order directly
      return await this.placeMarketEntry(side, quantity);
    }

    // Calculate LIMIT price (slightly better than market)
    const limitPrice =
      side === "buy"
        ? targetPrice * (1 - limitPriceOffset) // Buy lower
        : targetPrice * (1 + limitPriceOffset); // Sell higher

    console.log(
      `📝 Placing LIMIT ${side.toUpperCase()} order at $${limitPrice.toFixed(2)} (target: $${targetPrice.toFixed(2)})`,
    );

    try {
      // Place LIMIT order
      const limitOrder = await this.client.createLimitOrder(
        this.symbol,
        side,
        quantity,
        limitPrice,
      );

      console.log(
        `⏳ Waiting up to ${limitTimeout / 1000}s for LIMIT order fill...`,
      );

      // Monitor order fill with timeout
      const fillResult = await this.waitForOrderFill(
        limitOrder.id,
        limitTimeout,
      );

      if (fillResult.filled) {
        console.log(`✅ LIMIT order filled at $${fillResult.fillPrice}`);
        return {
          success: true,
          orderType: "LIMIT",
          fillPrice: fillResult.fillPrice,
          orderId: limitOrder.id,
        };
      }

      // Order not filled - cancel and use MARKET
      console.log(
        `⚠️ LIMIT order not filled within ${limitTimeout / 1000}s, switching to MARKET...`,
      );

      try {
        await this.client.cancelOrder(limitOrder.id, this.symbol);
        console.log(`❌ LIMIT order cancelled`);
      } catch (cancelError) {
        console.log(
          `⚠️ Could not cancel LIMIT order (may already be filled): ${cancelError.message}`,
        );
      }

      // Fallback to MARKET order
      return await this.placeMarketEntry(side, quantity);
    } catch (error) {
      console.error(
        `❌ LIMIT order failed: ${error.message}, falling back to MARKET`,
      );
      return await this.placeMarketEntry(side, quantity);
    }
  }

  /**
   * Place MARKET order for entry
   */
  async placeMarketEntry(side, quantity) {
    console.log(`🚀 Placing MARKET ${side.toUpperCase()} order...`);

    try {
      const marketOrder = await this.client.exchange.fapiPrivatePostOrder({
        symbol: this.symbol.replace("/", ""),
        side: side.toUpperCase(),
        type: "MARKET",
        quantity: quantity,
      });

      const ticker = await this.client.getTicker(this.symbol);
      const fillPrice = ticker.last;

      console.log(`✅ MARKET order executed at ~$${fillPrice}`);

      return {
        success: true,
        orderType: "MARKET",
        fillPrice: fillPrice,
        orderId: marketOrder.orderId,
      };
    } catch (error) {
      console.error(`❌ MARKET order failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Wait for order to be filled
   * @param {String} orderId - Order ID to monitor
   * @param {Number} timeout - Max wait time in ms
   * @returns {Object} Result with filled status and fillPrice
   */
  async waitForOrderFill(orderId, timeout) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      await this.sleep(checkInterval);

      try {
        // Check if position exists (order filled)
        const position = await this.client.getPositions(this.symbol);
        if (position && position.contracts !== 0) {
          return {
            filled: true,
            fillPrice: position.entryPrice,
          };
        }
      } catch (error) {
        console.error(`Error checking order fill: ${error.message}`);
      }
    }

    return { filled: false };
  }

  /**
   * Sleep helper
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async updateTrailingStop(currentPrice) {
    if (!this.activePosition) return;
    const pos = this.activePosition;

    if (pos.side === "long") {
      if (currentPrice > pos.highestPrice) pos.highestPrice = currentPrice;

      if (!pos.trailingActivated) {
        const profitPercent = (currentPrice - pos.entryPrice) / pos.entryPrice;
        if (profitPercent >= 0.02) {
          pos.trailingActivated = true;
          console.log("Trailing stop activated for long");
        }
      }

      if (pos.trailingActivated) {
        const newStop = pos.highestPrice * (1 - pos.trailingDistance);
        if (newStop > pos.stopLoss) {
          if (pos.stopLossOrderId) {
            await this.client.cancelOrder(pos.stopLossOrderId, this.symbol);
          }
          const stopLimitPrice = newStop * 0.999;
          const newSlOrder = await this.client.createStopLossOrder(
            this.symbol,
            "sell",
            pos.quantity,
            newStop,
            stopLimitPrice,
          );
          pos.stopLossOrderId = newSlOrder.id;
          pos.stopLoss = newStop;
          console.log(`Trailing stop updated to ${newStop}`);
        }
      }
    } else if (pos.side === "short") {
      if (currentPrice < pos.lowestPrice) pos.lowestPrice = currentPrice;

      if (!pos.trailingActivated) {
        const profitPercent = (pos.entryPrice - currentPrice) / pos.entryPrice;
        if (profitPercent >= 0.02) {
          pos.trailingActivated = true;
          console.log("Trailing stop activated for short");
        }
      }

      if (pos.trailingActivated) {
        const newStop = pos.lowestPrice * (1 + pos.trailingDistance);
        if (newStop < pos.stopLoss) {
          if (pos.stopLossOrderId) {
            await this.client.cancelOrder(pos.stopLossOrderId, this.symbol);
          }
          const stopLimitPrice = newStop * 1.001;
          const newSlOrder = await this.client.createStopLossOrder(
            this.symbol,
            "buy",
            pos.quantity,
            newStop,
            stopLimitPrice,
          );
          pos.stopLossOrderId = newSlOrder.id;
          pos.stopLoss = newStop;
          console.log(`Trailing stop updated to ${newStop}`);
        }
      }
    }
  }

  async closePositionMarket() {
    if (!this.activePosition)
      return { success: false, error: "No active position" };

    try {
      const pos = this.activePosition;
      const closeSide = pos.side === "long" ? "sell" : "buy";

      // Cancel existing SL/TP orders first
      if (pos.stopLossOrderId) {
        try {
          await this.client.cancelOrder(pos.stopLossOrderId, this.symbol);
          console.log("❌ Cancelled existing SL order");
        } catch (e) {
          console.warn("Could not cancel SL order:", e.message);
        }
      }
      if (pos.takeProfitOrderId) {
        try {
          await this.client.cancelOrder(pos.takeProfitOrderId, this.symbol);
          console.log("❌ Cancelled existing TP order");
        } catch (e) {
          console.warn("Could not cancel TP order:", e.message);
        }
      }

      // Close with market order
      await this.client.exchange.fapiPrivatePostOrder({
        symbol: this.symbol.replace("/", ""),
        side: closeSide.toUpperCase(),
        type: "MARKET",
        quantity: pos.quantity,
      });

      console.log(`✅ Position closed: ${pos.side} ${pos.quantity} @ market`);
      this.activePosition = null;
      return { success: true };
    } catch (error) {
      console.error("closePositionMarket error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async adjustStopLoss(newStopLoss) {
    if (!this.activePosition)
      return { success: false, error: "No active position" };

    try {
      const pos = this.activePosition;
      const closeSide = pos.side === "long" ? "sell" : "buy";

      // Cancel old SL order
      if (pos.stopLossOrderId) {
        try {
          await this.client.cancelOrder(pos.stopLossOrderId, this.symbol);
          console.log("❌ Cancelled old SL order");
        } catch (e) {
          console.warn("Could not cancel old SL:", e.message);
        }
      }

      // Place new SL order
      const newSlOrder = await this.client.createStopLossOrder(
        this.symbol,
        closeSide,
        pos.quantity,
        newStopLoss,
        newStopLoss * (pos.side === "long" ? 0.999 : 1.001),
      );

      pos.stopLossOrderId = newSlOrder.id;
      pos.stopLoss = newStopLoss;

      console.log(`🛑 Stop Loss adjusted to $${newStopLoss}`);
      return { success: true, stopLoss: newStopLoss };
    } catch (error) {
      console.error("adjustStopLoss error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async adjustTakeProfit(newTakeProfit) {
    if (!this.activePosition)
      return { success: false, error: "No active position" };

    try {
      const pos = this.activePosition;
      const closeSide = pos.side === "long" ? "sell" : "buy";

      // Cancel old TP order
      if (pos.takeProfitOrderId) {
        try {
          await this.client.cancelOrder(pos.takeProfitOrderId, this.symbol);
          console.log("❌ Cancelled old TP order");
        } catch (e) {
          console.warn("Could not cancel old TP:", e.message);
        }
      }

      // Place new TP order
      const newTpOrder = await this.client.createTakeProfitOrder(
        this.symbol,
        closeSide,
        pos.quantity,
        newTakeProfit,
      );

      pos.takeProfitOrderId = newTpOrder.id;
      pos.takeProfit = newTakeProfit;

      console.log(`🎯 Take Profit adjusted to $${newTakeProfit}`);
      return { success: true, takeProfit: newTakeProfit };
    } catch (error) {
      console.error("adjustTakeProfit error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async closePosition() {
    if (this.activePosition) {
      if (this.activePosition.stopLossOrderId) {
        await this.client.cancelOrder(
          this.activePosition.stopLossOrderId,
          this.symbol,
        );
      }
      if (this.activePosition.takeProfitOrderId) {
        await this.client.cancelOrder(
          this.activePosition.takeProfitOrderId,
          this.symbol,
        );
      }
      this.activePosition = null;
    }
  }
}

module.exports = OrderExecutor;
