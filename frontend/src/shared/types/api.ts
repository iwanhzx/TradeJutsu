// === Symbols ===
export interface SymbolCreate {
  symbol: string;
}

export interface SymbolResponse {
  symbol: string;
  name: string | null;
  sector: string | null;
  currency: string | null;
  is_active: boolean;
  is_worth_trade_daily: boolean;
  latest_price: number | null;
  latest_price_date: string | null;
  added_at: string | null;
}

// === Prices ===
export interface PriceDailyResponse {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  true_range: number | null;
  true_range_pct: number | null;
  turnover: number | null;
}

export interface PriceIntradayResponse {
  symbol: string;
  datetime: string;
  interval: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  true_range: number | null;
  true_range_pct: number | null;
  turnover: number | null;
}

export interface FetchResponse {
  job_id: string;
  status: string;
}

// === Jobs ===
export interface JobResponse {
  job_id: string;
  job_type: string;
  symbol: string | null;
  status: string;
  progress: number;
  total_items: number;
  completed_items: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface JobCreated {
  job_id: string;
  status: string;
}

// === Analytics ===
export interface AtrSummaryResponse {
  symbol: string;
  interval: string;
  period_days: string;
  atr_wilder: number | null;
  atr_pct_wilder: number | null;
  atr_with_open: number | null;
  atr_pct_with_open: number | null;
  atr_exclude_open: number | null;
  atr_pct_exclude_open: number | null;
  last_price_update: string | null;
  calculated_at: string | null;
}

export interface TurnoverItem {
  symbol: string;
  avg_turnover: number | null;
  period_days: string;
}

export interface TurnoverTableRow {
  symbol: string;
  daily_values: Record<string, number | null>;
  avg_1w: number | null;
  avg_2w: number | null;
  avg_1m: number | null;
  avg_3m: number | null;
  avg_6m: number | null;
}

export interface TurnoverTableResponse {
  trade_dates: string[];
  rows: TurnoverTableRow[];
}

export interface WtdReportItem {
  symbol: string;
  is_worth_trade_daily: boolean;
  turnover_1w: number | null;
  turnover_2w: number | null;
  c_1w_o_daily: boolean;
  c_1w_opct_1h: boolean;
  c_1w_opct_daily: boolean;
  c_2w_opct_1h: boolean;
  c_2w_opct_daily: boolean;
  atr_conditions_met: number;
}

export interface WtdSettings {
  turnover_min: number;
  min_1w_o_daily: number;
  min_1w_opct_1h: number;
  min_1w_opct_daily: number;
  min_2w_opct_1h: number;
  min_2w_opct_daily: number;
  conditions_to_pass: number;
}

// === Cron Jobs ===
export interface CronScheduleResponse {
  action_id: string;
  label: string;
  enabled: boolean;
  run_time: string;
  last_run_at: string | null;
  last_job_id: string | null;
  next_run_at: string | null;
}

export interface CronScheduleUpdate {
  enabled?: boolean;
  run_time?: string;
}

// === WebSocket Messages ===
export type WsMessage =
  | { type: "job:started"; job_id: string; job_type: string; symbol?: string }
  | { type: "job:progress"; job_id: string; completed: number; total: number; symbol?: string }
  | { type: "job:complete"; job_id: string; status: string }
  | { type: "job:error"; job_id: string; error: string }
  | { type: "data:updated"; table: string; symbol?: string };
