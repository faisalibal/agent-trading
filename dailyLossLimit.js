class DailyLossLimit {
  constructor(maxLossPercent, initialBalance) {
    this.maxLossPercent = maxLossPercent;
    this.initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.tradingStopped = false;
    this.resetTime = this._getStartOfDay();
    this.consecutiveLosses = 0;
    this.maxConsecutiveLosses = 3;
    this.lastBalance = initialBalance;
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
      this.consecutiveLosses = 0;
      this.lastBalance = newBalance;
    } else {
      if (newBalance < this.lastBalance) {
        this.consecutiveLosses++;
        console.warn(`⚠️  Consecutive loss #${this.consecutiveLosses}`);

        if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
          this.tradingStopped = true;
          console.error(
            `🛑 ${this.maxConsecutiveLosses} consecutive losses detected. Trading stopped to prevent revenge trading. Will resume tomorrow.`,
          );
        }
      } else if (newBalance > this.lastBalance) {
        this.consecutiveLosses = 0;
      }

      this.lastBalance = newBalance;
      this.currentBalance = newBalance;
    }

    const lossPercent =
      (this.initialBalance - this.currentBalance) / this.initialBalance;
    if (lossPercent >= this.maxLossPercent) {
      this.tradingStopped = true;
      console.error(
        `🛑 Daily loss limit reached (${(lossPercent * 100).toFixed(2)}%). Trading stopped until tomorrow.`,
      );
    }
  }

  canTrade() {
    return !this.tradingStopped;
  }
}

module.exports = DailyLossLimit;
