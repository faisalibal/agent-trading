// geminiService.js - Final dengan @google/genai
const { GoogleGenAI } = require("@google/genai");

class GeminiService {
  constructor(apiKey) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = "gemini-2.5-flash-lite"; // atau 'gemini-2.0-flash' untuk yang lebih cepat
  }

  buildPrompt(data) {
    const {
      lastPrice,
      ema9,
      ema20,
      rsi,
      macd,
      atr,
      support,
      resistance,
      volumeRatio,
      imbalance,
      priceChange24h,
      higherTrend,
      fundingRate,
      hasPosition,
      positionSide,
      entryPrice,
      positionAmount,
      unrealizedPnl,
      usdtBalance,
      newsContext,
      newsSentiment,
      recentTrend,
      volatility,
      isAlertTriggered,
    } = data;

    let positionInfo = hasPosition
      ? `Posisi ${positionSide} sebanyak ${positionAmount} unit, entry price ${entryPrice}, unrealized PnL ${unrealizedPnl} USDT`
      : "Tidak ada posisi";

    const alertContext = isAlertTriggered
      ? "⚡ ALERT: Significant price movement detected!"
      : "";
    const volatilityLevel =
      volatility > 1 ? "HIGH" : volatility > 0.5 ? "MODERATE" : "LOW";

    return `
Anda adalah trader crypto profesional untuk futures dengan leverage 5x. Modal Anda saat ini ${usdtBalance} USDT. 
Prioritas utama: PRESERVE CAPITAL dengan manajemen risiko ketat (risk 1-2% per trade).

${alertContext}

=== MARKET SENTIMENT & NEWS ===
${newsContext}

=== REAL-TIME MARKET DATA (BTCUSDT) ===
- Harga terakhir: ${lastPrice}
- Recent Trend (5min): ${recentTrend} ${recentTrend.includes("STRONG") ? "← MOMENTUM KUAT!" : ""}
- Volatility: ${volatilityLevel} (${volatility?.toFixed(2)}%)
- News Sentiment: ${newsSentiment} ${newsSentiment === "BULLISH" ? "📈" : newsSentiment === "BEARISH" ? "📉" : "➡️"}

=== TECHNICAL INDICATORS (5m timeframe) ===
- EMA9: ${ema9.toFixed(2)} | EMA20: ${ema20.toFixed(2)} ${ema9 > ema20 ? "(Bullish)" : "(Bearish)"}
- RSI(14): ${rsi.toFixed(2)} ${rsi > 70 ? "(Overbought)" : rsi < 30 ? "(Oversold)" : "(Neutral)"}
- MACD: ${macd ? `${macd.MACD?.toFixed(2)} / Signal: ${macd.signal?.toFixed(2)} / Histogram: ${macd.histogram?.toFixed(2)}` : "N/A"}
- ATR: ${atr?.toFixed(2)} (volatilitas)
- Support: ${support} | Resistance: ${resistance}
- Volume Ratio: ${volumeRatio.toFixed(2)}x ${volumeRatio > 1.5 ? "(High volume ✓)" : volumeRatio < 0.8 ? "(Low volume ✗)" : "(Normal)"}
- Order Book Imbalance: ${imbalance.toFixed(4)} ${imbalance > 0.1 ? "(Strong buy pressure)" : imbalance < -0.1 ? "(Strong sell pressure)" : "(Balanced)"}
- 24h Change: ${priceChange24h}%

=== HIGHER TIMEFRAME CONTEXT ===
- **TREND (1h): ${higherTrend}** ← PENTING untuk konfirmasi arah
- Funding Rate: ${(fundingRate * 100).toFixed(4)}% ${Math.abs(fundingRate) > 0.01 ? "(Extreme)" : "(Normal)"}

=== POSITION STATUS ===
${positionInfo}

=== YOUR DECISION HISTORY ===
${data.decisionHistory || "No previous decisions yet"}
${data.consecutiveHolds > 2 ? `\n⚠️ WARNING: You've held ${data.consecutiveHolds} times in a row - consider if you're being too cautious` : ""}
${data.lastAction === "POSITION_CLOSED" ? "\n💡 TIP: Position just closed - wait for clear setup before re-entering" : ""}
${data.lastAction ? `Last action: ${data.lastAction}` : ""}

ATURAN TRADING:
1. **SENTIMENT ALIGNMENT**: Pertimbangkan news sentiment dalam keputusan
   - News BULLISH + Technical BULLISH = Strong BUY signal
   - News BEARISH + Technical BEARISH = Strong SELL signal
   - News vs Technical conflict = Extra caution, butuh konfirmasi lebih kuat

2. **MOMENTUM TRADING**: Jika ada alert price movement (STRONG_UP/DOWN):
   - Konfirmasi dengan volume dan RSI
   - Jika momentum searah trend = opportunity
   - Jika momentum melawan trend = wait for confirmation

3. **TREND-FOLLOWING PRIORITY**: Trading searah dengan higher timeframe trend
   - Higher TF UPTREND → Prioritaskan BUY, hindari SELL kecuali konfirmasi sangat kuat
   - Higher TF DOWNTREND → Prioritaskan SELL, hindari BUY kecuali konfirmasi sangat kuat

4. **COUNTER-TREND TRADES**: Hanya dengan konfirmasi SANGAT kuat:
   - Volume ratio minimal 1.5x
   - RSI extreme (>70 atau <30)
   - News sentiment mendukung reversal
   - Minimal R:R 1:3

5. **VOLATILITY CONSIDERATION**:
   - HIGH volatility = Widen stop loss (1.5x ATR), reduce position size
   - LOW volatility = Normal stop loss (1x ATR)

6. **RISK/REWARD**: 
   - Trend-following: Minimal 1:2
   - Counter-trend: Minimal 1:3
   - High volatility: Minimal 1:2.5

7. **STOP LOSS**: Berdasarkan ATR dan volatility
   - Normal: 1x ATR
   - High volatility: 1.5x ATR
   - Minimal: 0.5x ATR

8. **JIKA RAGU**: Pilih HOLD - preserving capital > forcing trades

9. **CONSISTENCY & LEARNING**:
   - Review your recent decisions - are you being consistent?
   - If you held 3+ times in a row, ask: am I being too cautious or is market really bad?
   - If you just opened a position, don't immediately reverse unless strong reason
   - Learn from your decision pattern - avoid flip-flopping

Output format JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "entry_price": number | null,
  "stop_loss": number | null,
  "take_profit": number | null,
  "reason": "penjelasan singkat mengapa action ini dipilih"
}

Hanya output JSON, tanpa teks tambahan.
    `;
  }

  async getDecision(prompt) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Perbedaan utama: API baru menggunakan `client.models.generateContent`
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            temperature: 0.2, // tambahan parameter untuk konsistensi
            maxOutputTokens: 500,
          },
        });

        // Response format juga berbeda
        let text = response.text;

        // Bersihkan markdown JSON jika ada
        text = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        return JSON.parse(text);
      } catch (error) {
        console.error(`Gemini error (attempt ${i + 1}):`, error.message);
        if (i === maxRetries - 1) return null;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}

module.exports = GeminiService;
