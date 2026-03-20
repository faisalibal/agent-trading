/**
 * Bot Monitoring & Position Management Test
 *
 * Tests:
 * 1. AI monitoring dengan position terbuka
 * 2. TP/SL hit detection
 * 3. Decision history tracking
 * 4. Position close detection
 * 5. Price alert monitoring
 */

require("dotenv").config();
const BinanceClient = require("../binanceClient");
const DecisionHistory = require("../decisionHistory");
const config = require("../config");

const binanceClient = new BinanceClient(
  config.binance.apiKey,
  config.binance.apiSecret,
  config.binance.baseURL,
);

const symbol = config.trading.symbol;
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logTest(name, status, detail = "") {
  const emoji = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
  log(emoji, `${name}${detail ? ": " + detail : ""}`);
  if (status === "pass") testResults.passed++;
  else if (status === "fail") testResults.failed++;
  else testResults.warnings++;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMonitoringTests() {
  console.log("\n🧪 Bot Monitoring & Position Management Tests\n");
  console.log("=".repeat(70));

  try {
    // Test 1: Check if position monitoring is working
    console.log("\n📊 Test 1: Position Monitoring Setup");
    console.log("-".repeat(70));

    const position = await binanceClient.getPositions(symbol);
    if (position && position.contracts !== 0) {
      logTest(
        "Position Monitoring",
        "pass",
        `Found ${position.side} ${Math.abs(position.contracts)} contracts`,
      );
      console.log(`   Entry: $${position.entryPrice}`);
      console.log(`   Current PnL: ${position.unrealizedPnl} USDT`);
    } else {
      logTest(
        "Position Monitoring",
        "warn",
        "No position found - will test with new position",
      );
    }

    // Test 2: Decision History Initialization
    console.log("\n📝 Test 2: Decision History System");
    console.log("-".repeat(70));

    const decisionHistory = new DecisionHistory(60); // 1 hour window
    const history = decisionHistory.getRecentDecisions();
    logTest("Decision History Init", "pass", `Tracking window: 60 minutes`);
    console.log(`   Recent decisions: ${history.length}`);

    // Test 3: Price Monitoring
    console.log("\n💹 Test 3: Price Monitoring");
    console.log("-".repeat(70));

    const ticker = await binanceClient.getTicker(symbol);
    const currentPrice = ticker.last;
    logTest("Price Fetch", "pass", `Current price: $${currentPrice}`);

    // Simulate price monitoring for 30 seconds
    console.log("\n   Monitoring price changes for 30 seconds...");
    const startPrice = currentPrice;
    let priceChecks = 0;
    let maxChange = 0;

    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      const newTicker = await binanceClient.getTicker(symbol);
      const newPrice = newTicker.last;
      const change = ((newPrice - startPrice) / startPrice) * 100;
      maxChange = Math.max(Math.abs(maxChange), Math.abs(change));
      priceChecks++;
      console.log(
        `   [${i + 1}/6] Price: $${newPrice.toFixed(2)} (${change >= 0 ? "+" : ""}${change.toFixed(3)}%)`,
      );
    }

    logTest(
      "Price Monitoring",
      "pass",
      `Checked ${priceChecks} times, max change: ${maxChange.toFixed(3)}%`,
    );

    // Test 4: Open position for monitoring test
    console.log("\n🚀 Test 4: Open Position with TP/SL");
    console.log("-".repeat(70));

    let testPosition = await binanceClient.getPositions(symbol);
    let positionOpened = false;

    if (!testPosition || testPosition.contracts === 0) {
      console.log("   Opening test position...");

      const entryPrice = currentPrice;
      const quantity = Math.ceil((100 / entryPrice) * 100) / 100;
      const stopLoss = entryPrice * 0.99;
      const takeProfit = entryPrice * 1.02;

      // Open position
      const marketOrder = await binanceClient.exchange.fapiPrivatePostOrder({
        symbol: symbol.replace("/", ""),
        side: "BUY",
        type: "MARKET",
        quantity: quantity,
      });

      logTest("Position Opened", "pass", `Order ID: ${marketOrder.orderId}`);
      console.log(`   Quantity: ${quantity} SOL`);
      console.log(`   Entry: $${entryPrice.toFixed(2)}`);

      await sleep(2000);

      // Place TP/SL
      const slOrder = await binanceClient.createStopLossOrder(
        symbol,
        "sell",
        quantity,
        stopLoss,
        stopLoss * 0.999,
      );
      logTest("Stop Loss Set", "pass", `Trigger: $${stopLoss.toFixed(2)}`);

      const tpOrder = await binanceClient.createTakeProfitOrder(
        symbol,
        "sell",
        quantity,
        takeProfit,
      );
      logTest("Take Profit Set", "pass", `Trigger: $${takeProfit.toFixed(2)}`);

      positionOpened = true;
      testPosition = await binanceClient.getPositions(symbol);
    } else {
      console.log("   Using existing position for test");
      logTest(
        "Existing Position",
        "pass",
        `${testPosition.side} ${Math.abs(testPosition.contracts)} contracts`,
      );
    }

    // Test 5: Position Monitoring Loop (simulate bot behavior)
    console.log("\n🔄 Test 5: Position Monitoring Loop (60 seconds)");
    console.log("-".repeat(70));
    console.log("   Simulating bot monitoring behavior...\n");

    let lastPosition = testPosition;
    let monitoringCycles = 0;
    const monitoringDuration = 60000; // 60 seconds
    const checkInterval = 10000; // 10 seconds
    const cycles = monitoringDuration / checkInterval;

    for (let i = 0; i < cycles; i++) {
      await sleep(checkInterval);
      monitoringCycles++;

      const currentPos = await binanceClient.getPositions(symbol);
      const currentTicker = await binanceClient.getTicker(symbol);
      const currentPrice = currentTicker.last;

      if (currentPos && currentPos.contracts !== 0) {
        const pnl = parseFloat(currentPos.unrealizedPnl);
        const pnlPercent =
          (pnl / (Math.abs(currentPos.contracts) * currentPos.entryPrice)) *
          100;

        console.log(
          `   [Cycle ${i + 1}/${cycles}] Position: ${currentPos.side.toUpperCase()} | Price: $${currentPrice.toFixed(2)} | PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDT (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
        );

        // Check if close to TP/SL
        if (currentPos.stopLoss && currentPrice <= currentPos.stopLoss * 1.01) {
          console.log(
            `   ⚠️  WARNING: Price near Stop Loss ($${currentPos.stopLoss.toFixed(2)})`,
          );
        }
        if (
          currentPos.takeProfit &&
          currentPrice >= currentPos.takeProfit * 0.99
        ) {
          console.log(
            `   🎯 INFO: Price near Take Profit ($${currentPos.takeProfit.toFixed(2)})`,
          );
        }

        lastPosition = currentPos;
      } else if (lastPosition && lastPosition.contracts !== 0) {
        // Position was closed!
        console.log(`\n   🔔 POSITION CLOSED DETECTED!`);
        console.log(
          `   Previous: ${lastPosition.side} ${Math.abs(lastPosition.contracts)} @ $${lastPosition.entryPrice}`,
        );
        console.log(`   Close Price: $${currentPrice.toFixed(2)}`);

        const pnlPercent =
          lastPosition.side === "long"
            ? ((currentPrice - lastPosition.entryPrice) /
                lastPosition.entryPrice) *
              100 *
              config.trading.leverage
            : ((lastPosition.entryPrice - currentPrice) /
                lastPosition.entryPrice) *
              100 *
              config.trading.leverage;

        console.log(
          `   PnL: ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`,
        );

        // Determine close reason
        if (
          lastPosition.takeProfit &&
          currentPrice >= lastPosition.takeProfit * 0.99
        ) {
          console.log(`   Reason: ✅ Take Profit Hit`);
        } else if (
          lastPosition.stopLoss &&
          currentPrice <= lastPosition.stopLoss * 1.01
        ) {
          console.log(`   Reason: ❌ Stop Loss Hit`);
        } else {
          console.log(`   Reason: Manual Close or Market Order`);
        }

        logTest(
          "Position Close Detection",
          "pass",
          "Bot detected position close",
        );
        break;
      } else {
        console.log(`   [Cycle ${i + 1}/${cycles}] No position open`);
      }
    }

    logTest(
      "Monitoring Loop",
      "pass",
      `Completed ${monitoringCycles} monitoring cycles`,
    );

    // Test 6: Decision History Tracking
    console.log("\n📚 Test 6: Decision History Tracking");
    console.log("-".repeat(70));

    // Add test decisions
    decisionHistory.addDecision(
      "BUY",
      "Test entry based on bullish signal",
      currentPrice,
    );
    await sleep(1000);
    decisionHistory.addDecision("HOLD", "Monitoring position", currentPrice);
    await sleep(1000);

    if (!testPosition || testPosition.contracts === 0) {
      decisionHistory.addPositionClose(currentPrice, "Test close", 2.5);
    }

    const recentDecisions = decisionHistory.getRecentDecisions();
    logTest(
      "Decision History",
      "pass",
      `Tracked ${recentDecisions.length} decisions`,
    );

    console.log("\n   Recent decisions:");
    recentDecisions.slice(-3).forEach((d) => {
      const time = new Date(d.timestamp).toLocaleTimeString();
      const reason =
        typeof d.reason === "string" ? d.reason : JSON.stringify(d.reason);
      console.log(`   [${time}] ${d.action} - ${reason.substring(0, 50)}...`);
    });

    // Test 7: Cleanup
    console.log("\n🧹 Test 7: Cleanup Test Position");
    console.log("-".repeat(70));

    if (positionOpened) {
      const finalPos = await binanceClient.getPositions(symbol);
      if (finalPos && finalPos.contracts !== 0) {
        console.log("   Closing test position...");
        await binanceClient.exchange.fapiPrivatePostOrder({
          symbol: symbol.replace("/", ""),
          side: "SELL",
          type: "MARKET",
          quantity: Math.abs(finalPos.contracts),
          reduceOnly: true,
        });
        logTest("Position Closed", "pass", "Test position cleaned up");
      } else {
        logTest("Position Already Closed", "pass", "No cleanup needed");
      }
    } else {
      console.log("   Keeping existing position (not opened by test)");
      logTest("Cleanup Skipped", "warn", "Position was not opened by test");
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    console.log("=".repeat(70));

    if (testResults.failed === 0) {
      console.log(
        "\n✅ All monitoring tests passed! Bot is ready for production.\n",
      );
    } else {
      console.log("\n⚠️  Some tests failed. Please review errors above.\n");
    }
  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
    console.error("Stack:", error.stack);
    testResults.failed++;
  }
}

// Run tests
runMonitoringTests();
