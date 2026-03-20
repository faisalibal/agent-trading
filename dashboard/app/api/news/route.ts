import { NextResponse } from "next/server";
import axios from "axios";

const BULLISH_KEYWORDS = [
  "bullish", "surge", "rally", "breakout", "pump", "adoption",
  "institutional", "etf approved", "all-time high", "ath",
  "partnership", "upgrade", "gains", "soars", "jumps",
];

const BEARISH_KEYWORDS = [
  "bearish", "crash", "dump", "plunge", "collapse", "ban",
  "regulation", "hack", "scam", "lawsuit", "investigation",
  "decline", "drop", "fall", "fear", "plummets", "tanks",
];

function analyzeSentiment(text: string): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const lower = text.toLowerCase();
  let bull = 0, bear = 0;
  BULLISH_KEYWORDS.forEach((k) => { if (lower.includes(k)) bull++; });
  BEARISH_KEYWORDS.forEach((k) => { if (lower.includes(k)) bear++; });
  if (bull > bear) return "BULLISH";
  if (bear > bull) return "BEARISH";
  return "NEUTRAL";
}

async function fetchRSS(url: string, source: string) {
  try {
    const res = await axios.get(url, {
      timeout: 5000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const titleMatches = res.data.match(
      /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g
    ) || [];
    const pubDateMatches = res.data.match(
      /<(?:pubDate|published)>(.*?)<\/(?:pubDate|published)>/g
    ) || [];

    const items = [];
    for (let i = 1; i < Math.min(6, titleMatches.length); i++) {
      const title = titleMatches[i]
        .replace(/<title>(?:<!\[CDATA\[)?/, "")
        .replace(/(?:\]\]>)?<\/title>/, "")
        .trim();

      const pubDate = pubDateMatches[i]
        ? pubDateMatches[i]
            .replace(/<(?:pubDate|published)>/, "")
            .replace(/<\/(?:pubDate|published)>/, "")
        : new Date().toISOString();

      items.push({
        title,
        published_at: pubDate,
        sentiment: analyzeSentiment(title),
        source,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const feeds = [
      { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", name: "CoinDesk" },
      { url: "https://cointelegraph.com/rss", name: "CoinTelegraph" },
      { url: "https://decrypt.co/feed", name: "Decrypt" },
    ];

    const results = await Promise.allSettled(
      feeds.map((f) => fetchRSS(f.url, f.name))
    );

    const news: any[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") news.push(...r.value);
    });

    // Also get market data from CoinGecko
    try {
      const globalRes = await axios.get("https://api.coingecko.com/api/v3/global", {
        timeout: 5000,
      });
      const global = globalRes.data?.data || {};
      const marketCapChange = global.market_cap_change_percentage_24h_usd || 0;
      const btcDom = global.market_cap_percentage?.btc || 0;

      news.push({
        title: `Global crypto market ${marketCapChange > 0 ? "up" : "down"} ${Math.abs(marketCapChange).toFixed(2)}% in 24h`,
        published_at: new Date().toISOString(),
        sentiment: marketCapChange > 2 ? "BULLISH" : marketCapChange < -2 ? "BEARISH" : "NEUTRAL",
        source: "CoinGecko",
      });

      news.push({
        title: `BTC dominance: ${btcDom.toFixed(1)}% | Fear & Greed: ${marketCapChange > 3 ? "Extreme Greed" : marketCapChange > 1 ? "Greed" : marketCapChange < -3 ? "Extreme Fear" : marketCapChange < -1 ? "Fear" : "Neutral"}`,
        published_at: new Date().toISOString(),
        sentiment: marketCapChange > 1 ? "BULLISH" : marketCapChange < -1 ? "BEARISH" : "NEUTRAL",
        source: "Market Data",
      });
    } catch {}

    news.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    const sentimentCounts = news.reduce(
      (acc: any, n) => {
        acc[n.sentiment.toLowerCase()]++;
        return acc;
      },
      { bullish: 0, bearish: 0, neutral: 0 }
    );

    let overall = "NEUTRAL";
    if (sentimentCounts.bullish > sentimentCounts.bearish + 1) overall = "BULLISH";
    else if (sentimentCounts.bearish > sentimentCounts.bullish + 1) overall = "BEARISH";

    return NextResponse.json({
      news: news.slice(0, 15),
      sentiment: { overall, ...sentimentCounts },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, news: [], sentiment: { overall: "NEUTRAL" } }, { status: 500 });
  }
}
