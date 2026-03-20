# Testing Scripts

This folder contains all testing and utility scripts for the trading bot.

## Available Scripts

### 1. **test-binance-api.js** - API Integration Test

Full integration test for Binance Futures API.

```bash
# Run basic tests (no orders)
npm test

# Run full tests including order placement
npm run test:orders
```

**Tests:**

- ✅ Connection & Balance
- ✅ Set Leverage
- ✅ Market Data
- ✅ Position Check
- ✅ Order Size Calculation
- ✅ Market Order Placement
- ✅ Stop Loss (Algo Order)
- ✅ Take Profit (Algo Order)
- ✅ Get Open Orders
- ✅ Cancel Orders & Close Position

---

### 2. **manual-test-tpsl.js**

Manual test to verify TP/SL appears in Binance UI.

```bash
npm run test:tpsl
```

**What it does:**

- Opens a LONG position with MARKET order
- Places Stop Loss with `closePosition: true`
- Places Take Profit with `closePosition: true`
- **Keeps position OPEN** for UI verification

**After running:**

1. Go to https://testnet.binancefuture.com
2. Check "Positions" tab
3. Verify TP/SL values are displayed (not `--`)

---

### 3. **test-bot-monitoring.js** - Bot Monitoring & Position Management Test

Comprehensive test for bot production behavior.

```bash
npm run test:monitoring
```

**What it tests:**

- ✅ Position monitoring system
- ✅ Price change detection (30 seconds)
- ✅ Position open with TP/SL
- ✅ Monitoring loop (60 seconds, 10s intervals)
- ✅ TP/SL hit detection
- ✅ Position close detection
- ✅ Decision history tracking
- ✅ Auto cleanup

**Duration:** ~2 minutes

**Use case:** Verify bot correctly monitors positions and detects TP/SL hits.

---

### 4. **test-ai-with-position.js** - AI Decision Making with Active Position

Tests AI behavior when position is already open.

```bash
npm run test:ai
```

**What it tests:**

- ✅ AI decision making with active position (3 cycles)
- ✅ AI should HOLD and monitor (not flip-flop)
- ✅ Decision history influences AI
- ✅ AI context awareness
- ✅ Consistency check

**Duration:** ~2 minutes (3 cycles × 30 seconds)

**Use case:** Verify AI doesn't open opposite positions and maintains consistency.

---

### 5. **cleanup-position.js**

Cleanup utility to close all positions and cancel orders.

```bash
npm run cleanup
```

**What it does:**

- Closes all open positions
- Cancels all open orders (regular + algo)
- Verifies cleanup success

---

## Test Results

All tests should pass with these results:

```
✅ Passed: 9
❌ Failed: 0
⚠️  Warnings: 2 (balance 0 on testnet is normal)
```

---

## Important Notes

### Binance Futures Algo Order API

Stop Loss and Take Profit use **Algo Order API** with these parameters:

```javascript
{
  algoType: "CONDITIONAL",
  type: "STOP_MARKET" | "TAKE_PROFIT_MARKET",
  orderType: "STOP_MARKET" | "TAKE_PROFIT_MARKET",
  triggerPrice: number,
  closePosition: true  // Links TP/SL to position in UI
}
```

### Why `closePosition: true`?

- **Without it**: TP/SL shows as `--` in Binance UI
- **With it**: TP/SL values display correctly in position view
- **Requirement**: Position must exist before placing TP/SL

### Testnet Limitations

- SAPI endpoints don't work on testnet
- Use `fapiPrivate` endpoints instead
- Balance always shows 0 (normal for testnet)

---

## Troubleshooting

### Error: "TIF GTE can only be used with open positions"

**Cause:** Trying to place TP/SL with `closePosition: true` before position exists.

**Fix:** Open position first (MARKET order), then place TP/SL.

### Error: "Parameter 'reduceonly' sent when not required"

**Cause:** Sending `reduceOnly` with `closePosition: true`.

**Fix:** Don't send both - `closePosition: true` is sufficient.

### Error: "Unknown order sent" when canceling

**Cause:** Position closed, so `closePosition: true` orders auto-cancelled.

**Fix:** This is normal behavior - orders cancel when position closes.

---

## File Structure

```
tests/
├── README.md                    # This file
├── test-binance-api.js          # API integration test
├── manual-test-tpsl.js          # Manual TP/SL UI verification
├── test-bot-monitoring.js       # Bot monitoring & position management
├── test-ai-with-position.js     # AI decision making test
└── cleanup-position.js          # Cleanup utility
```

## Test Execution Order (Recommended)

For complete bot verification, run tests in this order:

```bash
# 1. API Integration (5 minutes)
npm run test:orders

# 2. TP/SL UI Verification (manual check)
npm run test:tpsl
# → Check Binance UI, then cleanup

# 3. Bot Monitoring (2 minutes)
npm run test:monitoring

# 4. AI Decision Making (2 minutes)
npm run test:ai

# 5. Final Cleanup
npm run cleanup
```

**Total time:** ~10-15 minutes for complete bot verification
