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

    // Calculate position details for AI awareness
    let positionInfo =
      "Tidak ada posisi aktif. Kamu bebas membuka posisi baru.";
    let positionPnlPercent = 0;
    let positionValue = 0;
    let availableBalance = usdtBalance;

    if (hasPosition) {
      positionPnlPercent = ((lastPrice - entryPrice) / entryPrice) * 100;
      if (positionSide === "short") positionPnlPercent = -positionPnlPercent;
      positionValue = positionAmount * entryPrice;
      const leveragedPnl = positionPnlPercent * data.leverage;

      positionInfo = `🔥 POSISI AKTIF:
  - Side: ${positionSide.toUpperCase()}
  - Entry Price: ${entryPrice}
  - Quantity: ${positionAmount} unit
  - Position Value: ~${positionValue.toFixed(2)} USDT
  - Current Price: ${lastPrice}
  - Unrealized PnL: ${unrealizedPnl} USDT (${positionPnlPercent >= 0 ? "+" : ""}${positionPnlPercent.toFixed(2)}%, leveraged: ${leveragedPnl >= 0 ? "+" : ""}${leveragedPnl.toFixed(2)}%)
  - Stop Loss: ${data.currentStopLoss || "N/A"}
  - Take Profit: ${data.currentTakeProfit || "N/A"}
  - Distance to SL: ${data.currentStopLoss ? ((Math.abs(lastPrice - data.currentStopLoss) / lastPrice) * 100).toFixed(2) + "%" : "N/A"}
  - Distance to TP: ${data.currentTakeProfit ? ((Math.abs(data.currentTakeProfit - lastPrice) / lastPrice) * 100).toFixed(2) + "%" : "N/A"}`;
    }

    const alertContext = isAlertTriggered
      ? "⚡ ALERT: Significant price movement detected!"
      : "";
    const volatilityLevel =
      volatility > 1 ? "HIGH" : volatility > 0.5 ? "MODERATE" : "LOW";

    return `
Kamu adalah trader crypto profesional untuk futures dengan leverage ${data.leverage || 5}x.

=== AKUN KAMU ===
- Total Balance: ${usdtBalance} USDT
- Available Balance: ${availableBalance} USDT
${positionInfo}

${alertContext}

=== MARKET SENTIMENT & NEWS ===
${newsContext}

=== REAL-TIME MARKET DATA ===
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

=== YOUR DECISION HISTORY ===
${data.decisionHistory || "No previous decisions yet"}
${data.consecutiveHolds > 2 ? `\n⚠️ WARNING: You've held ${data.consecutiveHolds} times in a row - consider if you're being too cautious` : ""}
${data.lastAction === "POSITION_CLOSED" ? "\n💡 TIP: Position just closed - wait for clear setup before re-entering" : ""}
${data.lastAction ? `Last action: ${data.lastAction}` : ""}

=== CARA BERPIKIR KAMU (SEPERTI TRADER MANUSIA) ===

${
  hasPosition
    ? `
KAMU PUNYA POSISI AKTIF! Pikirkan seperti trader manusia:
1. Apakah posisi ini masih valid? Apakah alasan entry masih berlaku?
2. Apakah market bergerak sesuai atau melawan posisi kamu?
3. Apakah PnL sudah cukup untuk take profit? Atau perlu hold lebih lama?
4. Apakah ada tanda reversal yang mengancam posisi kamu?
5. Apakah stop loss perlu di-adjust (tighten/widen)?
6. Apakah perlu close manual karena kondisi berubah?

ATURAN MANAGE POSISI:
- Jika PnL > +1.5% (leveraged) dan momentum melemah → pertimbangkan CLOSE
- Jika market berbalik arah kuat → CLOSE segera, jangan tunggu SL
- Jika profit berjalan baik → ADJUST_SL untuk lock profit (trail stop)
- Jika kondisi berubah drastis (news, momentum shift) → CLOSE
- Jika posisi masih sesuai analisis → HOLD, biarkan running
- JANGAN buka posisi baru (BUY/SELL) selama ada posisi aktif
`
    : `
TIDAK ADA POSISI. Cari opportunity:
1. Apakah ada setup yang valid? Momentum + Volume + Technical alignment?
2. Apakah risk/reward minimal 1:2?
3. Apakah news mendukung arah trade?
4. Jangan terlalu ragu - opportunity yang dilewatkan = profit yang hilang
`
}

=== ATURAN TRADING ===
1. SENTIMENT ALIGNMENT: News + Technical harus align untuk signal kuat
2. MOMENTUM TRADING: Konfirmasi momentum dengan volume dan RSI
3. TREND-FOLLOWING: Prioritaskan trading searah higher timeframe trend
4. RISK/REWARD: Minimal 1:2 (trend), 1:3 (counter-trend)
5. STOP LOSS: Berdasarkan ATR (1x normal, 1.5x high vol)
6. JANGAN terlalu sering HOLD - ambil opportunity yang valid
7. JANGAN buka posisi baru jika sudah ada posisi aktif

=== OUTPUT FORMAT ===
${
  hasPosition
    ? `
Kamu PUNYA posisi aktif. Pilih salah satu action:
{
  "action": "HOLD" | "CLOSE" | "ADJUST_SL" | "ADJUST_TP",
  "stop_loss": number | null,
  "take_profit": number | null,
  "reason": "penjelasan singkat"
}

- HOLD: Biarkan posisi running, tidak ada perubahan
- CLOSE: Tutup posisi sekarang (market order)
- ADJUST_SL: Pindahkan stop loss ke harga baru (isi stop_loss)
- ADJUST_TP: Pindahkan take profit ke harga baru (isi take_profit)
`
    : `
Kamu TIDAK punya posisi. Pilih salah satu action:
{
  "action": "BUY" | "SELL" | "HOLD",
  "entry_price": number | null,
  "stop_loss": number | null,
  "take_profit": number | null,
  "reason": "penjelasan singkat"
}
`
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
