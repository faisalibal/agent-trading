export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  data: any;
}

export interface AIDecision {
  timestamp: string;
  action: "BUY" | "SELL" | "HOLD" | "POSITION_CLOSED";
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  reason: string;
  price: number | null;
  executed: boolean;
  pnl?: number;
}

export interface OrderExecution {
  timestamp: string;
  action: string;
  quantity: number;
  price: number;
  type: "LIMIT" | "MARKET";
  side: "buy" | "sell";
}

export interface PositionInfo {
  side: "long" | "short" | null;
  contracts: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
  markPrice: number;
}

export interface TickerInfo {
  symbol: string;
  last: number;
  percentage: number;
  high: number;
  low: number;
  volume: number;
}

export interface BalanceInfo {
  total: number;
  available: number;
  used: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  published_at: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  source: string;
}

export interface DashboardData {
  balance: BalanceInfo;
  position: PositionInfo | null;
  ticker: TickerInfo;
  config: {
    symbol: string;
    leverage: number;
    timeframe: string;
  };
  openOrders: any[];
}

export interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}
