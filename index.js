require("dotenv").config();
const BinanceClient = require("./binanceClient");
const MarketData = require("./marketData");
const GeminiService = require("./geminiService");
const validateDecision = require("./validator");
const calculatePositionSize = require("./riskManager");
const OrderExecutor = require("./orderExecutor");
const { cancelStaleOrders } = require("./positionManager");
const DailyLossLimit = require("./dailyLossLimit");
const CircuitBreaker = require("./circuitBreaker");
const Logger = require("./logger");
const config = require("./config");

const logger = new Logger();
const binanceClient = new BinanceClient(
  config.binance.apiKey,
  config.binance.apiSecret,
);
const marketDataCollector = new MarketData(
  binanceClient,
  config.trading.symbol,
  config.trading.timeframe,
  config.trading.higherTimeframe,
  config.trading.atrPeriod,
);
const gemini = new GeminiService(config.gemini.apiKey);
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

const TelegramBot = require("node-telegram-bot-api");
let bot;
if (config.telegram.token) {
  bot = new TelegramBot(config.telegram.token, { polling: false });
}

async function sendNotification(message) {
  if (bot && config.telegram.chatId) {
    try {
      await bot.sendMessage(config.telegram.chatId, message);
    } catch (e) {
      logger.error("Telegram send failed", e.message);
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

async function tradingJob() {
  if (circuitBreaker.isTripped()) {
    logger.warn("Circuit breaker tripped, skipping cycle");
    return;
  }

  if (!dailyLossLimit.canTrade()) {
    logger.warn("Daily loss limit reached, skipping cycle");
    return;
  }

  try {
    logger.info("Starting new cycle");

    const marketData = await marketDataCollector.collect();
    dailyLossLimit.updateBalance(marketData.usdtBalance);

    await orderExecutor.syncPosition();

    const prompt = gemini.buildPrompt(marketData);
    const decision = await gemini.getDecision(prompt);
    if (!decision) {
      logger.warn("No decision from Gemini");
      return;
    }
    logger.info("Gemini decision", decision);

    const validated = validateDecision(decision, marketData, config.trading);
    logger.info("Validated decision", validated);

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
        await orderExecutor.executeDecision(validated, quantity);
        await sendNotification(
          `🚀 Order executed: ${validated.action} ${quantity} at ${validated.entry_price}`,
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

setInterval(tradingJob, 5 * 60 * 1000);
setTimeout(tradingJob, 5000);
