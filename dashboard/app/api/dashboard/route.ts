import { NextResponse } from "next/server";
import path from "path";

// Load parent .env
require("dotenv").config({ path: path.join(process.cwd(), "..", ".env") });

const ccxt = require("ccxt");

function createExchange() {
  const config: any = {
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true,
    rateLimit: 500,
    options: {
      defaultType: "future",
      adjustForTimeDifference: true,
      recvWindow: 60000,
      fetchCurrencies: false,
      fetchMarkets: false,
    },
  };

  const exchange = new ccxt.binance(config);

  if (process.env.BINANCE_BASE_URL) {
    exchange.hostname = "testnet.binancefuture.com";
    const testnetBase = "https://testnet.binancefuture.com";
    exchange.urls["api"] = {
      public: testnetBase + "/fapi/v1",
      private: testnetBase + "/fapi/v1",
      fapiPublic: testnetBase + "/fapi/v1",
      fapiPrivate: testnetBase + "/fapi/v1",
      fapiPublicV2: testnetBase + "/fapi/v2",
      fapiPrivateV2: testnetBase + "/fapi/v2",
      dapiPublic: testnetBase + "/dapi/v1",
      dapiPrivate: testnetBase + "/dapi/v1",
    };
    exchange.options["checkOrderWhenCanceling"] = false;
    exchange.options["fetchCurrencies"] = false;
    exchange.options["fetchMarkets"] = false;
  }

  return exchange;
}

export async function GET() {
  try {
    const exchange = createExchange();
    const symbol = process.env.TRADING_SYMBOL || "SOLUSDT";
    const leverage = parseInt(process.env.LEVERAGE || "5");
    const timeframe = process.env.TIMEFRAME || "5m";

    const [accountRes, tickerRes, positionRes, openOrdersRes] =
      await Promise.all([
        exchange.fapiPrivateV2GetAccount(),
        exchange.fapiPublicGetTicker24hr({ symbol }),
        exchange.fapiPrivateV2GetPositionRisk({ symbol }),
        exchange.fapiPrivateGetOpenOrders({ symbol }),
      ]);

    // Parse balance
    const usdtAsset = accountRes.assets.find(
      (a: any) => a.asset === "USDT"
    );
    const balance = {
      total: parseFloat(usdtAsset?.walletBalance || "0"),
      available: parseFloat(usdtAsset?.availableBalance || "0"),
      used: parseFloat(usdtAsset?.initialMargin || "0"),
    };

    // Parse ticker
    const ticker = {
      symbol,
      last: parseFloat(tickerRes.lastPrice),
      percentage: parseFloat(tickerRes.priceChangePercent),
      high: parseFloat(tickerRes.highPrice),
      low: parseFloat(tickerRes.lowPrice),
      volume: parseFloat(tickerRes.volume),
      quoteVolume: parseFloat(tickerRes.quoteVolume),
    };

    // Parse position
    let position = null;
    if (positionRes && positionRes.length > 0) {
      const pos = positionRes[0];
      const amt = parseFloat(pos.positionAmt);
      if (amt !== 0) {
        position = {
          side: amt > 0 ? "long" : "short",
          contracts: Math.abs(amt),
          entryPrice: parseFloat(pos.entryPrice),
          unrealizedPnl: parseFloat(pos.unRealizedProfit),
          leverage: parseFloat(pos.leverage),
          liquidationPrice: parseFloat(pos.liquidationPrice),
          markPrice: parseFloat(pos.markPrice),
          notional: Math.abs(parseFloat(pos.notional || "0")),
        };
      }
    }

    // Parse open orders
    const openOrders = openOrdersRes.map((o: any) => ({
      id: o.orderId,
      type: o.type,
      side: o.side,
      price: parseFloat(o.price),
      stopPrice: parseFloat(o.stopPrice),
      quantity: parseFloat(o.origQty),
      status: o.status,
      time: o.time,
    }));

    return NextResponse.json({
      balance,
      position,
      ticker,
      openOrders,
      config: { symbol, leverage, timeframe },
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
