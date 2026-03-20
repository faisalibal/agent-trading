class DailyLossLimit {
  constructor(maxLossPercent, initialBalance) {
    this.maxLossPercent = maxLossPercent;
    this.initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.tradingStopped = false;
    this.resetTime = this._getStartOfDay();
  }

  _getStartOfDay() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  updateBalance(newBalance) {
    const now = Date.now();
    if (now - this.resetTime > 24 * 60 * 60 * 1000) {
      this.initialBalance = newBalance;
      this.currentBalance = newBalance;
      this.tradingStopped = false;
      this.resetTime = this._getStartOfDay();
    } else {
      this.currentBalance = newBalance;
    }

    const lossPercent =
      (this.initialBalance - this.currentBalance) / this.initialBalance;
    if (lossPercent >= this.maxLossPercent) {
      this.tradingStopped = true;
      console.error(
        `Daily loss limit reached (${(lossPercent * 100).toFixed(2)}%). Trading stopped.`,
      );
    }
  }

  canTrade() {
    return !this.tradingStopped;
  }
}

module.exports = DailyLossLimit;
