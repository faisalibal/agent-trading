function calculatePositionSize(
  balance,
  entryPrice,
  stopLoss,
  riskPercent = 0.02,
  leverage = 10,
  minNotional = 5,
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
    console.warn(`Notional ${notional} terlalu kecil, tidak bisa entry`);
    return 0;
  }

  const stepSize = 0.001; // untuk BTCUSDT
  quantity = Math.floor(quantity / stepSize) * stepSize;

  if (quantity < stepSize) return 0;
  return quantity;
}

module.exports = calculatePositionSize;
