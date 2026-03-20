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

  async executeDecision(decision, quantity) {
    const { action, entry_price, stop_loss, take_profit } = decision;
    try {
      await this.client.setLeverage(this.symbol, this.leverage);

      if (action === "BUY") {
        const order = await this.client.createLimitOrder(
          this.symbol,
          "buy",
          quantity,
          entry_price,
        );
        console.log("Buy order placed:", order);

        const stopLimitPrice = stop_loss * 0.999;
        const slOrder = await this.client.createStopLossOrder(
          this.symbol,
          "sell",
          quantity,
          stop_loss,
          stopLimitPrice,
        );
        const tpOrder = await this.client.createTakeProfitOrder(
          this.symbol,
          "sell",
          quantity,
          take_profit,
        );

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
        const order = await this.client.createLimitOrder(
          this.symbol,
          "sell",
          quantity,
          entry_price,
        );
        console.log("Sell order placed:", order);

        const stopLimitPrice = stop_loss * 1.001;
        const slOrder = await this.client.createStopLossOrder(
          this.symbol,
          "buy",
          quantity,
          stop_loss,
          stopLimitPrice,
        );
        const tpOrder = await this.client.createTakeProfitOrder(
          this.symbol,
          "buy",
          quantity,
          take_profit,
        );

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
