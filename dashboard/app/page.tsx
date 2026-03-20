"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PriceChart from "@/components/price-chart";
import {
  Activity, TrendingUp, TrendingDown, Wallet, Target, ShieldAlert,
  Brain, Newspaper, Clock, AlertTriangle, RefreshCw, Cpu, Zap,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
} from "lucide-react";

interface DashboardState {
  balance: { total: number; available: number; used: number } | null;
  position: any;
  ticker: any;
  config: any;
  openOrders: any[];
  chartData: any[];
  logs: any;
  news: any;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
}

const REFRESH_INTERVAL = 30000;

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    balance: null,
    position: null,
    ticker: null,
    config: null,
    openOrders: [],
    chartData: [],
    logs: null,
    news: null,
    loading: true,
    error: null,
    lastUpdate: "",
  });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, chartRes, logsRes, newsRes] = await Promise.allSettled([
        fetch("/api/dashboard").then((r) => r.json()),
        fetch("/api/chart?limit=200").then((r) => r.json()),
        fetch(`/api/logs?date=${selectedDate}`).then((r) => r.json()),
        fetch("/api/news").then((r) => r.json()),
      ]);

      setState((prev) => ({
        ...prev,
        balance: dashRes.status === "fulfilled" ? dashRes.value.balance : prev.balance,
        position: dashRes.status === "fulfilled" ? dashRes.value.position : prev.position,
        ticker: dashRes.status === "fulfilled" ? dashRes.value.ticker : prev.ticker,
        config: dashRes.status === "fulfilled" ? dashRes.value.config : prev.config,
        openOrders: dashRes.status === "fulfilled" ? dashRes.value.openOrders : prev.openOrders,
        chartData: chartRes.status === "fulfilled" ? chartRes.value.ohlcv || [] : prev.chartData,
        logs: logsRes.status === "fulfilled" ? logsRes.value : prev.logs,
        news: newsRes.status === "fulfilled" ? newsRes.value : prev.news,
        loading: false,
        lastUpdate: new Date().toLocaleTimeString("en-US", { hour12: false }),
        error: null,
      }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { balance, position, ticker, config, openOrders, chartData, logs, news } = state;

  // Calculate stats from logs
  const decisions = logs?.decisions || [];
  const orders = logs?.orders || [];
  const errors = logs?.errors || [];
  const positionCloses = logs?.positionCloses || [];
  const availableDates = logs?.availableDates || [];

  const buyCount = decisions.filter((d: any) => d.action === "BUY").length;
  const sellCount = decisions.filter((d: any) => d.action === "SELL").length;
  const holdCount = decisions.filter((d: any) => d.action === "HOLD").length;

  return (
    <div className="min-h-screen p-4 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-terminal-cyan" />
          <h1 className="font-display text-3xl text-terminal-cyan text-glow-cyan tracking-wider">
            AI TRADING BOT
          </h1>
          <span className="font-display text-xl text-terminal-muted">// DASHBOARD</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-terminal-muted">
            <div className="status-dot status-dot-live" />
            <span>LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-terminal-muted">
            <Clock className="w-3 h-3" />
            <span>{state.lastUpdate || "--:--:--"}</span>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 rounded border border-terminal-border hover:border-terminal-cyan/50 hover:bg-terminal-cyan/5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-terminal-muted ${state.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {state.error && (
        <div className="mb-4 p-3 bg-terminal-red/10 border border-terminal-red/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-terminal-red" />
          <span className="text-sm text-terminal-red">{state.error}</span>
        </div>
      )}

      {/* TOP STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        {/* Balance */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-display text-terminal-text">${balance?.total?.toFixed(2) || "--"}</div>
            <div className="text-xs text-terminal-muted mt-1">Available: ${balance?.available?.toFixed(2) || "--"}</div>
          </CardContent>
        </Card>

        {/* Price */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> {config?.symbol || "---"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-display text-terminal-cyan text-glow-cyan">${ticker?.last?.toFixed(2) || "--"}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${(ticker?.percentage || 0) >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {(ticker?.percentage || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {ticker?.percentage?.toFixed(2) || "0.00"}% (24h)
            </div>
          </CardContent>
        </Card>

        {/* Position */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Target className="w-3 h-3" /> Position</CardTitle></CardHeader>
          <CardContent>
            {position ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={position.side === "long" ? "buy" : "sell"}>
                    {position.side?.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-display">{position.contracts}</span>
                </div>
                <div className={`text-xs mt-1 ${position.unrealizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                  PnL: ${position.unrealizedPnl?.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="text-sm text-terminal-muted flex items-center gap-1">
                <Minus className="w-3 h-3" /> No Position
              </div>
            )}
          </CardContent>
        </Card>

        {/* 24h Range */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> 24h Range</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-terminal-green">High</span><span>${ticker?.high?.toFixed(2) || "--"}</span></div>
              <div className="flex justify-between"><span className="text-terminal-red">Low</span><span>${ticker?.low?.toFixed(2) || "--"}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* AI Decisions Today */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI Decisions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-display">{decisions.length}</div>
            <div className="text-xs text-terminal-muted mt-1 flex gap-2">
              <span className="text-terminal-green">B:{buyCount}</span>
              <span className="text-terminal-red">S:{sellCount}</span>
              <span className="text-terminal-yellow">H:{holdCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Errors</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-xl font-display ${errors.length > 0 ? "text-terminal-red" : "text-terminal-green"}`}>
              {errors.length}
            </div>
            <div className="text-xs text-terminal-muted mt-1">Today</div>
          </CardContent>
        </Card>
      </div>

      {/* CHART */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              {config?.symbol || "---"} // {config?.timeframe || "5m"} Chart
            </span>
            <span className="text-xs text-terminal-cyan">{config?.leverage || 5}x Leverage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <PriceChart
              data={chartData}
              entryPrice={position?.entryPrice}
              stopLoss={null}
              takeProfit={null}
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-terminal-muted">
              <Zap className="w-5 h-5 mr-2 animate-pulse" /> Loading chart data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABS: AI Decisions | Orders | News | System Log */}
      <Tabs defaultValue="decisions">
        <TabsList className="mb-2">
          <TabsTrigger value="decisions">
            <span className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI Decisions</span>
          </TabsTrigger>
          <TabsTrigger value="orders">
            <span className="flex items-center gap-1.5"><Target className="w-3 h-3" /> Orders</span>
          </TabsTrigger>
          <TabsTrigger value="news">
            <span className="flex items-center gap-1.5"><Newspaper className="w-3 h-3" /> News</span>
          </TabsTrigger>
          <TabsTrigger value="logs">
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> System Log</span>
          </TabsTrigger>
        </TabsList>

        {/* Date selector */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-terminal-muted">Log Date:</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-terminal-bg border border-terminal-border text-terminal-text text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-terminal-cyan/50"
          >
            {availableDates.length > 0
              ? availableDates.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))
              : <option value={selectedDate}>{selectedDate}</option>
            }
          </select>
        </div>

        {/* AI DECISIONS TAB */}
        <TabsContent value="decisions">
          <Card>
            <CardContent className="p-4">
              {decisions.length === 0 ? (
                <div className="text-center text-terminal-muted py-8">No AI decisions for this date</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {decisions.slice().reverse().map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-terminal-bg/50 border border-terminal-border/50 hover:border-terminal-cyan/20 transition-all">
                      <div className="mt-0.5">
                        {d.action === "BUY" ? (
                          <TrendingUp className="w-4 h-4 text-terminal-green" />
                        ) : d.action === "SELL" ? (
                          <TrendingDown className="w-4 h-4 text-terminal-red" />
                        ) : (
                          <Minus className="w-4 h-4 text-terminal-yellow" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={d.action === "BUY" ? "buy" : d.action === "SELL" ? "sell" : "hold"}>
                            {d.action}
                          </Badge>
                          <span className="text-xs text-terminal-muted">
                            {new Date(d.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                          </span>
                          {d.entry_price && (
                            <span className="text-xs text-terminal-cyan">@ ${d.entry_price?.toFixed?.(2) || d.entry_price}</span>
                          )}
                        </div>
                        <p className="text-xs text-terminal-muted/80 truncate">
                          {typeof d.reason === "string" ? d.reason : JSON.stringify(d.reason)}
                        </p>
                        {d.stop_loss && d.take_profit && (
                          <div className="flex gap-3 mt-1 text-xs">
                            <span className="text-terminal-red">SL: ${d.stop_loss?.toFixed?.(2) || d.stop_loss}</span>
                            <span className="text-terminal-green">TP: ${d.take_profit?.toFixed?.(2) || d.take_profit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-4">
              {/* Open Orders */}
              {openOrders && openOrders.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs text-terminal-cyan uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Open Orders
                  </h3>
                  <div className="space-y-1">
                    {openOrders.map((o: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-terminal-bg/50 border border-terminal-border/50 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={o.side?.toLowerCase() === "buy" ? "buy" : "sell"}>{o.side}</Badge>
                          <span>{o.type}</span>
                        </div>
                        <div className="flex gap-4">
                          <span>Qty: {o.quantity}</span>
                          {o.price > 0 && <span>Price: ${o.price.toFixed(2)}</span>}
                          {o.stopPrice > 0 && <span className="text-terminal-yellow">Trigger: ${o.stopPrice.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History from Logs */}
              <h3 className="text-xs text-terminal-cyan uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Order History
              </h3>
              {orders.length === 0 ? (
                <div className="text-center text-terminal-muted py-8">No orders for this date</div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {orders.slice().reverse().map((o: any, i: number) => (
                    <div key={i} className="p-2 rounded bg-terminal-bg/50 border border-terminal-border/50 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-terminal-muted">
                          {new Date(o.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                        <span>{o.message}</span>
                      </div>
                      {o.data && (
                        <div className="mt-1 text-terminal-muted/60">
                          {typeof o.data === "string" ? o.data : JSON.stringify(o.data)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Position Closes */}
              {positionCloses.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs text-terminal-cyan uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" /> Position Closes
                  </h3>
                  <div className="space-y-1">
                    {positionCloses.map((p: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-terminal-bg/50 border border-terminal-border/50 text-xs">
                        <span className="text-terminal-muted mr-2">
                          {new Date(p.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                        <span>{p.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEWS TAB */}
        <TabsContent value="news">
          <Card>
            <CardContent className="p-4">
              {/* Sentiment Summary */}
              {news?.sentiment && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-terminal-bg/50 border border-terminal-border/50">
                  <span className="text-xs text-terminal-muted uppercase tracking-wider">Market Sentiment:</span>
                  <Badge
                    variant={
                      news.sentiment.overall === "BULLISH" ? "bullish" :
                      news.sentiment.overall === "BEARISH" ? "bearish" : "neutral"
                    }
                  >
                    {news.sentiment.overall}
                  </Badge>
                  <div className="flex gap-3 text-xs ml-auto">
                    <span className="text-terminal-green">Bullish: {news.sentiment.bullish}</span>
                    <span className="text-terminal-red">Bearish: {news.sentiment.bearish}</span>
                    <span className="text-terminal-muted">Neutral: {news.sentiment.neutral}</span>
                  </div>
                </div>
              )}

              {/* News Items */}
              {(!news?.news || news.news.length === 0) ? (
                <div className="text-center text-terminal-muted py-8">Loading news...</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {news.news.map((n: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-terminal-bg/50 border border-terminal-border/50 hover:border-terminal-cyan/20 transition-all">
                      <div className="mt-0.5">
                        {n.sentiment === "BULLISH" ? (
                          <TrendingUp className="w-4 h-4 text-terminal-green" />
                        ) : n.sentiment === "BEARISH" ? (
                          <TrendingDown className="w-4 h-4 text-terminal-red" />
                        ) : (
                          <Minus className="w-4 h-4 text-terminal-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              n.sentiment === "BULLISH" ? "bullish" :
                              n.sentiment === "BEARISH" ? "bearish" : "neutral"
                            }
                          >
                            {n.sentiment}
                          </Badge>
                          <span className="text-xs text-terminal-cyan">{n.source}</span>
                        </div>
                        <p className="text-sm text-terminal-text">{n.title}</p>
                        <span className="text-xs text-terminal-muted mt-1 block">
                          {new Date(n.published_at).toLocaleString("en-US", { hour12: false })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SYSTEM LOG TAB */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-terminal-muted">{logs?.totalEntries || 0} entries</span>
                <div className="flex gap-2">
                  {errors.length > 0 && (
                    <Badge variant="error">{errors.length} errors</Badge>
                  )}
                </div>
              </div>

              {/* Error Section */}
              {errors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs text-terminal-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Errors & Warnings
                  </h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
                    {errors.slice().reverse().slice(0, 20).map((e: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-terminal-red/5 border border-terminal-red/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={e.level === "ERROR" ? "error" : "warn"}>{e.level}</Badge>
                          <span className="text-terminal-muted">
                            {new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                          </span>
                        </div>
                        <p className="mt-1 text-terminal-text/70 break-all">{e.message}</p>
                        {e.data && <p className="mt-0.5 text-terminal-muted/50 break-all text-[10px]">{e.data}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Log Stream */}
              <h3 className="text-xs text-terminal-cyan uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Log Stream
              </h3>
              <div className="bg-terminal-bg rounded-lg border border-terminal-border p-3 max-h-[400px] overflow-y-auto font-mono text-[11px] leading-relaxed">
                {(logs?.allLogs || []).slice().reverse().slice(0, 100).map((log: any, i: number) => (
                  <div key={i} className="flex gap-2 py-0.5 border-b border-terminal-border/30 last:border-0">
                    <span className="text-terminal-muted/50 shrink-0 w-[70px]">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <span className={`shrink-0 w-[42px] ${
                      log.level === "ERROR" ? "text-terminal-red" :
                      log.level === "WARN" ? "text-terminal-yellow" : "text-terminal-cyan/60"
                    }`}>
                      [{log.level}]
                    </span>
                    <span className="text-terminal-text/80 break-all">
                      {log.message}
                      {log.data && (
                        <span className="text-terminal-muted/40 ml-1">
                          {typeof log.data === "string" ? log.data : JSON.stringify(log.data).slice(0, 120)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {(!logs?.allLogs || logs.allLogs.length === 0) && (
                  <div className="text-center text-terminal-muted py-4">No logs for this date</div>
                )}
                <div className="text-terminal-green/40 animate-blink mt-1">_</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FOOTER */}
      <div className="mt-6 pt-4 border-t border-terminal-border/50 flex items-center justify-between text-xs text-terminal-muted/50">
        <span>AI Trading Bot v3.0 // Binance Futures {process.env.BINANCE_BASE_URL ? "(Testnet)" : "(Live)"}</span>
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" /> Powered by Gemini AI
        </span>
      </div>
    </div>
  );
}
