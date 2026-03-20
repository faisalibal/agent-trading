"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function PriceChart({
  data,
  entryPrice,
  stopLoss,
  takeProfit,
}: {
  data: ChartData[];
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0e17" },
        textColor: "#64748b",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e293b44" },
        horzLines: { color: "#1e293b44" },
      },
      crosshair: {
        vertLine: {
          color: "#00d4ff44",
          width: 1,
          labelBackgroundColor: "#111827",
        },
        horzLine: {
          color: "#00d4ff44",
          width: 1,
          labelBackgroundColor: "#111827",
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#00ff88",
      downColor: "#ff3b5c",
      borderUpColor: "#00ff88",
      borderDownColor: "#ff3b5c",
      wickUpColor: "#00ff8888",
      wickDownColor: "#ff3b5c88",
    });

    candlestickSeries.setData(data as any);

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "#00ff8833" : "#ff3b5c33",
      })) as any,
    );

    // Add price lines for entry, SL, TP
    if (entryPrice) {
      candlestickSeries.createPriceLine({
        price: entryPrice,
        color: "#00d4ff",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "ENTRY",
      });
    }
    if (stopLoss) {
      candlestickSeries.createPriceLine({
        price: stopLoss,
        color: "#ff3b5c",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL",
      });
    }
    if (takeProfit) {
      candlestickSeries.createPriceLine({
        price: takeProfit,
        color: "#00ff88",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, entryPrice, stopLoss, takeProfit]);

  return <div ref={chartContainerRef} className="w-full" />;
}
