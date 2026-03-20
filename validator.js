function validateDecision(decision, marketData, config) {
  if (!decision || decision.action === "HOLD") {
    return { action: "HOLD", reason: decision?.reason || "No decision" };
  }

  const { action } = decision;
  const currentPrice = marketData.lastPrice;
  const hasPosition = marketData.hasPosition;

  // === POSITION MANAGEMENT ACTIONS (when position is open) ===
  if (action === "CLOSE") {
    if (!hasPosition) {
      return { action: "HOLD", reason: "No position to close" };
    }
    return { action: "CLOSE", reason: decision.reason || "Manual close by AI" };
  }

  if (action === "ADJUST_SL") {
    if (!hasPosition) {
      return { action: "HOLD", reason: "No position to adjust SL" };
    }
    if (!decision.stop_loss || decision.stop_loss <= 0) {
      return {
        action: "HOLD",
        reason: "Invalid stop loss value for ADJUST_SL",
      };
    }
    // Validate SL direction
    if (
      marketData.positionSide === "long" &&
      decision.stop_loss >= currentPrice
    ) {
      return {
        action: "HOLD",
        reason: "SL for LONG must be below current price",
      };
    }
    if (
      marketData.positionSide === "short" &&
      decision.stop_loss <= currentPrice
    ) {
      return {
        action: "HOLD",
        reason: "SL for SHORT must be above current price",
      };
    }
    return {
      action: "ADJUST_SL",
      stop_loss: decision.stop_loss,
      reason: decision.reason || "Adjust stop loss",
    };
  }

  if (action === "ADJUST_TP") {
    if (!hasPosition) {
      return { action: "HOLD", reason: "No position to adjust TP" };
    }
    if (!decision.take_profit || decision.take_profit <= 0) {
      return {
        action: "HOLD",
        reason: "Invalid take profit value for ADJUST_TP",
      };
    }
    // Validate TP direction
    if (
      marketData.positionSide === "long" &&
      decision.take_profit <= currentPrice
    ) {
      return {
        action: "HOLD",
        reason: "TP for LONG must be above current price",
      };
    }
    if (
      marketData.positionSide === "short" &&
      decision.take_profit >= currentPrice
    ) {
      return {
        action: "HOLD",
        reason: "TP for SHORT must be below current price",
      };
    }
    return {
      action: "ADJUST_TP",
      take_profit: decision.take_profit,
      reason: decision.reason || "Adjust take profit",
    };
  }

  // === NEW POSITION ACTIONS (BUY/SELL when no position) ===
  if (action === "BUY" || action === "SELL") {
    if (hasPosition) {
      return {
        action: "HOLD",
        reason: "Position already open - use CLOSE/ADJUST instead",
      };
    }

    const { entry_price, stop_loss, take_profit } = decision;

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

  return { action: "HOLD", reason: `Unknown action: ${action}` };
}

module.exports = validateDecision;
