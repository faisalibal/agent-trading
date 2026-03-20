class PriceAlertService {
  constructor(symbol, thresholdPercent = 0.5) {
    this.symbol = symbol;
    this.thresholdPercent = thresholdPercent; // 0.5% movement triggers alert
    this.lastPrice = null;
    this.lastAlertTime = 0;
    this.minAlertInterval = 30 * 1000; // Minimum 30s between alerts
    this.priceHistory = [];
    this.maxHistorySize = 100;
  }

  checkPriceMovement(currentPrice) {
    const now = Date.now();
    
    // Store price history
    this.priceHistory.push({ price: currentPrice, timestamp: now });
    if (this.priceHistory.length > this.maxHistorySize) {
      this.priceHistory.shift();
    }

    if (!this.lastPrice) {
      this.lastPrice = currentPrice;
      return null;
    }

    const priceChange = ((currentPrice - this.lastPrice) / this.lastPrice) * 100;
    const absChange = Math.abs(priceChange);

    // Check if movement is significant and enough time has passed
    if (absChange >= this.thresholdPercent && now - this.lastAlertTime >= this.minAlertInterval) {
      this.lastAlertTime = now;
      this.lastPrice = currentPrice;
      
      return {
        type: priceChange > 0 ? 'SPIKE' : 'DROP',
        change: priceChange,
        currentPrice: currentPrice,
        message: `${priceChange > 0 ? '🚀' : '📉'} Price ${priceChange > 0 ? 'spiked' : 'dropped'} ${absChange.toFixed(2)}% to ${currentPrice}`
      };
    }

    // Update last price for small movements
    if (absChange < this.thresholdPercent) {
      this.lastPrice = currentPrice;
    }

    return null;
  }

  getVolatility() {
    if (this.priceHistory.length < 10) return 0;

    const recent = this.priceHistory.slice(-20);
    const prices = recent.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100; // Volatility as percentage
  }

  getRecentTrend(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentPrices = this.priceHistory.filter(p => p.timestamp >= cutoff);
    
    if (recentPrices.length < 2) return 'UNKNOWN';

    const firstPrice = recentPrices[0].price;
    const lastPrice = recentPrices[recentPrices.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (change > 0.3) return 'STRONG_UP';
    if (change > 0.1) return 'UP';
    if (change < -0.3) return 'STRONG_DOWN';
    if (change < -0.1) return 'DOWN';
    return 'SIDEWAYS';
  }

  reset() {
    this.lastPrice = null;
    this.lastAlertTime = 0;
  }
}

module.exports = PriceAlertService;
