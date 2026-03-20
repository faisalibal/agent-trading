# AI Trading Bot Dashboard

Real-time monitoring dashboard untuk AI-powered crypto trading bot.

## Features

- **Live Stats**: Balance, position, price, 24h range
- **Price Chart**: Candlestick chart dengan volume + entry/SL/TP lines
- **AI Decisions**: Timeline keputusan AI dengan reasoning
- **Order History**: Open orders + executed orders
- **News Feed**: Live crypto news dengan sentiment analysis
- **System Logs**: Full log stream dengan error highlighting

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: TailwindCSS + shadcn/ui
- **Charts**: TradingView Lightweight Charts
- **Icons**: Lucide React
- **Fonts**: Share Tech Mono + VT323 (digital/typewriter style)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
# Dashboard akan jalan di http://localhost:3939
```

## Production

### Build

```bash
npm run build
npm start
```

### PM2 (Recommended)

```bash
# Build dulu
npm run build

# Start dengan PM2
pm2 start ecosystem.config.js

# Atau manual
pm2 start npm --name "trading-dashboard" -- start

# Monitor
pm2 logs trading-dashboard
pm2 monit

# Stop
pm2 stop trading-dashboard
pm2 delete trading-dashboard
```

## Environment

Dashboard otomatis membaca `.env` dari parent directory (bot folder), jadi tidak perlu setup credentials ulang.

Required env vars (di parent `.env`):
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `BINANCE_BASE_URL` (optional, untuk testnet)
- `TRADING_SYMBOL`
- `LEVERAGE`
- `TIMEFRAME`

## API Endpoints

- `GET /api/dashboard` - Balance, position, ticker, open orders
- `GET /api/chart?limit=200` - OHLCV data untuk chart
- `GET /api/logs?date=YYYY-MM-DD` - Parse log files
- `GET /api/news` - Crypto news + sentiment

## Auto-Refresh

Dashboard auto-refresh setiap 30 detik untuk update data real-time.

## Port

Default port: **3939**

Bisa diubah di `package.json` atau `ecosystem.config.js`.
