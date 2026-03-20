const axios = require("axios");
const config = require("./config");

class NewsService {
  constructor() {
    this.newsCache = [];
    this.lastFetch = 0;
    this.cacheDuration = 10 * 60 * 1000; // 10 minutes cache

    // Extract coin name from trading symbol (e.g., BTCUSDT -> BTC, SOLUSDT -> SOL)
    this.tradingCoin = config.trading.symbol
      .replace("USDT", "")
      .replace("/", "");
    this.coinKeywords = this.getCoinKeywords(this.tradingCoin);
  }

  getCoinKeywords(coin) {
    // Map coin symbols to common keywords in news
    const coinMap = {
      BTC: ["bitcoin", "btc"],
      ETH: ["ethereum", "eth", "ether"],
      SOL: ["solana", "sol"],
      BNB: ["binance coin", "bnb"],
      ADA: ["cardano", "ada"],
      DOGE: ["dogecoin", "doge"],
      XRP: ["ripple", "xrp"],
      MATIC: ["polygon", "matic"],
      AVAX: ["avalanche", "avax"],
      DOT: ["polkadot", "dot"],
    };

    return coinMap[coin] || [coin.toLowerCase()];
  }

  async getLatestNews() {
    const now = Date.now();

    if (
      now - this.lastFetch < this.cacheDuration &&
      this.newsCache.length > 0
    ) {
      return this.newsCache;
    }

    try {
      // Fetch RSS news and market data in parallel
      const [rssNews, globalResponse] = await Promise.all([
        this.fetchRSSNews(),
        axios.get("https://api.coingecko.com/api/v3/global", { timeout: 5000 }),
      ]);

      const global = globalResponse.data?.data || {};
      const newsItems = [...rssNews];

      // Add market data
      const marketCapChange = global.market_cap_change_percentage_24h_usd || 0;
      const btcDominance = global.market_cap_percentage?.btc || 0;

      newsItems.push({
        title: `Global crypto market ${marketCapChange > 0 ? "up" : "down"} ${Math.abs(marketCapChange).toFixed(2)}% in 24h`,
        published_at: new Date().toISOString(),
        sentiment:
          marketCapChange > 2
            ? "BULLISH"
            : marketCapChange < -2
              ? "BEARISH"
              : "NEUTRAL",
        source: "CoinGecko",
        url: "",
      });

      const fearGreed =
        marketCapChange > 3
          ? "Extreme Greed"
          : marketCapChange > 1
            ? "Greed"
            : marketCapChange < -3
              ? "Extreme Fear"
              : marketCapChange < -1
                ? "Fear"
                : "Neutral";

      newsItems.push({
        title: `Market sentiment: ${fearGreed} | BTC dominance ${btcDominance.toFixed(1)}%`,
        published_at: new Date().toISOString(),
        sentiment:
          marketCapChange > 1
            ? "BULLISH"
            : marketCapChange < -1
              ? "BEARISH"
              : "NEUTRAL",
        source: "Market Sentiment",
        url: "",
      });

      this.newsCache = newsItems.slice(0, 5);
      this.lastFetch = now;

      return this.newsCache;
    } catch (error) {
      console.warn("News fetch error:", error.message);

      if (this.newsCache.length === 0) {
        this.newsCache = [
          {
            title: "Market analysis based on technical indicators",
            published_at: new Date().toISOString(),
            sentiment: "NEUTRAL",
            source: "Technical Analysis",
            url: "",
          },
        ];
      }

      return this.newsCache;
    }
  }

  async fetchRSSNews() {
    const allNews = [];

    // Multiple RSS sources for comprehensive coverage
    const feeds = [
      {
        url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
        name: "CoinDesk",
      },
      { url: "https://cointelegraph.com/rss", name: "CoinTelegraph" },
      { url: "https://decrypt.co/feed", name: "Decrypt" },
      { url: "https://www.theblock.co/rss.xml", name: "TheBlock" },
    ];

    // Fetch from all sources in parallel
    const results = await Promise.allSettled(
      feeds.map((feed) => this.fetchSingleRSS(feed.url, feed.name)),
    );

    // Combine all successful results
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allNews.push(...result.value);
      }
    });

    // Sort by published date (newest first) and take top 5
    allNews.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    return allNews.slice(0, 5);
  }

  async fetchSingleRSS(url, sourceName) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const items = [];

      // Parse RSS/Atom feed
      const titleMatches =
        response.data.match(
          /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g,
        ) || [];
      const pubDateMatches =
        response.data.match(
          /<(?:pubDate|published)>(.*?)<\/(?:pubDate|published)>/g,
        ) || [];

      // Skip first title (channel title)
      for (let i = 1; i < Math.min(4, titleMatches.length); i++) {
        let title = titleMatches[i]
          .replace(/<title>(?:<!\[CDATA\[)?/, "")
          .replace(/(?:\]\]>)?<\/title>/, "")
          .trim();

        const pubDate = pubDateMatches[i]
          ? pubDateMatches[i]
              .replace(/<(?:pubDate|published)>/, "")
              .replace(/<\/(?:pubDate|published)>/, "")
          : new Date().toISOString();

        // Filter for relevant crypto news
        const lowerTitle = title.toLowerCase();
        const isRelevant =
          this.coinKeywords.some((keyword) => lowerTitle.includes(keyword)) ||
          lowerTitle.includes("crypto") ||
          lowerTitle.includes("market") ||
          lowerTitle.includes("bitcoin"); // BTC affects all markets

        if (isRelevant) {
          items.push({
            title: title,
            published_at: pubDate,
            sentiment: this.analyzeSentiment(title),
            source: sourceName,
            url: "",
          });
        }
      }

      return items;
    } catch (error) {
      console.warn(`RSS fetch error from ${sourceName}:`, error.message);
      return [];
    }
  }

  analyzeSentiment(text) {
    const bullishKeywords = [
      "bullish",
      "surge",
      "rally",
      "breakout",
      "pump",
      "moon",
      "adoption",
      "institutional",
      "etf approved",
      "all-time high",
      "ath",
      "breakthrough",
      "partnership",
      "upgrade",
      "gains",
      "soars",
      "jumps",
    ];

    const bearishKeywords = [
      "bearish",
      "crash",
      "dump",
      "plunge",
      "collapse",
      "ban",
      "regulation",
      "hack",
      "scam",
      "lawsuit",
      "investigation",
      "decline",
      "drop",
      "fall",
      "fear",
      "plummets",
      "tanks",
    ];

    const lowerText = text.toLowerCase();
    let bullishScore = 0;
    let bearishScore = 0;

    bullishKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) bullishScore++;
    });

    bearishKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) bearishScore++;
    });

    if (bullishScore > bearishScore) return "BULLISH";
    if (bearishScore > bullishScore) return "BEARISH";
    return "NEUTRAL";
  }

  getSentimentSummary(news) {
    if (!news || news.length === 0) {
      return { overall: "NEUTRAL", bullish: 0, bearish: 0, neutral: 0 };
    }

    const counts = news.reduce(
      (acc, item) => {
        acc[item.sentiment.toLowerCase()]++;
        return acc;
      },
      { bullish: 0, bearish: 0, neutral: 0 },
    );

    let overall = "NEUTRAL";
    if (counts.bullish > counts.bearish + 1) overall = "BULLISH";
    else if (counts.bearish > counts.bullish + 1) overall = "BEARISH";

    return { overall, ...counts };
  }

  formatNewsForPrompt(news) {
    if (!news || news.length === 0) {
      return "No market data available - relying on technical analysis only";
    }

    if (news.length === 1 && news[0].source === "Technical Analysis") {
      return "Market data not available - trading based on technical indicators only";
    }

    const summary = this.getSentimentSummary(news);

    // Separate news headlines from market data
    const newsSources = ["CoinDesk", "CoinTelegraph", "Decrypt", "TheBlock"];
    const headlines = news.filter((n) => newsSources.includes(n.source));
    const marketData = news.filter((n) => !newsSources.includes(n.source));

    let output = `Market Sentiment: ${summary.overall} (${summary.bullish} bullish, ${summary.bearish} bearish, ${summary.neutral} neutral)\n`;

    if (headlines.length > 0) {
      output += `\nLatest Crypto News (from ${[...new Set(headlines.map((h) => h.source))].join(", ")}):\n`;
      output += headlines
        .map(
          (item, i) =>
            `${i + 1}. [${item.sentiment}] ${item.title} - ${item.source} (${this.getTimeAgo(item.published_at)})`,
        )
        .join("\n");
    }

    if (marketData.length > 0) {
      output += `\n\nMarket Data:\n`;
      output += marketData
        .map((item, i) => `${i + 1}. [${item.sentiment}] ${item.title}`)
        .join("\n");
    }

    return output;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }
}

module.exports = NewsService;
