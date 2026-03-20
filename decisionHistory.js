class DecisionHistory {
  constructor(maxHistory = 10, maxAgeMinutes = 60) {
    this.maxHistory = maxHistory; // Max number of decisions to keep
    this.maxAgeMinutes = maxAgeMinutes; // Max age in minutes (default 1 hour)
    this.history = [];
  }

  addDecision(decision, marketPrice, reason) {
    const entry = {
      timestamp: new Date().toISOString(),
      timeAgo: "0m ago",
      action: decision.action,
      price: marketPrice,
      entry_price: decision.entry_price,
      stop_loss: decision.stop_loss,
      take_profit: decision.take_profit,
      reason: reason || decision.reason,
      executed: decision.action !== "HOLD",
      positionClosed: false,
    };

    this.history.unshift(entry); // Add to beginning

    // Keep only last N decisions
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    // Update timeAgo for all entries
    this.updateTimeAgo();
  }

  addPositionClose(closePrice, closeReason, pnl) {
    const entry = {
      timestamp: new Date().toISOString(),
      timeAgo: "0m ago",
      action: "POSITION_CLOSED",
      price: closePrice,
      reason: closeReason,
      pnl: pnl,
      executed: true,
      positionClosed: true,
    };

    this.history.unshift(entry);

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    this.updateTimeAgo();
  }

  updateTimeAgo() {
    const now = new Date();
    this.history.forEach((entry) => {
      const past = new Date(entry.timestamp);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 60) {
        entry.timeAgo = `${diffMins}m ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        entry.timeAgo = `${diffHours}h ago`;
      }
    });

    // Remove decisions older than maxAgeMinutes
    this.history = this.history.filter((entry) => {
      const past = new Date(entry.timestamp);
      const diffMins = Math.floor((now - past) / 60000);
      return diffMins <= this.maxAgeMinutes;
    });
  }

  getRecentDecisions(count = 5) {
    this.updateTimeAgo();
    return this.history.slice(0, count);
  }

  formatForPrompt() {
    const recent = this.getRecentDecisions(5); // Show only last 5 for readability

    if (recent.length === 0) {
      return "No previous decisions yet (first analysis)";
    }

    const totalInHistory = this.history.length;
    const oldestTime =
      this.history.length > 0
        ? this.history[this.history.length - 1].timeAgo
        : "0m";

    let output = `Your Recent Trading Decisions (showing last 5 of ${totalInHistory} decisions in past ${this.maxAgeMinutes}min):\n`;
    recent.forEach((entry, i) => {
      const action = entry.action;
      const executed = entry.executed ? "✓ Executed" : "✗ Held";

      if (action === "POSITION_CLOSED") {
        const pnlText =
          entry.pnl > 0
            ? `+${entry.pnl.toFixed(2)}%`
            : `${entry.pnl.toFixed(2)}%`;
        const emoji = entry.pnl > 0 ? "✅" : "❌";
        output += `${i + 1}. ${entry.timeAgo}: ${emoji} POSITION CLOSED at $${entry.price} (${pnlText} PnL) - ${entry.reason}\n`;
      } else if (action === "HOLD") {
        output += `${i + 1}. ${entry.timeAgo}: HOLD at $${entry.price} - ${entry.reason}\n`;
      } else {
        output += `${i + 1}. ${entry.timeAgo}: ${action} ${executed} at $${entry.entry_price} (SL: $${entry.stop_loss}, TP: $${entry.take_profit}) - ${entry.reason}\n`;
      }
    });
    return output;
  }

  getLastAction() {
    if (this.history.length === 0) return null;
    return this.history[0].action;
  }

  getConsecutiveHolds() {
    let count = 0;
    for (const entry of this.history) {
      if (entry.action === "HOLD") {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  getLastExecutedTrade() {
    return this.history.find((entry) => entry.executed) || null;
  }

  wasPositionRecentlyClosed(withinMinutes = 5) {
    const recentClose = this.history.find(
      (entry) => entry.action === "POSITION_CLOSED",
    );
    if (!recentClose) return false;

    const now = new Date();
    const closeTime = new Date(recentClose.timestamp);
    const diffMins = Math.floor((now - closeTime) / 60000);

    return diffMins <= withinMinutes;
  }

  getLastPositionClose() {
    return (
      this.history.find((entry) => entry.action === "POSITION_CLOSED") || null
    );
  }

  clear() {
    this.history = [];
  }
}

module.exports = DecisionHistory;
