# Logic critique — LogicSet1 as a trading methodology

Looking at the *strategy design* itself, independent of how it's coded.

## Structural weaknesses

**1. No regime / trend filter — the single biggest logical gap.**
The strategy buys dips unconditionally. In a downtrend every "dip" is a knife. A dip-buy without a trend gate is the classic ruin mode. Minimum addition: only trade when `close > SMA(N)` daily, or skip days where yesterday closed red + gap-down today, or require prior-day green.

**2. TP and SL are measured on incompatible bases.**
- TP = retracement toward `price_preference` (geometry-based)
- SL = `buy × atr_1h% × sl_factor` (volatility-based)

They're controlled by unrelated knobs, so the actual R:R is an accidental byproduct of `tp_factor`, `buy_factor`, and whatever `atr_1h/atr_1d` happens to be that day. Expectancy becomes uninterpretable and the optimizer overfits the ratio by chance. **Fix:** parameterize directly by R. `risk = buy − sl`, `tp = buy + R × risk`. Let R and the SL width be the only two exit knobs.

**3. Entry-target formula blends two volatility measures that mean different things.**
`atr_1h + (atr_1d − atr_1h) × buffer` is a weighted avg between hourly and daily TR%. But daily TR% already *contains* the intraday moves — they're not independent axes. What you actually want is a single "how far should I expect price to pull back today?" number. Consider just `k × atr_1d` or the rolling median of intraday retracement depth (actual observed `(high − low_after_high)/open`), which is what you're trying to capture.

**4. SL uses `atr_1h` only — same inconsistency.**
On high-daily-vol regimes, an SL built on hourly TR% sits inside noise. Either blend (consistent with the entry formula) or move SL to ATR-daily basis.

## Entry quality

**5. "Open of the 2nd bar" is an arbitrary anchor.**
There's no theoretical reason bar #2's open is the "right" reference. Alternatives with more meaning:
- First-bar *range midpoint* (post opening-auction, pre trending)
- VWAP of first 2–3 bars (smoother, less tick-luck)
- `max(prior_close, session_open)` — anchors to something already rejected by buyers

**6. Buying_price is a pure % offset — no support level awareness.**
A dip buy should ideally sit *at a level where buyers historically show up*: prior-day low, overnight low, first-bar low, daily pivot. You can still multiply by an ATR-based offset, but snapping to the nearest support within a tolerance band would materially improve fill quality vs. "random % below anchor".

**7. No minimum entry_target_pct floor.**
On low-vol days the formula produces tiny targets (e.g. 0.4%). That's inside IDX spread + fees + slippage — you're trading noise and guaranteeing negative expectancy after costs. Add `entry_target_pct ≥ fees + spread + epsilon`, else skip.

## Exit / sizing

**8. Force-close at EOD close is a blunt time stop.**
The last 30-min bar is often the worst print of the session (closing auction volatility, index rebalances). Two cheaper fixes: close at 14:30 instead, or close at VWAP of last 3 bars. Best fix: once price reaches 0.5R profit, trail SL to breakeven so EOD rarely matters.

**9. One shot per day — asymmetric.**
Re-entry after an SL is risky (revenge), but re-entry after a TP is free alpha on volatile days. Consider allowing a 2nd entry only after TP.

**10. `size = 100% cash` destroys statistical validity.**
With all-in sizing, a backtest's total return is dominated by one or two trades (path-dependent, non-ergodic). Good for ranking params, terrible for estimating *expectancy*. For research, switch to fixed-fraction (10% per trade) or vol-targeted risk, then size up only when live.

## Methodology (not strategy, but critical)

**11. Five continuous parameters + grid search = overfit machine.**
- Split dates train/test 70/30 and only report OOS.
- Evaluate *parameter stability*: does a neighborhood around the best combo also perform well? If not, you picked a spike, not a signal.
- Cross-validate across symbols: does the same combo work on BBRI, BMRI, TLKM? If not, there's no edge — just curve fit.

**12. No cross-sectional selection.**
Single-symbol dip buying is weaker than "buy today's deepest dipper in a basket of N quality names." Even if you keep the strategy per-symbol, ranking opportunities across a universe and allocating to the top K improves hit rate dramatically.

---

## Top 5 to act on

1. **Trend / regime filter** (daily SMA gate) — biggest risk reduction for smallest code.
2. **Re-parameterize TP/SL as R-multiples on a single volatility basis** — cleans expectancy and optimizer surface.
3. **Minimum entry_target_pct floor** — kills no-edge days.
4. **Walk-forward OOS + neighborhood stability check** — protects against overfit you currently can't see.
5. **Move away from 100%-cash sizing** for research runs — your metrics become meaningful.
