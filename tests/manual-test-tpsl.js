/**
 * Manual Test - Open position with TP/SL for UI verification
 * This will NOT auto-close the position so you can check Binance UI
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

async function manualTest() {
  console.log(
    "\n🧪 Manual TP/SL Test - Position will STAY OPEN for UI verification\n",
  );
  console.log("=".repeat(60));

  try {
    // 1. Get current price
    const ticker = await binanceClient.getTicker(symbol);
    const currentPrice = ticker.last;
    console.log(`\n📊 Current ${symbol} Price: $${currentPrice}`);

    // 2. Calculate order size
    const minNotional = 100;
    const quantity = Math.ceil((minNotional / currentPrice) * 100) / 100;
    const orderValue = quantity * currentPrice;

    const entryPrice = currentPrice;
    const stopLoss = entryPrice * 0.99; // -1%
    const takeProfit = entryPrice * 1.02; // +2%

    console.log(`\n📝 Order Details:`);
    console.log(`   Quantity: ${quantity} SOL`);
    console.log(`   Entry: $${entryPrice.toFixed(2)}`);
    console.log(`   Stop Loss: $${stopLoss.toFixed(2)} (-1%)`);
    console.log(`   Take Profit: $${takeProfit.toFixed(2)} (+2%)`);
    console.log(`   Order Value: $${orderValue.toFixed(2)}`);

    // 3. Open position with MARKET order
    console.log(`\n🚀 Opening LONG position...`);
    const marketOrder = await binanceClient.exchange.fapiPrivatePostOrder({
      symbol: symbol.replace("/", ""),
      side: "BUY",
      type: "MARKET",
      quantity: quantity,
    });

    console.log(`   ✅ Position opened! Order ID: ${marketOrder.orderId}`);

    // Wait for position to settle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Place Stop Loss
    console.log(`\n🛑 Placing Stop Loss...`);
    const slOrder = await binanceClient.createStopLossOrder(
      symbol,
      "sell",
      quantity,
      stopLoss,
      stopLoss * 0.999,
    );
    console.log(`   ✅ Stop Loss placed! Algo ID: ${slOrder.id}`);
    console.log(`   Trigger Price: $${stopLoss.toFixed(2)}`);

    // 5. Place Take Profit
    console.log(`\n🎯 Placing Take Profit...`);
    const tpOrder = await binanceClient.createTakeProfitOrder(
      symbol,
      "sell",
      quantity,
      takeProfit,
    );
    console.log(`   ✅ Take Profit placed! Algo ID: ${tpOrder.id}`);
    console.log(`   Trigger Price: $${takeProfit.toFixed(2)}`);

    // 6. Verify position
    console.log(`\n✅ Verification:`);
    const position = await binanceClient.getPositions(symbol);
    if (position && position.contracts !== 0) {
      console.log(
        `   Position: ${position.side.toUpperCase()} ${Math.abs(position.contracts)} SOL`,
      );
      console.log(`   Entry Price: $${position.entryPrice}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Position opened with TP/SL!");
    console.log("\n📱 NOW CHECK BINANCE TESTNET UI:");
    console.log("   1. Go to: https://testnet.binancefuture.com");
    console.log('   2. Click "Positions" tab');
    console.log("   3. You should see TP/SL values (not -- --)");
    console.log("\n⚠️  POSITION IS STILL OPEN - Run cleanup when done:");
    console.log("   npm run cleanup\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

manualTest();
