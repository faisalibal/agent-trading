const config = require("./config");

function calculatePositionSize(
  balance,
  entryPrice,
  stopLoss,
  riskPercent = 0.02,
  leverage = 10,
  minNotional = 100,
) {
  const riskAmount = balance * riskPercent;
  const priceDistance = Math.abs(entryPrice - stopLoss);
  if (priceDistance === 0) return 0;

  let quantity = riskAmount / priceDistance;

  const marginRequired = (quantity * entryPrice) / leverage;
  if (marginRequired > balance) {
    quantity = (balance * leverage) / entryPrice;
  }

  const notional = quantity * entryPrice;
  if (notional < minNotional) {
    console.warn(
      `Notional ${notional.toFixed(2)} below minimum ${minNotional}, cannot enter`,
    );
    return 0;
  }

  // Get precision based on symbol
  const symbol = config.trading.symbol;
  const symbolPrecision = {
    BTCUSDT: 3, // 0.001
    "BTC/USDT": 3,
    ETHUSDT: 3, // 0.001
    "ETH/USDT": 3,
    SOLUSDT: 2, // 0.01
    "SOL/USDT": 2,
    BNBUSDT: 2, // 0.01
    "BNB/USDT": 2,
    ADAUSDT: 0, // 1
    "ADA/USDT": 0,
    DOGEUSDT: 0, // 1
    "DOGE/USDT": 0,
    XRPUSDT: 0, // 1
    "XRP/USDT": 0,
  };

  const precision = symbolPrecision[symbol] || 3;
  const stepSize = Math.pow(10, -precision);

  quantity = Math.floor(quantity / stepSize) * stepSize;

  if (quantity < stepSize) return 0;
  return quantity;
}

module.exports = calculatePositionSize;
