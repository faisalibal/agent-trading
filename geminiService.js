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
    } = data;

    let positionInfo = hasPosition
      ? `Posisi ${positionSide} sebanyak ${positionAmount} unit, entry price ${entryPrice}, unrealized PnL ${unrealizedPnl} USDT`
      : "Tidak ada posisi";

    return `
Anda adalah trader crypto profesional untuk futures dengan leverage 10x. Modal Anda saat ini ${usdtBalance} USDT. Target harian minimal 10% dengan manajemen risiko ketat (risk 2% per trade).

Data pasar untuk BTCUSDT (timeframe 5 menit):
- Harga terakhir: ${lastPrice}
- EMA9: ${ema9}
- EMA20: ${ema20}
- RSI(14): ${rsi}
- MACD: ${macd ? `MACD: ${macd.MACD?.toFixed(2)}, Signal: ${macd.signal?.toFixed(2)}, Histogram: ${macd.histogram?.toFixed(2)}` : "N/A"}
- ATR: ${atr?.toFixed(2)} (volatilitas)
- Support terdekat: ${support}
- Resistance terdekat: ${resistance}
- Rasio volume: ${volumeRatio.toFixed(2)}
- Order book imbalance: ${imbalance.toFixed(4)} (positif = tekanan beli)
- Perubahan 24 jam: ${priceChange24h}%
- Tren higher timeframe (1h): ${higherTrend}
- Funding rate: ${(fundingRate * 100).toFixed(4)}%
- Status posisi: ${positionInfo}

Berdasarkan data di atas, berikan rekomendasi trading dalam format JSON dengan field:
- action: "BUY" (long), "SELL" (short), atau "HOLD"
- entry_price: angka (harga limit untuk entry, atau null jika HOLD)
- stop_loss: angka (harga stop loss, atau null)
- take_profit: angka (harga take profit, atau null)
- reason: string (penjelasan singkat)

Perhatikan aksi: jika BUY, stop loss harus di bawah entry, take profit di atas. Jika SELL, sebaliknya.
Pastikan stop loss dan take profit rasional (risk/reward minimal 1:2). Pertimbangkan tren higher timeframe dan funding rate.
Jika tidak yakin, pilih HOLD.
Hanya keluarkan JSON, tanpa teks lain.
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
