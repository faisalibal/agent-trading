async function checkPendingEntry(client, symbol, entryOrderId) {
  try {
    const order = await client.exchange.fetchOrder(entryOrderId, symbol);
    return order.status === "open";
  } catch {
    return false;
  }
}

async function cancelStaleOrders(client, symbol, thresholdMs = 60 * 60 * 1000) {
  const openOrders = await client.getOpenOrders(symbol);
  const now = Date.now();
  for (const order of openOrders) {
    if (now - order.timestamp > thresholdMs) {
      await client.cancelOrder(order.id, symbol);
      console.log(`Cancelled stale order ${order.id}`);
    }
  }
}

module.exports = { checkPendingEntry, cancelStaleOrders };
