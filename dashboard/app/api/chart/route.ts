import { NextRequest, NextResponse } from "next/server";
import path from "path";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || process.env.TRADING_SYMBOL || "SOLUSDT";
    const timeframe = searchParams.get("timeframe") || process.env.TIMEFRAME || "5m";
    const limit = parseInt(searchParams.get("limit") || "200");

    const exchange = createExchange();

    const response = await exchange.fapiPublicGetKlines({
      symbol,
      interval: timeframe,
      limit,
    });

    const ohlcv = response.map((c: any) => ({
      time: Math.floor(c[0] / 1000), // Convert to seconds for lightweight-charts
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));

    return NextResponse.json({ ohlcv, symbol, timeframe });
  } catch (error: any) {
    console.error("Chart API error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
