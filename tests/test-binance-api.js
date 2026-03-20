/**
 * Binance API Integration Test
 *
 * Test semua fungsi critical untuk trading:
 * 1. Connection & Balance
 * 2. Market Data
 * 3. Order Placement (Limit Order)
 * 4. Stop Loss Order
 * 5. Take Profit Order
 * 6. Order Cancellation
 * 7. Position Management
 */

require("dotenv").config();
const BinanceClient = require("../binanceClient");
const config = require("../config");

const binanceClient = new BinanceClient(
  config.binance.apiKey,
  config.binance.apiSecret,
  config.binance.baseURL,
);

const symbol = config.trading.symbol;
const leverage = config.trading.leverage;

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function logTest(name, status, message) {
  const emoji = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
  console.log(`${emoji} ${name}: ${message}`);

  if (status === "pass") results.passed.push(name);
  else if (status === "fail") results.failed.push(name);
  else results.warnings.push(name);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("\n🧪 Starting Binance API Integration Tests...\n");
  console.log("=".repeat(60));

  try {
    // Test 1: Connection & Balance
    console.log("\n📊 Test 1: Connection & Balance");
    console.log("-".repeat(60));

    const balance = await binanceClient.getBalance();
    if (balance && balance > 0) {
      logTest("Get Balance", "pass", `Balance: ${balance} USDT`);
    } else {
      logTest("Get Balance", "warn", "Balance is 0 or undefined");
    }

    // Test 2: Set Leverage
    console.log("\n⚙️  Test 2: Set Leverage");
    console.log("-".repeat(60));

    await binanceClient.setLeverage(symbol, leverage);
    logTest("Set Leverage", "pass", `Leverage set to ${leverage}x`);

    // Test 3: Get Market Data
    console.log("\n📈 Test 3: Market Data");
    console.log("-".repeat(60));

    const ticker = await binanceClient.getTicker(symbol);
    if (ticker && ticker.last) {
      logTest("Get Ticker", "pass", `Current price: $${ticker.last}`);
      console.log(`   Bid: $${ticker.bid} | Ask: $${ticker.ask}`);
      console.log(`   24h Volume: ${ticker.baseVolume}`);
    } else {
      logTest("Get Ticker", "fail", "Failed to get ticker data");
      return;
    }

    const currentPrice = ticker.last;

    // Test 4: Check Existing Positions
    console.log("\n📍 Test 4: Check Existing Positions");
    console.log("-".repeat(60));

    const position = await binanceClient.getPositions(symbol);
    if (position && position.contracts !== 0) {
      logTest(
        "Check Position",
        "warn",
        `Existing position found: ${position.side} ${Math.abs(position.contracts)} contracts`,
      );
      console.log(
        "   ⚠️  Please close existing position before running order tests",
      );
      console.log("   Skipping order placement tests...");

      // Show summary and exit
      showSummary();
      return;
    } else {
      logTest("Check Position", "pass", "No existing position");
    }

    // Test 5: Calculate Test Order Size
    console.log("\n🧮 Test 5: Calculate Order Size");
    console.log("-".repeat(60));

    // Binance requires minimum $100 notional value
    const minNotional = 100;

    // Get precision based on symbol (quantity decimals)
    const symbolPrecision = {
      BTCUSDT: 3, // 0.001
      ETHUSDT: 3, // 0.001
      SOLUSDT: 2, // 0.01
      BNBUSDT: 2, // 0.01
      ADAUSDT: 0, // 1
      DOGEUSDT: 0, // 1
      XRPUSDT: 0, // 1
    };

    const precision = symbolPrecision[symbol] || 3;
    const multiplier = Math.pow(10, precision);

    const rawQuantity = minNotional / currentPrice;
    const testQuantity = Math.ceil(rawQuantity * multiplier) / multiplier; // Round up to correct precision
    const testEntryPrice = currentPrice;
    const testStopLoss = testEntryPrice * 0.99; // 1% below entry
    const testTakeProfit = testEntryPrice * 1.02; // 2% above entry
    const orderValue = testQuantity * testEntryPrice;

    console.log(`   Test Quantity: ${testQuantity} BTC`);
    console.log(`   Entry Price: $${testEntryPrice}`);
    console.log(
      `   Order Value: $${orderValue.toFixed(2)} (min $100 required)`,
    );
    console.log(`   Stop Loss: $${testStopLoss.toFixed(2)} (-1%)`);
    console.log(`   Take Profit: $${testTakeProfit.toFixed(2)} (+2%)`);

    if (orderValue < 100) {
      logTest(
        "Calculate Order Size",
        "fail",
        `Order value $${orderValue.toFixed(2)} is below minimum $100`,
      );
      showSummary();
      return;
    }

    logTest("Calculate Order Size", "pass", "Test parameters calculated");

    // Ask user confirmation
    console.log("\n⚠️  IMPORTANT: Order Placement Test");
    console.log("-".repeat(60));
    console.log("The next tests will place REAL orders on Binance testnet:");
    console.log(
      `   - BUY ${testQuantity} BTC at $${testEntryPrice} (value: $${orderValue.toFixed(2)})`,
    );
    console.log(`   - Stop Loss at $${testStopLoss.toFixed(2)}`);
    console.log(`   - Take Profit at $${testTakeProfit.toFixed(2)}`);
    console.log(
      "\nThese are test orders (minimum size) and will be cancelled immediately.",
    );
    console.log("\n⏸️  Test paused. To continue with order tests, run:");
    console.log("   node test-binance-api.js --with-orders\n");

    // Check if user wants to continue with order tests
    if (!process.argv.includes("--with-orders")) {
      showSummary();
      return;
    }

    console.log("\n🚀 Continuing with order placement tests...\n");

    // Test 6: Place Market Order (to open a real position for TP/SL testing)
    console.log("\n📝 Test 6: Place Market BUY Order");
    console.log("-".repeat(60));

    const marketOrder = await binanceClient.exchange.fapiPrivatePostOrder({
      symbol: symbol.replace("/", ""),
      side: "BUY",
      type: "MARKET",
      quantity: testQuantity,
    });

    if (marketOrder && marketOrder.orderId) {
      logTest("Place Market Order", "pass", `Order ID: ${marketOrder.orderId}`);
      console.log(`   Status: ${marketOrder.status}`);
      console.log(`   Quantity: ${marketOrder.origQty}`);
    } else {
      logTest("Place Market Order", "fail", "Failed to place market order");
      showSummary();
      return;
    }

    await sleep(2000); // Wait for position to open

    // Test 7: Place Stop Loss Order
    console.log("\n🛑 Test 7: Place Stop Loss Order");
    console.log("-".repeat(60));

    const stopLimitPrice = testStopLoss * 0.999;
    const slOrder = await binanceClient.createStopLossOrder(
      symbol,
      "sell",
      testQuantity,
      testStopLoss,
      stopLimitPrice,
    );

    if (slOrder && slOrder.id) {
      logTest("Place Stop Loss", "pass", `SL Order ID: ${slOrder.id}`);
      console.log(`   Stop Price: $${slOrder.stopPrice}`);
      console.log(`   Limit Price: $${stopLimitPrice.toFixed(2)}`);
    } else {
      logTest("Place Stop Loss", "fail", "Failed to place stop loss");
    }

    await sleep(2000);

    // Test 8: Place Take Profit Order
    console.log("\n🎯 Test 8: Place Take Profit Order");
    console.log("-".repeat(60));

    const tpOrder = await binanceClient.createTakeProfitOrder(
      symbol,
      "sell",
      testQuantity,
      testTakeProfit,
    );

    if (tpOrder && tpOrder.id) {
      logTest("Place Take Profit", "pass", `TP Order ID: ${tpOrder.id}`);
      console.log(`   TP Price: $${tpOrder.price}`);
    } else {
      logTest("Place Take Profit", "fail", "Failed to place take profit");
    }

    await sleep(2000);

    // Test 9: Get Open Orders
    console.log("\n📋 Test 9: Get Open Orders");
    console.log("-".repeat(60));

    const openOrders = await binanceClient.getOpenOrders(symbol);
    if (openOrders && openOrders.length > 0) {
      logTest(
        "Get Open Orders",
        "pass",
        `Found ${openOrders.length} open orders`,
      );
      openOrders.forEach((order, i) => {
        console.log(
          `   ${i + 1}. ${order.type} ${order.side} @ $${order.price || order.stopPrice} (ID: ${order.id})`,
        );
      });
    } else {
      logTest("Get Open Orders", "warn", "No open orders found");
    }

    await sleep(2000);

    // Test 10: Cancel All Orders
    console.log("\n❌ Test 10: Cancel All Test Orders");
    console.log("-".repeat(60));

    let cancelCount = 0;
    // Close the market position
    try {
      await binanceClient.exchange.fapiPrivatePostOrder({
        symbol: symbol.replace("/", ""),
        side: "SELL",
        type: "MARKET",
        quantity: testQuantity,
        reduceOnly: true,
      });
      console.log(`   ✓ Closed market position`);
      cancelCount++;
    } catch (e) {
      console.log(`   ✗ Failed to close position: ${e.message}`);
    }

    if (slOrder && slOrder.id) {
      try {
        await binanceClient.cancelOrder(slOrder.id, symbol);
        console.log(`   ✓ Cancelled stop loss ${slOrder.id}`);
        cancelCount++;
      } catch (e) {
        console.log(`   ✗ Failed to cancel SL: ${e.message}`);
      }
    }

    if (tpOrder && tpOrder.id) {
      try {
        await binanceClient.cancelOrder(tpOrder.id, symbol);
        console.log(`   ✓ Cancelled take profit ${tpOrder.id}`);
        cancelCount++;
      } catch (e) {
        console.log(`   ✗ Failed to cancel TP: ${e.message}`);
      }
    }

    logTest("Cancel Orders", "pass", `Cancelled ${cancelCount} orders`);

    // Final verification
    await sleep(2000);
    const finalOrders = await binanceClient.getOpenOrders(symbol);
    if (finalOrders.length === 0) {
      logTest("Cleanup Verification", "pass", "All test orders cancelled");
    } else {
      logTest(
        "Cleanup Verification",
        "warn",
        `${finalOrders.length} orders still open`,
      );
    }
  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
    console.error("Stack:", error.stack);
    logTest("Test Execution", "fail", error.message);
  }

  showSummary();
}

function showSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log("=".repeat(60));

  if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log(
      "\n🎉 All tests passed! Binance API integration is working correctly.\n",
    );
  } else if (results.failed.length === 0) {
    console.log(
      "\n✅ Core tests passed with some warnings. Review warnings above.\n",
    );
  } else {
    console.log("\n⚠️  Some tests failed. Please review errors above.\n");
  }

  if (!process.argv.includes("--with-orders")) {
    console.log("💡 To test order placement, run:");
    console.log("   node test-binance-api.js --with-orders\n");
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
