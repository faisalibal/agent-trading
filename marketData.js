const ta = require("technicalindicators");

class MarketData {
  constructor(client, symbol, timeframe, higherTimeframe, atrPeriod) {
    this.client = client;
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.higherTimeframe = higherTimeframe;
    this.atrPeriod = atrPeriod;
  }

  async collect() {
    const [
      ohlcv,
      ohlcvHigher,
      orderBook,
      ticker,
      balance,
      position,
      fundingRate,
    ] = await Promise.all([
      this.client.getOHLCV(this.symbol, this.timeframe, 100),
      this.client.getOHLCV(this.symbol, this.higherTimeframe, 50),
      this.client.getOrderBook(this.symbol),
      this.client.getTicker(this.symbol),
      this.client.getBalance(),
      this.client.getPositions(this.symbol),
      this.client.getFundingRate(this.symbol),
    ]);

    const closes = ohlcv.map((c) => c.close);
    const highs = ohlcv.map((c) => c.high);
    const lows = ohlcv.map((c) => c.low);
    const volumes = ohlcv.map((c) => c.volume);

    const ema9 = ta.EMA.calculate({ period: 9, values: closes });
    const ema20 = ta.EMA.calculate({ period: 20, values: closes });
    const rsi = ta.RSI.calculate({ period: 14, values: closes });
    const macd = ta.MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closes,
    }).pop();

    const atr = ta.ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: this.atrPeriod,
    }).pop();

    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = volumes[volumes.length - 1] / avgVolume;

    const bidVolume = orderBook.bids
      .slice(0, 5)
      .reduce((sum, [p, v]) => sum + v, 0);
    const askVolume = orderBook.asks
      .slice(0, 5)
      .reduce((sum, [p, v]) => sum + v, 0);
    const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);

    const closesHigher = ohlcvHigher.map((c) => c.close);
    const ema50Higher = ta.EMA.calculate({
      period: 50,
      values: closesHigher,
    }).pop();
    const lastHigherClose = closesHigher[closesHigher.length - 1];
    const higherTrend = lastHigherClose > ema50Higher ? "UPTREND" : "DOWNTREND";

    const hasPosition = position && position.contracts > 0;
    const positionSide = hasPosition
      ? position.side === "long"
        ? "long"
        : "short"
      : null;
    const entryPrice = position?.entryPrice || null;
    const positionAmount = position?.contracts || 0;
    const unrealizedPnl = position?.unrealizedPnl || 0;

    const usdtBalance = balance.USDT?.free || 0;

    return {
      lastPrice: closes[closes.length - 1],
      ema9: ema9[ema9.length - 1],
      ema20: ema20[ema20.length - 1],
      rsi: rsi[rsi.length - 1],
      macd,
      atr,
      support: recentLow,
      resistance: recentHigh,
      volumeRatio,
      bidVolume,
      askVolume,
      imbalance,
      priceChange24h: ticker.percentage,
      higherTrend,
      fundingRate,
      hasPosition,
      positionSide,
      entryPrice,
      positionAmount,
      unrealizedPnl,
      usdtBalance,
      ohlcv: ohlcv.slice(-5),
    };
  }
}

module.exports = MarketData;
