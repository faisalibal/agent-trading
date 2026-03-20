require("dotenv").config();
const BinanceClient = require("./binanceClient");
const MarketData = require("./marketData");
const GeminiService = require("./geminiService");
const NewsService = require("./newsService");
const PriceAlertService = require("./priceAlertService");
const validateDecision = require("./validator");
const calculatePositionSize = require("./riskManager");
const OrderExecutor = require("./orderExecutor");
const { cancelStaleOrders } = require("./positionManager");
const DailyLossLimit = require("./dailyLossLimit");
const CircuitBreaker = require("./circuitBreaker");
const Logger = require("./logger");
const DecisionHistory = require("./decisionHistory");
const decisionHistory = new DecisionHistory(50, 60); // Keep up to 50 decisions, max 60 minutes old
const config = require("./config");

const logger = new Logger();
const binanceClient = new BinanceClient(
  config.binance.apiKey,
  config.binance.apiSecret,
  config.binance.baseURL,
);
const marketDataCollector = new MarketData(
  binanceClient,
  config.trading.symbol,
  config.trading.timeframe,
  config.trading.higherTimeframe,
  config.trading.atrPeriod,
);
const gemini = new GeminiService(config.gemini.apiKey);
const newsService = new NewsService();
const priceAlertService = new PriceAlertService(config.trading.symbol, 0.5);
const orderExecutor = new OrderExecutor(
  binanceClient,
  config.trading.symbol,
  config.trading.leverage,
);
const dailyLossLimit = new DailyLossLimit(
  config.trading.maxDailyLossPercent,
  0,
);
const circuitBreaker = new CircuitBreaker(5);

const { Bot } = require("grammy");

let bot;
if (config.telegram.token) {
  bot = new Bot(config.telegram.token);
}

async function sendNotification(message) {
  if (bot && config.telegram.chatId) {
    try {
      await bot.api.sendMessage(config.telegram.chatId, message);
      console.log("Telegram sent:", message.substring(0, 30) + "...");
    } catch (e) {
      // Gramy memberikan error lebih detail
      const errorMsg = e.description || e.message || "Unknown error";
      console.error("Telegram send failed:", errorMsg);
      // Jika Anda punya logger, bisa tetap gunakan:
      // logger.error('Telegram send failed', errorMsg);
    }
  }
}

(async () => {
  try {
    await binanceClient.setLeverage(
      config.trading.symbol,
      config.trading.leverage,
    );
    logger.info(`Leverage set to ${config.trading.leverage}x`);
    const balance = await binanceClient.getBalance();
    const usdt = balance.USDT?.free || 0;
    dailyLossLimit.initialBalance = usdt;
    dailyLossLimit.currentBalance = usdt;
    logger.info(`Initial balance: ${usdt} USDT`);

    // Sync existing positions on startup
    const existingPosition = await orderExecutor.syncPosition();
    if (existingPosition) {
      logger.info("Existing position detected on startup", {
        side: existingPosition.side,
        quantity: existingPosition.quantity,
        entryPrice: existingPosition.entryPrice,
        stopLoss: existingPosition.stopLoss,
        takeProfit: existingPosition.takeProfit,
      });
      await sendNotification(
        `🔄 Bot restarted - existing ${existingPosition.side.toUpperCase()} position detected\n` +
          `Entry: ${existingPosition.entryPrice}\n` +
          `Qty: ${existingPosition.quantity}\n` +
          `SL: ${existingPosition.stopLoss || "N/A"}\n` +
          `TP: ${existingPosition.takeProfit || "N/A"}`,
      );
    } else {
      logger.info("No existing position found on startup");
    }
  } catch (e) {
    logger.error("Init error", e.message);
    process.exit(1);
  }
})();

setInterval(async () => {
  await orderExecutor.syncPosition();
}, 30 * 1000);

setInterval(async () => {
  if (orderExecutor.activePosition) {
    try {
      const markPrice = await binanceClient.getMarkPrice(config.trading.symbol);
      await orderExecutor.updateTrailingStop(markPrice);
    } catch (e) {
      logger.error("Trailing update error", e.message);
    }
  }
}, 10 * 1000);

setInterval(
  async () => {
    await cancelStaleOrders(binanceClient, config.trading.symbol);
  },
  60 * 60 * 1000,
);

async function tradingJob(isAlertTriggered = false) {
  if (circuitBreaker.isTripped()) {
    logger.warn("Circuit breaker tripped, skipping cycle");
    return;
  }

  // Daily loss limit disabled - allow continuous trading
  // if (!dailyLossLimit.canTrade()) {
  //   logger.warn("Daily loss limit reached, skipping cycle");
  //   return;
  // }

  try {
    const cycleType = isAlertTriggered
      ? "Alert-triggered cycle"
      : "Regular cycle";
    logger.info(`Starting ${cycleType}`);

    const marketData = await marketDataCollector.collect();
    dailyLossLimit.updateBalance(marketData.usdtBalance);

    await orderExecutor.syncPosition();

    // Fetch latest news and sentiment
    const news = await newsService.getLatestNews();
    const newsContext = newsService.formatNewsForPrompt(news);
    const sentiment = newsService.getSentimentSummary(news);

    // Get recent price trend
    const recentTrend = priceAlertService.getRecentTrend(5);
    const volatility = priceAlertService.getVolatility();

    // Add context to market data
    marketData.newsContext = newsContext;
    marketData.newsSentiment = sentiment.overall;
    marketData.recentTrend = recentTrend;
    marketData.volatility = volatility;
    marketData.isAlertTriggered = isAlertTriggered;
    marketData.leverage = config.trading.leverage;

    // Add current position SL/TP info for AI awareness
    if (orderExecutor.activePosition) {
      marketData.currentStopLoss = orderExecutor.activePosition.stopLoss;
      marketData.currentTakeProfit = orderExecutor.activePosition.takeProfit;
    }

    // Add decision history context
    marketData.decisionHistory = decisionHistory.formatForPrompt();
    marketData.consecutiveHolds = decisionHistory.getConsecutiveHolds();
    marketData.lastAction = decisionHistory.getLastAction();

    const prompt = gemini.buildPrompt(marketData);
    const decision = await gemini.getDecision(prompt);
    if (!decision) {
      logger.warn("No decision from Gemini");
      return;
    }
    logger.info("Gemini decision", decision);

    const validated = validateDecision(decision, marketData, config.trading);
    logger.info("Validated decision", validated);

    // Save decision to history
    const currentPrice = marketData.lastPrice;
    decisionHistory.addDecision(validated, currentPrice, validated.reason);

    // === Handle CLOSE action ===
    if (validated.action === "CLOSE") {
      const result = await orderExecutor.closePositionMarket();
      if (result.success) {
        logger.info("Position closed by AI", { reason: validated.reason });
        await sendNotification(
          `🔒 Position CLOSED by AI\nReason: ${validated.reason}`,
        );
        decisionHistory.addDecision(
          { action: "POSITION_CLOSED" },
          currentPrice,
          validated.reason,
        );
      } else {
        logger.error("Failed to close position", result.error);
      }
    }

    // === Handle ADJUST_SL action ===
    if (validated.action === "ADJUST_SL") {
      const result = await orderExecutor.adjustStopLoss(validated.stop_loss);
      if (result.success) {
        logger.info("Stop loss adjusted by AI", {
          newSL: validated.stop_loss,
          reason: validated.reason,
        });
        await sendNotification(
          `🛑 SL adjusted to $${validated.stop_loss}\nReason: ${validated.reason}`,
        );
      } else {
        logger.error("Failed to adjust SL", result.error);
      }
    }

    // === Handle ADJUST_TP action ===
    if (validated.action === "ADJUST_TP") {
      const result = await orderExecutor.adjustTakeProfit(
        validated.take_profit,
      );
      if (result.success) {
        logger.info("Take profit adjusted by AI", {
          newTP: validated.take_profit,
          reason: validated.reason,
        });
        await sendNotification(
          `🎯 TP adjusted to $${validated.take_profit}\nReason: ${validated.reason}`,
        );
      } else {
        logger.error("Failed to adjust TP", result.error);
      }
    }

    // === Handle BUY/SELL action (new position) ===
    if (
      (validated.action === "BUY" || validated.action === "SELL") &&
      !marketData.hasPosition
    ) {
      const balance = marketData.usdtBalance;
      const quantity = calculatePositionSize(
        balance,
        validated.entry_price,
        validated.stop_loss,
        config.trading.riskPerTrade,
        config.trading.leverage,
      );
      if (quantity > 0) {
        const executionOptions = {
          useLimitOrder: config.trading.useLimitOrder,
          limitTimeout: config.trading.limitTimeout,
          limitPriceOffset: config.trading.limitPriceOffset,
        };

        await orderExecutor.executeDecision(
          validated,
          quantity,
          executionOptions,
        );
        await sendNotification(
          `🚀 ${validated.action} ${quantity} @ $${validated.entry_price}\nSL: $${validated.stop_loss} | TP: $${validated.take_profit}\nReason: ${validated.reason}`,
        );
        logger.info("Order executed", {
          action: validated.action,
          quantity,
          price: validated.entry_price,
        });
      } else {
        logger.warn("Quantity zero, skip");
        await sendNotification("⚠️ Quantity zero, no order placed");
      }
    }

    circuitBreaker.recordSuccess();
  } catch (error) {
    logger.error("Cycle error", error.message);
    circuitBreaker.recordError();
    await sendNotification(`❌ Error: ${error.message}`);
  }
}

// Price monitoring every 30 seconds
let lastTradingAttempt = 0;
const minTradingInterval = 2 * 60 * 1000; // Minimum 2 minutes between trading attempts

setInterval(async () => {
  try {
    const ticker = await binanceClient.getTicker(config.trading.symbol);
    const currentPrice = ticker.last;

    // Check for significant price movement
    const alert = priceAlertService.checkPriceMovement(currentPrice);

    if (alert) {
      logger.info(`Price Alert: ${alert.message}`);
      await sendNotification(alert.message);

      // Trigger trading check on significant movement (if enough time has passed)
      const now = Date.now();
      if (now - lastTradingAttempt >= minTradingInterval) {
        logger.info(
          "Significant price movement detected, triggering trading analysis...",
        );
        lastTradingAttempt = now;
        setTimeout(() => tradingJob(true), 1000); // Pass true to indicate alert-triggered
      }
    }
  } catch (error) {
    // Silent fail for monitoring, don't spam logs
  }
}, 30 * 1000);

// Position monitoring - check if position was closed (TP/SL hit)
let lastKnownPosition = null;
setInterval(async () => {
  try {
    const currentPosition = await orderExecutor.syncPosition();

    // Detect position close
    if (lastKnownPosition && !currentPosition) {
      // Position was closed!
      const ticker = await binanceClient.getTicker(config.trading.symbol);
      const closePrice = ticker.last;

      // Calculate PnL
      const entryPrice = lastKnownPosition.entryPrice;
      const pnlPercent =
        lastKnownPosition.side === "long"
          ? ((closePrice - entryPrice) / entryPrice) *
            100 *
            config.trading.leverage
          : ((entryPrice - closePrice) / entryPrice) *
            100 *
            config.trading.leverage;

      // Determine close reason
      let closeReason = "Position closed";
      if (closePrice >= lastKnownPosition.takeProfit - 1) {
        closeReason = "Take Profit hit ✅";
      } else if (closePrice <= lastKnownPosition.stopLoss + 1) {
        closeReason = "Stop Loss hit ❌";
      }

      // Record to decision history
      decisionHistory.addPositionClose(closePrice, closeReason, pnlPercent);

      logger.info(
        `Position closed: ${closeReason} at $${closePrice}, PnL: ${pnlPercent.toFixed(2)}%`,
      );
      await sendNotification(
        `${closeReason}\nClose: $${closePrice}\nPnL: ${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`,
      );
    }

    lastKnownPosition = currentPosition;
  } catch (error) {
    // Silent fail
  }
}, 30 * 1000); // Check every 30 seconds

// Regular trading cycle every 3 minutes (reduced from 5)
setInterval(() => tradingJob(false), 3 * 60 * 1000);
setTimeout(() => tradingJob(false), 5000);
