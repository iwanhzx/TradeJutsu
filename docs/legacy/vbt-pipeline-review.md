# VBT Backtest — LogicSet1 Pipeline Review

## Context

The user is auditing the per-day signal pipeline used by `run_vbt_backtest` (single-run path) and wants to know what is worth improving. Scope is analysis — no code is being changed in this turn. This document lists concrete issues found in `modules/vbt_backtest/engine/signals.py` and `modules/vbt_backtest/engine/runner.py`, grouped by severity, so the user can pick what to implement next.

## Files reviewed

- `modules/vbt_backtest/engine/signals.py` — per-day signal loop
- `modules/vbt_backtest/engine/runner.py` — `vbt.Portfolio.from_signals` wiring
- `modules/vbt_backtest/engine/config.py` — constants
- `modules/vbt_backtest/CLAUDE.md` — module contract + known gotchas

---

## Correctness issues (worth fixing)

### 1. Over-favorable fill on gap-down bars — **high impact**
`signals.py:198-226`. Fill is set to `buying_price` whenever `low ≤ buying_price`. If the fill bar *opens* below `buying_price` (gap-down), a realistic limit order would fill at the open, not at the limit. Currently the backtest pockets the gap.

**Fix:** `actual_fill = min(buying_price, float(bar.open))` on the hit bar, store that as `entry_price`, and recompute `sl_pct`/`tp_pct` against the actual fill.

### 2. `get_last_trading_day` hardcodes `'30min'` — **bug when `bar_interval != "30min"`**
`signals.py:28-30`. SQL filters `interval = '30min'` even when the user selects 15min or 1hour. The reference calendar then comes from a different bar grid than the one actually backtested.

**Fix:** pass `bar_interval` into `get_last_trading_day`, interpolate into the query.

### 3. ATR windows for 1H and Daily are not aligned
`signals.py:158-174`. `atr_1h` uses the last N *trading dates present in the 1H frame*; `atr_1d` uses `df_daily_lb.tail(N)` — the last N *rows* of the daily frame. If either series has gaps, the two ATRs are computed over different date sets, so `entry_target_pct = atr_1h + (atr_1d-atr_1h)*buffer` mixes apples and oranges.

**Fix:** resolve a single `lb_dates = trading_dates_1h[-N:]` and intersect the daily frame on those dates.

### 4. Tick-rounded SL/TP vs VBT's percent stops — **silent mismatch**
`signals.py:190-196`. The code computes `sl_price`/`tp_price` rounded to IDX ticks, then converts back to `sl_pct`/`tp_pct` and hands the percentages to `Portfolio.from_signals`. VBT fires at the pct threshold regardless of ticks, so reported exits land between ticks and diverge from what a live limit order would do. With `stop_entry_price="Price"` it's close, but not tick-accurate.

**Fix options (pick one):**
- Accept the small mismatch, document it in the CLAUDE.md gotchas.
- Switch to an order function / explicit exit bars computed off tick prices.

### 5. Per-bar `fees_array` is wrong on same-bar open+close
`runner.py:102-105`. `fees_array = BUY_FEE where entries else SELL_FEE`. VBT multiplies the bar's fee by each transaction on that bar. If a SL/TP fires on the *entry bar itself* (entry + exit on the same 30-min bar — possible when the bar's range straddles buy and SL), *both* sides use `BUY_FEE` because that bar is flagged as an entry bar. The sell-side fee is under-reported.

**Fix:** verify empirically, then either split BUY/SELL fees via `fixed_fees` vs `fees`, or use a scalar average fee and rely on a later correction, or use `from_orders` with explicit per-side fee arrays.

### 6. `sl_factor` uses only `atr_1h` — inconsistent with entry
`signals.py:193`. Entry target blends `atr_1h`+`atr_1d`, but the SL uses raw `atr_1h`. On high-daily-volatility days this places SL too tight relative to where entry was sized. Consider blending or at least documenting why the asymmetry is intentional.

---

## Robustness / quality-of-life

### 7. Entry fill is forbidden on the EOD bar
`signals.py:198` slices `[entry_bar:exit_bar_idx]` — exclusive of EOD. Fine if the intent is "never open a position we'd immediately force-close," but it silently drops ~1 bar of signal. Worth a one-line comment so future readers don't think it's an off-by-one bug.

### 8. Lookback alignment for `lookback_end`
`signals.py:154` uses `trade_date - 1 day` — calendar day, not trading day. For Monday `trade_date`, the last usable lookback row is Friday, which is already handled by `_date <= lookback_end`, so this is correct — but it's not obvious. Worth a brief comment or rename to `lookback_end_inclusive_date`.

### 9. `atr_1h = groupby(_date).mean().mean()` is bar-count sensitive
`signals.py:165`. Days with fewer 1H bars (e.g., half-day sessions) get the same weight as full days. If the goal is an unbiased per-day ATR, this is fine; if it's a time-weighted ATR, switch to a single flat `.mean()`.

### 10. No slippage model
Fees are modelled, slippage is not. On IDX mid/small caps, slippage on a limit fill is non-trivial. Consider a config-level `SLIPPAGE_BPS` applied on both sides.

### 11. `exits=True` also applied on skipped days
`signals.py:139-146`. Skipped days still emit an exit-at-close signal on the EOD bar. Harmless because there's no open position, but it clutters `vbt_df` and makes trade inspection noisier. Could emit empty signal rows instead.

### 12. Signal loop is row-wise Python
Acceptable for the single-run path (N ≈ 20-60 days). Not urgent, but the bulk path already has a vectorised equivalent — consider reusing `bulk/signals.py` with `n_combos=1` if the two paths drift.

---

## Not a bug, but worth documenting

- **Same-bar SL/TP resolution:** when a single 30-min bar's range contains both SL and TP, VBT resolves it deterministically but pessimistically (SL first by default). Document in `vbt_backtest/CLAUDE.md` gotchas.
- **`upon_long_conflict="ignore"`:** if entry+exit appear on the same bar (rare but possible via pct stops), VBT's behavior depends on this flag — worth an inline comment at the `from_signals` call site.

---

## Recommended order of work

1. **#1 (gap-down fill)** — biggest realism win, small diff, isolated to signals.py.
2. **#2 (bar_interval in get_last_trading_day)** — true bug, one-line fix + signature change.
3. **#3 (ATR window alignment)** — silent correctness issue, medium diff.
4. **#5 (fee array same-bar case)** — verify whether this actually mis-fires in practice before changing; may be a non-issue depending on VBT internals.
5. **#4 (tick vs pct stops)** — decide policy (document vs. fix); if fixing, it's a larger refactor.
6. Rest are polish/comments.

## Critical files for any follow-up

- `modules/vbt_backtest/engine/signals.py:48-277` — the per-day loop
- `modules/vbt_backtest/engine/runner.py:102-125` — `from_signals` call + fee array
- `modules/vbt_backtest/engine/config.py` — add `SLIPPAGE_BPS` if #10 is done
- `modules/vbt_backtest/bulk/signals.py` — mirror any correctness fix here (bulk path must stay consistent)

## Verification (for whichever fix is picked)

- Spot-check a known symbol/date/param combo against `modules/strategy_lab/engine/engine.py` (the scan-every-bar reference engine). Differences should shrink after #1 and #3.
- Run `streamlit run ui/app.py` → VBT Backtest page, pick `BBCA.JK`, compare `signal_df` and trade records pre/post.
- Re-run the bulk sweep on a small grid and confirm aggregate stats don't regress unexpectedly.
