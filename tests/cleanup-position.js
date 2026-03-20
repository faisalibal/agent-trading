/**
 * Cleanup Script - Close all open positions and cancel all orders
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

async function cleanup() {
  console.log("\n🧹 Starting cleanup...\n");
  console.log("=".repeat(60));

  try {
    // 1. Get current position
    console.log("\n📍 Checking current position...");
    const position = await binanceClient.getPositions(symbol);

    if (position && position.contracts !== 0) {
      console.log(
        `   Found position: ${position.side} ${Math.abs(position.contracts)} contracts`,
      );
      console.log(`   Entry: $${position.entryPrice}`);

      // Close position with market order
      console.log("\n🔄 Closing position with market order...");
      const closeSide = position.side === "long" ? "sell" : "buy";
      const quantity = Math.abs(position.contracts);

      const closeOrder = await binanceClient.exchange.fapiPrivatePostOrder({
        symbol: symbol.replace("/", ""),
        side: closeSide.toUpperCase(),
        type: "MARKET",
        quantity: quantity,
        reduceOnly: true,
      });

      console.log(`   ✅ Position closed! Order ID: ${closeOrder.orderId}`);
    } else {
      console.log("   ✅ No open position");
    }

    // 2. Cancel all open orders
    console.log("\n❌ Canceling all open orders...");
    const openOrders = await binanceClient.getOpenOrders(symbol);

    if (openOrders && openOrders.length > 0) {
      console.log(`   Found ${openOrders.length} open orders`);

      for (const order of openOrders) {
        try {
          await binanceClient.cancelOrder(order.id, symbol);
          console.log(
            `   ✅ Cancelled order ${order.id} (${order.type} ${order.side})`,
          );
        } catch (e) {
          console.log(
            `   ⚠️  Failed to cancel order ${order.id}: ${e.message}`,
          );
        }
      }
    } else {
      console.log("   ✅ No open orders");
    }

    // 3. Final verification
    console.log("\n✅ Verification...");
    const finalPosition = await binanceClient.getPositions(symbol);
    const finalOrders = await binanceClient.getOpenOrders(symbol);

    console.log(
      `   Position: ${finalPosition && finalPosition.contracts !== 0 ? "❌ Still open" : "✅ Closed"}`,
    );
    console.log(
      `   Orders: ${finalOrders.length > 0 ? `⚠️  ${finalOrders.length} remaining` : "✅ All cancelled"}`,
    );

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Cleanup complete!\n");
  } catch (error) {
    console.error("\n❌ Cleanup error:", error.message);
    console.error("Stack:", error.stack);
  }
}

cleanup().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
