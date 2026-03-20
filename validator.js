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

  if (config.useHigherTimeframe) {
    if (action === "BUY" && marketData.higherTrend === "DOWNTREND") {
      return {
        action: "HOLD",
        reason: "Higher timeframe trend is down, avoid long",
      };
    }
    if (action === "SELL" && marketData.higherTrend === "UPTREND") {
      return {
        action: "HOLD",
        reason: "Higher timeframe trend is up, avoid short",
      };
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
  if (reward / risk < 2) {
    return { action: "HOLD", reason: "Risk/Reward too low" };
  }

  if (marketData.atr && risk < marketData.atr * 0.5) {
    return { action: "HOLD", reason: "Stop loss too tight relative to ATR" };
  }

  return decision;
}

module.exports = validateDecision;
