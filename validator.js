function validateDecision(decision, marketData, config) {
  if (!decision || decision.action === "HOLD") {
    return { action: "HOLD", reason: decision?.reason || "No decision" };
  }

  const { action, entry_price, stop_loss, take_profit } = decision;
  const currentPrice = marketData.lastPrice;
  const hasPosition = marketData.hasPosition;

  if (hasPosition) {
    return { action: "HOLD", reason: "Position already open" };
  }

  let isCounterTrend = false;
  if (config.useHigherTimeframe) {
    if (action === "BUY" && marketData.higherTrend === "DOWNTREND") {
      isCounterTrend = true;
      console.warn("⚠️  Counter-trend LONG detected (higher TF is DOWN)");
    }
    if (action === "SELL" && marketData.higherTrend === "UPTREND") {
      isCounterTrend = true;
      console.warn("⚠️  Counter-trend SHORT detected (higher TF is UP)");
    }
  }

  if (Math.abs(entry_price - currentPrice) / currentPrice > 0.005) {
    return { action: "HOLD", reason: "Entry price too far from market" };
  }

  if (action === "BUY") {
    if (stop_loss >= entry_price || take_profit <= entry_price) {
      return { action: "HOLD", reason: "Invalid SL/TP for BUY" };
    }
  } else if (action === "SELL") {
    if (stop_loss <= entry_price || take_profit >= entry_price) {
      return { action: "HOLD", reason: "Invalid SL/TP for SELL" };
    }
  } else {
    return { action: "HOLD", reason: "Unknown action" };
  }

  const risk = Math.abs(entry_price - stop_loss);
  const reward = Math.abs(take_profit - entry_price);
  const minRR = isCounterTrend ? 3 : 2;
  if (reward / risk < minRR) {
    return {
      action: "HOLD",
      reason: isCounterTrend
        ? `Counter-trend trade requires R:R >= 1:3, got 1:${(reward / risk).toFixed(1)}`
        : "Risk/Reward too low (minimum 1:2)",
    };
  }

  if (marketData.atr && risk < marketData.atr * 0.5) {
    return { action: "HOLD", reason: "Stop loss too tight relative to ATR" };
  }

  if (isCounterTrend && marketData.volumeRatio < 1.5) {
    return {
      action: "HOLD",
      reason:
        "Counter-trend trade requires strong volume confirmation (1.5x avg)",
    };
  }

  return decision;
}

module.exports = validateDecision;
