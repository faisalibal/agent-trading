require("dotenv").config();

module.exports = {
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    baseURL: process.env.BINANCE_BASE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  trading: {
    symbol: process.env.TRADING_SYMBOL || "BTCUSDT",
    riskPerTrade: parseFloat(process.env.RISK_PER_TRADE) || 0.02,
    leverage: parseInt(process.env.LEVERAGE) || 10,
    maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 1,
    timeframe: process.env.TIMEFRAME || "5m",
    higherTimeframe: process.env.HIGHER_TIMEFRAME || "1h",
    useHigherTimeframe: process.env.USE_HIGHER_TIMEFRAME === "true",
    atrPeriod: parseInt(process.env.ATR_PERIOD) || 14,
    maxDailyLossPercent: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT) || 0.05,
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};
