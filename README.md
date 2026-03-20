# 🤖 AI Crypto Trading Bot - Binance Futures

Bot trading otomatis untuk Binance Futures menggunakan AI (Google Gemini) untuk analisis dan pengambilan keputusan trading.

## ✨ Fitur Utama

### 🎯 Trading Features

- ✅ **Long & Short Trading** - Fully support dua arah
- ✅ **AI-Powered Decisions** - Menggunakan Google Gemini AI dengan news context
- ✅ **Real-Time Price Monitoring** - Cek harga setiap 30 detik
- ✅ **Market Sentiment Analysis** - Real-time market data dari CoinGecko (100% gratis)
- ✅ **Smart Alert System** - Auto-trigger trading saat pergerakan signifikan (>0.5%)
- ✅ **Trend Following** - Prioritas trading searah trend
- ✅ **Counter-Trend Protection** - Validasi ketat untuk counter-trend trades
- ✅ **Trailing Stop Loss** - Otomatis mengikuti profit
- ✅ **Multiple Timeframe Analysis** - 5m untuk entry, 1h untuk trend

### 🛡️ Risk Management

- ✅ **Position Sizing** - Otomatis berdasarkan risk per trade
- ✅ **Stop Loss & Take Profit** - Otomatis untuk setiap trade
- ✅ **Daily Loss Limit** - Stop trading jika loss harian tercapai
- ✅ **Consecutive Loss Protection** - Stop setelah 3 loss berturut-turut
- ✅ **Circuit Breaker** - Proteksi dari error berulang
- ✅ **Volume Confirmation** - Validasi volume untuk signal quality

### 📊 Technical Indicators

- EMA (9, 20, 50)
- RSI (14)
- MACD
- ATR (Average True Range)
- Support & Resistance
- Volume Analysis
- Order Book Imbalance
- Funding Rate

### ⚡ Real-Time Monitoring

- **Price Check**: Every 30 seconds
- **Alert Trigger**: >0.5% price movement
- **Trading Cycle**: Every 3 minutes (or on alert)
- **News Update**: Every 5 minutes (cached)
- **Position Sync**: Every 30 seconds
- **Trailing Stop**: Every 10 seconds

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
nano .env
```

Isi dengan API keys Anda:

- Binance API Key & Secret (testnet atau production)
- Gemini API Key
- Telegram Bot Token (optional tapi recommended)

**Note:** Market sentiment menggunakan CoinGecko API yang 100% gratis, tidak perlu API key tambahan!

### 3. Run Bot

**Testnet (Testing):**

```bash
# Pastikan BINANCE_BASE_URL=https://testnet.binancefuture.com
npm start
```

**Production (Live Trading):**

```bash
# Pastikan BINANCE_BASE_URL kosong atau dihapus
npm start
```

**With PM2 (Recommended for 24/7):**

```bash
pm2 start index.js --name crypto-bot
pm2 save
pm2 startup
```

## ⚙️ Configuration

### Risk Settings (Recommended)

| Setting                  | Conservative | Moderate  | Aggressive |
| ------------------------ | ------------ | --------- | ---------- |
| `RISK_PER_TRADE`         | 0.01 (1%)    | 0.02 (2%) | 0.03 (3%)  |
| `LEVERAGE`               | 3x           | 5x        | 10x        |
| `MAX_DAILY_LOSS_PERCENT` | 0.03 (3%)    | 0.05 (5%) | 0.10 (10%) |
| `USE_HIGHER_TIMEFRAME`   | true         | true      | false      |

### Trading Logic

#### Trend-Following Trades (Prioritas)

- **Risk/Reward**: Minimal 1:2
- **Volume**: Normal (0.8x - 1.5x average)
- **Trend**: Searah dengan higher timeframe
- **Success Rate**: ~60-70%

#### Counter-Trend Trades (Selektif)

- **Risk/Reward**: Minimal 1:3 (lebih ketat)
- **Volume**: Minimal 1.5x average (konfirmasi kuat)
- **Conditions**: RSI extreme, support/resistance kuat
- **Success Rate**: ~40-50%

## 📁 Project Structure

```
agent-trading/
├── index.js              # Main entry point
├── binanceClient.js      # Binance API wrapper
├── marketData.js         # Market data collector
├── geminiService.js      # AI decision maker
├── validator.js          # Decision validator
├── orderExecutor.js      # Order execution & management
├── riskManager.js        # Position size calculator
├── dailyLossLimit.js     # Daily loss protection
├── circuitBreaker.js     # Error protection
├── positionManager.js    # Position management utilities
├── logger.js             # Logging system
├── config.js             # Configuration loader
└── logs/                 # Daily log files
```

## 🔒 Security Best Practices

1. **API Key Security**
   - ✅ Disable withdrawal permission
   - ✅ Enable IP whitelist
   - ✅ Never commit `.env` to Git
   - ✅ Use testnet for testing

2. **Risk Management**
   - ✅ Start with small capital
   - ✅ Never risk more than 1-2% per trade
   - ✅ Set daily loss limit
   - ✅ Monitor regularly

3. **Monitoring**
   - ✅ Enable Telegram notifications
   - ✅ Check logs daily
   - ✅ Review performance weekly

## 📊 Monitoring & Logs

### View Logs

```bash
# Today's log
tail -f logs/$(date +%Y-%m-%d).log

# PM2 logs
pm2 logs crypto-bot
```

### Stop Bot

```bash
# If running with npm
pkill -f "node index.js"

# If running with PM2
pm2 stop crypto-bot
```

## 🎯 Performance Optimization

### Higher Timeframe Filter

**Enabled (Recommended for beginners):**

```env
USE_HIGHER_TIMEFRAME=true
```

- Lebih sedikit trades, tapi quality lebih tinggi
- Win rate lebih tinggi (~60-70%)
- Risk lebih rendah

**Disabled (For experienced traders):**

```env
USE_HIGHER_TIMEFRAME=false
```

- Lebih banyak trading opportunities
- Termasuk counter-trend trades
- Risk lebih tinggi, butuh monitoring ketat

## ⚠️ Disclaimer

**TRADING CRYPTOCURRENCY DENGAN LEVERAGE SANGAT BERISIKO!**

- Bot ini adalah tools, bukan jaminan profit
- Hanya gunakan uang yang siap Anda rugikan
- Past performance tidak menjamin future results
- Selalu monitor dan evaluasi performance
- Mulai dengan modal kecil untuk testing

## 📞 Support

Jika ada masalah:

1. Check logs di folder `/logs`
2. Pastikan API keys valid
3. Pastikan balance cukup di Binance
4. Check Telegram notifications untuk error alerts

## 📝 Changelog

### v3.1.0 (Latest - Real-Time Edition)

- ✅ **Real-time price monitoring** - Check setiap 30 detik
- ✅ **News & sentiment analysis** - CryptoPanic API integration
- ✅ **Smart alert system** - Auto-trigger pada pergerakan >0.5%
- ✅ **Faster trading cycle** - 3 menit (dari 5 menit)
- ✅ **Volatility-aware decisions** - Dynamic stop loss berdasarkan volatilitas
- ✅ **Momentum detection** - 5-minute trend analysis
- ✅ **Context-aware AI** - Gemini AI dengan news + technical + sentiment

### v3.0.0

- ✅ Full support untuk testnet Binance Futures
- ✅ Improved AI prompt untuk better decisions
- ✅ Counter-trend trade validation dengan R:R 1:3
- ✅ Volume confirmation untuk signal quality
- ✅ Consecutive loss protection (stop after 3 losses)
- ✅ Enhanced logging dan error handling

---

**Happy Trading! 🚀**

Remember: The best trade is sometimes no trade at all.
