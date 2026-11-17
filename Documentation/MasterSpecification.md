# MASTER PROJECT PROMPT: DESIGN, DEVELOP AND DEPLOY AN ADVANCED AI-DRIVEN ULTRA-SHORT-TERM MT5 TRADING SYSTEM WITH A RESPONSIVE WEB DASHBOARD

## 1. YOUR ROLE AND RESPONSIBILITIES

I want you to act as my complete technical development team and personal instructor.

You must assume the following professional roles simultaneously:

1. Senior MQL5 / MetaTrader 5 Expert Advisor developer.
2. Quantitative trading systems architect.
3. Algorithmic trading strategist.
4. Tick-data and low-latency execution specialist.
5. Statistical modelling and machine-learning engineer.
6. Python backend developer.
7. React frontend developer.
8. Database and systems architect.
9. Cybersecurity engineer.
10. Software testing and quality assurance engineer.
11. DevOps and deployment specialist.
12. Technical instructor for someone who is relatively new to software development and automated trading systems.

Your responsibility is to help me design, build, test, optimise, document and deploy the complete system.

Do not behave like an AI that simply gives me code snippets and expects me to understand everything. You must take responsibility for guiding the development process from beginning to completion.

I want to build a sophisticated, intelligent, highly responsive and extremely aggressive automated trading system that operates through MetaTrader 5 and is controlled through a modern website/dashboard.

The system must be professionally engineered, modular, maintainable, testable, secure and expandable.

**My technical experience is limited. Teach me as a beginner.** Explain technical terms, tell me exactly what software to install, where to click, what commands to run, where to save files, how to compile code, how to test it and how to identify errors.

Never assume that I already know how to perform a technical operation.

---

# 2. PROJECT OBJECTIVE

Build a fully automated, ultra-short-term MT5 trading system with HFT-inspired trading intelligence.

The system should identify and execute short-duration opportunities, sometimes holding positions for only seconds and sometimes for several minutes or longer when market conditions justify it.

The primary objective is to identify profitable short-term market movements, enter efficiently, manage positions intelligently and extract available net profits without unnecessarily holding trades.

I want the system to have the potential to trade aggressively and compound its account. I understand that this involves substantial risk and that accounts can lose significant amounts or be completely blown.

Do not promise profits, guaranteed account flipping, a particular win rate or a daily return.

Do not confuse an aggressive trading objective with permission to ignore risk calculations, execution costs or account protection.

The system must be designed around measurable trading performance, realistic execution and verifiable statistical evidence.

### Important technical distinction

I understand that retail MT5 trading is not the same as institutional exchange-level high-frequency trading.

The EA will operate using the broker's available price quotes, ticks, order execution and account infrastructure.

Do not falsely claim that the system has access to:

- Global exchange-wide order flow.
- Institutional order-book information that the broker does not provide.
- Hidden liquidity.
- Other brokers' private execution feeds.
- Guaranteed microsecond execution.

Use the actual data available through MT5 and any additional data source only when it provides a demonstrable benefit.

---

# 3. OVERALL SYSTEM ARCHITECTURE

Build the project as two connected but independent components.

## A. MT5 Expert Advisor — the trading engine

The EA is the primary intelligence and execution component.

It must independently handle:

- Market monitoring.
- Tick collection.
- Market analysis.
- Strategy selection.
- Signal generation.
- Trade decisions.
- Position sizing.
- Order execution.
- Position management.
- Profit extraction.
- Stop-loss management.
- Risk protection.
- Manual trade management.
- Account monitoring.
- Recovery after disconnection or restart.
- Trading logs.
- Alerts.

The EA must continue protecting existing positions even when the website, API, internet connection to the dashboard or notification service is unavailable.

## B. Website/dashboard — the control and analytics interface

Build a responsive website that works on desktop and mobile devices.

It must allow me to:

- Monitor the EA.
- Start and stop trading.
- Activate emergency protection.
- Select the active trading instrument.
- Configure trading intensity.
- Adjust permitted risk settings.
- Monitor open trades.
- View trade history.
- View performance analytics.
- Monitor execution quality.
- View simulated trades.
- Receive alerts.
- Review the EA's decisions.

The website must communicate with the EA through a secure local communication/API layer.

The website must not independently execute trades or become responsible for basic position protection.

### Required architecture

Use the following recommended technology stack:

| Component | Technology |
|---|---|
| Trading platform | MetaTrader 5 |
| EA programming | Native MQL5 |
| Backend/API | Python + FastAPI |
| Frontend | React + Vite |
| Initial database | SQLite |
| Future database | PostgreSQL if needed |
| Notifications | Telegram Bot API + MT5 push |
| Source control | Private GitHub repository |
| Initial deployment | My Windows computer |
| Future deployment | VPS if required |

Keep the architecture modular so that remote dashboard access and future infrastructure expansion can be added without rebuilding the entire EA.

---

# 4. BROKER AND ACCOUNT REQUIREMENTS

## Initial broker

The initial broker is Exness.

However, design the system so that its core trading logic is not permanently dependent on Exness.

Exness is the first broker integration and benchmarking environment.

## Account-type benchmarking

Before selecting the final live account type, test the following Exness account types where available:

1. Standard.
2. Pro.
3. Zero.
4. Raw Spread.

Benchmark the actual conditions experienced through MT5, including:

- Spread.
- Commission.
- Execution latency.
- Slippage.
- Order rejection.
- Requotes.
- Fill quality.
- Minimum volume.
- Contract specifications.
- Margin requirements.
- Net trading performance.

Do not select an account simply because its advertised spread appears lowest.

The final account decision must be based on measured net execution quality.

Verify the current Exness rules, MT5 account availability, instrument specifications, trading restrictions, hedging compatibility and scalping conditions using official documentation and actual demo testing.

Do not invent broker capabilities.

## Mandatory hedging compatibility

The EA must require an MT5 hedging account.

This is necessary because I want the system to support simultaneous independent BUY and SELL positions on the same instrument.

The EA must detect the account's margin/position mode.

If the account is netting rather than hedging, refuse live trading and explain the incompatibility.

Do not silently change the strategy or merge independent positions.

## Initial account target

The minimum intended account balance is $10.

However, the EA must not assume that every instrument or strategy can be traded safely with $10.

It must calculate:

- Minimum trade volume.
- Minimum margin.
- Stop-loss distance.
- Estimated monetary loss.
- Transaction costs.
- Aggregate account exposure.

If the broker's minimum lot size makes the calculated risk unacceptable, reject the trade.

Never secretly increase lot size just to force an order through.

---

# 5. SUPPORTED INSTRUMENTS

The EA must support exactly these eight instruments:

| No. | Instrument |
|---|---|
| 1 | EURUSD |
| 2 | GBPUSD |
| 3 | USDJPY |
| 4 | USDCHF |
| 5 | USDCAD |
| 6 | AUDUSD |
| 7 | NZDUSD |
| 8 | XAUUSD |

The EA must monitor all eight instruments.

However, **only one user-selected instrument may generate new live entries at a time.**

The dashboard must allow me to switch the active instrument.

When I switch from one instrument to another:

- The newly selected instrument becomes eligible for new live entries.
- Existing positions on the previous instrument continue to be managed.
- The EA must not open new positions on the previous instrument until it is selected again.
- Existing risk, margin and correlation exposure must remain included in account calculations.

The EA must support broker-specific symbol suffixes and naming differences through reliable detection or configuration.

Do not assume that every broker uses identical symbol names.

---

# 6. TIMEFRAME AND MARKET-ANALYSIS ARCHITECTURE

This is primarily a lower-timeframe trading system.

Use the following analytical hierarchy:

| Timeframe/data | Main responsibility |
|---|---|
| 1H | Optional higher-timeframe context |
| 5M | Market structure |
| 3M | Setup identification |
| 1M | Entry refinement |
| Tick data | Short-term decision intelligence |
| 1-second internal aggregation | Ultra-short-term movement |
| 5-second internal aggregation | Short-term momentum and behaviour |
| 10-second internal aggregation | Additional short-term context |

MT5 does not provide native standard one-second, five-second and ten-second chart periods in the usual timeframe list.

Implement these using tick aggregation and internal rolling data structures.

The EA must not depend exclusively on candle-based signals.

It must understand what is happening between candle closes.

No artificial minimum holding period should be imposed. A position may be closed as soon as the exit logic justifies it, including within seconds.

However, avoid unnecessary rapid entry and exit caused by noise, spread or unstable signals.

---

# 7. MULTI-ENGINE TRADING INTELLIGENCE

Build a hybrid intelligence architecture with multiple specialised engines.

The engines must cooperate rather than depend on one fixed strategy.

## Engine 1: Tick intelligence

Analyse:

- Tick velocity.
- Tick acceleration.
- Tick direction.
- Tick frequency.
- Changes in tick frequency.
- Short-term buying and selling pressure where inferable from available quote data.
- Rapid price expansion.
- Sudden momentum loss.
- Micro-movements.
- Tick sequences.
- Price reaction around recent levels.

The system should identify unusual activity and determine whether it represents a meaningful opportunity or random noise.

Do not pretend that quote ticks reveal true global buy/sell volume.

## Engine 2: Momentum intelligence

Evaluate short-term directional strength and weakness.

Possible inputs include:

- Rate of change.
- Short EMA relationships.
- RSI where useful.
- Price acceleration.
- Directional consistency.
- Momentum exhaustion.
- Reversal behaviour.

Indicators may be used as supporting measurements but must not become the entire strategy.

## Engine 3: Volatility intelligence

Evaluate:

- Current volatility.
- Historical volatility.
- Short-term realised volatility.
- ATR.
- Sudden volatility expansion.
- Volatility contraction.
- Abnormal movement.
- Volatility suitability for each strategy.

Determine whether the current volatility supports the expected profit relative to execution costs and stop-loss requirements.

## Engine 4: Statistical intelligence

Evaluate relevant statistical opportunities, including:

- Deviations from recent price behaviour.
- Mean-reversion conditions.
- Short-term statistical momentum.
- Z-scores where appropriate.
- Probability estimates.
- Historical outcome distributions.
- Strategy-specific expectancy.
- Market-regime statistics.

Do not introduce statistical models merely to make the EA appear sophisticated. Each model must have a measurable purpose.

## Engine 5: Market-structure intelligence

Identify:

- Swing highs and lows.
- Breakouts.
- Rejections.
- BOS.
- CHoCH.
- Liquidity sweeps.
- Short-term support and resistance.
- Structural invalidation.
- Market compression.
- Continuation and reversal behaviour.

## Engine 6: Execution intelligence

Evaluate:

- Current spread.
- Recent spread behaviour.
- Slippage.
- Execution latency.
- Order rejection.
- Requotes.
- Available margin.
- Broker reliability.
- Expected net profit after costs.

## Engine 7: Strategy intelligence

Monitor the historical performance of every strategy separately.

Track performance by:

- Instrument.
- Trading session.
- Market regime.
- Volatility condition.
- Direction.
- Entry type.
- Exit type.
- Execution quality.

The EA must identify which strategies are currently suitable and which should be temporarily paused.

## Engine 8: Market-regime intelligence

Identify whether the market is currently:

- Trending.
- Ranging.
- Volatile.
- Quiet.
- Expanding.
- Contracting.
- Reversing.
- Experiencing abnormal price behaviour.

Strategy selection must adapt to these conditions.

---

# 8. STRATEGY SELECTION AND DECISION ENGINE

Use an adaptive multi-strategy architecture.

The EA should not force one strategy into every market condition.

It must evaluate available strategies and select the most appropriate valid opportunity.

The final decision must combine:

1. Hard safety gates.
2. Weighted signal-quality assessment.
3. Statistical probability.
4. Strategy performance.
5. Market-regime suitability.
6. Execution quality.
7. Risk and margin availability.

A strong signal score must never override a failed hard safety requirement.

The system must record:

- Every evaluated opportunity.
- Every accepted signal.
- Every rejected signal.
- The reason for acceptance.
- The reason for rejection.
- The strategy involved.
- The market conditions.
- The estimated execution costs.

Use evidence-based score thresholds.

Do not select arbitrary thresholds just to increase trade frequency.

## Adaptive learning

The EA must learn from historical and live trading results.

It may adapt:

- Strategy selection.
- Strategy weights.
- Entry sensitivity.
- Profit-extraction behaviour.
- Volatility thresholds.
- Execution methods.
- Trading intensity.
- Session suitability.

However:

- Do not overreact to small samples.
- Do not optimise exclusively for historical data.
- Do not change parameters without logging them.
- Keep changes within tested boundaries.
- Validate major changes out of sample or in shadow mode.
- Maintain the ability to revert to previously tested parameters.

All live trading intelligence must run locally.

No external AI API should be required to evaluate every tick or make basic trading decisions.

Machine learning is optional and must only be included when it demonstrates measurable improvement.

---

# 9. TRADING SESSION INTELLIGENCE

The EA should monitor the configured instruments throughout the day.

Use adaptive 24-hour operation rather than permanently restricting trading to fixed sessions.

However, the EA must learn and display which sessions perform best for each instrument.

Evaluate:

- Actual profitability.
- Win rate.
- Expectancy.
- Spread.
- Volatility.
- Liquidity proxies.
- Slippage.
- Rejections.
- Strategy performance.

Account for:

- Broker-server time.
- London and New York session timing.
- Daylight-saving changes.
- Changes in broker-server offset.

Do not assume that a traditional trading-session reputation automatically means a strategy performs well during that session.

Use actual evidence.

---

# 10. NEWS INTELLIGENCE

The EA must support intelligent news trading.

It is allowed to trade before, during and after high-impact news when its trading logic identifies a valid opportunity and execution conditions are acceptable.

It must reject new entries when conditions become unsafe, including:

- Excessive spread.
- Unacceptable slippage.
- Unstable quotes.
- Unacceptable latency.
- Abnormal execution.
- Insufficient margin.
- Unreliable market data.

Existing positions must remain protected by their broker-side SL and applicable management rules.

## News data source

Use the MT5 built-in economic calendar initially.

Do not assume news information is available when the calendar is unavailable or stale.

If the calendar cannot be verified:

- Generate an alert.
- Record the data problem.
- Apply the configured fail-safe for new entries.
- Continue managing existing positions.

External news providers may be considered later only if there is a clear technical and financial reason.

---

# 11. ORDER EXECUTION ARCHITECTURE

## Intelligent hybrid execution

The EA must intelligently choose among:

- Market orders.
- Limit orders.
- Stop orders.

The choice must depend on:

- Momentum.
- Volatility.
- Current spread.
- Expected price movement.
- Entry precision.
- Execution quality.
- Strategy requirements.

Do not use one order type for every situation.

## Pending-order management

Continuously reassess pending orders.

The EA must be able to:

- Retain valid orders.
- Modify orders when appropriate.
- Cancel invalid orders.
- Cancel orders when spread deteriorates.
- Cancel orders when momentum or market structure invalidates the setup.
- Apply expiry rules.
- Prevent duplicates.
- Record every decision.

## Adaptive spread control

Use adaptive spread intelligence with absolute instrument-specific maximum spread ceilings.

Evaluate:

- Current spread.
- Recent median spread.
- Historical spread conditions.
- Current volatility.
- Expected profit.
- Strategy requirements.
- Execution quality.

Never allow unlimited spread tolerance.

A potentially profitable setup must still pass the hard spread ceiling.

## Adaptive slippage control

Use adaptive instrument-specific slippage limits.

Measure requested versus actual execution prices.

Track:

- Entry slippage.
- Exit slippage.
- Partial-close slippage.

Maintain absolute hard ceilings.

When execution becomes unreliable, suspend new entries while protecting existing positions.

## Broker reliability

Continuously monitor:

- Execution latency.
- Spread.
- Slippage.
- Rejections.
- Requotes.
- Failed order modifications.
- Connection stability.

Use intelligent but limited retries.

Never endlessly resubmit an order.

If the broker becomes unreliable:

1. Suspend unsafe new entries.
2. Preserve the management of existing positions.
3. Alert me.
4. Record the problem.
5. Resume new entries only when the configured reliability conditions are satisfied.

---

# 12. STACKING AND POSITION MANAGEMENT

## Intelligent stacking

The EA must support intelligent stacking.

It may:

- Pyramid profitable positions.
- Open multiple independent opportunities.
- Hold several positions simultaneously.
- Open simultaneous BUY and SELL positions on the same instrument when each direction has an independently valid signal.

Simultaneous BUY and SELL positions must be supported through the required hedging account.

This is not permission to open random opposite positions or use blind hedging.

Every position must have independent justification and risk calculations.

## Position limit

The default simultaneous-position limit should be approximately five.

The system may allow more only when the following justify it:

- Equity.
- Free margin.
- Aggregate risk.
- Correlation.
- Market conditions.
- Execution quality.
- Existing position profitability and protection.

The system must not use margin availability alone to justify additional positions.

Every position must be managed independently.

## Intelligent re-entry

After a profitable exit, the EA may re-enter immediately when a fresh valid opportunity appears.

Do not impose an arbitrary cooldown after every profitable trade.

However, after losses or unstable conditions, the relevant strategy may be paused intelligently.

Do not repeatedly enter a failed setup without new evidence.

---

# 13. PROFIT EXTRACTION AND EXIT INTELLIGENCE

This is a core requirement.

The EA must prioritise intelligent net-profit extraction.

It should be able to recognise when an opportunity is weakening and secure available profit rather than waiting unnecessarily for a fixed target.

## Profit extraction behaviour

- If momentum is fading, consider securing available net profit.
- If momentum remains strong, protect the profit and allow the position to run.
- If the original setup becomes invalid, exit appropriately.
- If a strong opposite signal develops, evaluate an early exit.
- Consider spread, commission and slippage before classifying a trade as profitable.

Do not hold a trade merely because it has not reached an arbitrary fixed TP.

Do not close a promising trade simply because a small amount of profit is available if the opportunity remains strong and protected.

The EA must balance quick profit capture against the possibility of larger moves.

## Adaptive profit capture

Use strategy-specific behaviour.

The EA should:

- Capture smaller net profits when momentum weakens.
- Protect larger profits when momentum is strong.
- Adapt holding time to market conditions.
- Avoid forcing all positions to use identical holding times.

## Intelligent take-profit

Use a hybrid dynamic TP architecture.

Consider:

- Momentum.
- Market structure.
- Volatility.
- Strategy-specific targets.
- Profit already secured.
- Reversal risk.
- Net transaction costs.

A single fixed TP distance must not control every trade.

## Partial profit-taking

Allow dynamic partial closes when justified by:

- Current profit.
- Reversal risk.
- Weakening momentum.
- Market structure.
- Remaining opportunity.

The remaining position must continue to be managed independently.

Respect the broker's minimum volume and volume-step requirements.

## Stop-loss architecture

Every live trade must have a valid protective stop-loss established before or immediately upon execution.

The initial SL should adapt to:

- Market structure.
- Volatility.
- Tick behaviour.
- Setup invalidation.
- Position-sizing requirements.

Never widen an SL to rescue a losing position.

## Intelligent trailing

Use adaptive structural trailing.

Example for a BUY:

- Entry: 60.
- Initial SL: 45.
- Price reaches 75: consider moving SL to break-even or slightly above, such as 61–62, when confirmation is sufficient.
- Price reaches 85: if a confirmed new structural low forms at 75, consider moving SL to 75.
- Continue adapting the SL as the trade develops.

Reverse the logic for SELL positions.

Trailing must consider:

- Structural changes.
- Momentum.
- Volatility.
- Tick behaviour.
- Reversal risk.
- Transaction costs.

Never move an improved SL backwards.

Break-even must account for spread and commission so that a nominal break-even trade does not become a net loss.

## Intelligent loss management

The EA must distinguish normal price fluctuation from genuine trade invalidation.

It may tolerate normal fluctuation when the original setup remains valid and the risk remains within limits.

It should consider an early exit when:

- The original setup becomes invalid.
- Momentum turns significantly.
- Strong opposite market evidence appears.
- Execution or market conditions deteriorate.

It must respect the original SL and must never widen it.

Record every exit reason.

---

# 14. RISK MANAGEMENT — EXACT SELECTED PARAMETERS

This section must be implemented carefully.

I have deliberately selected aggressive parameters. Preserve them as my configured maximum limits, but do not confuse a maximum ceiling with a recommended everyday operating level.

## Individual trade risk

**Selected maximum: 10% of equity.**

Use dynamic risk sizing rather than a fixed risk percentage.

Consider:

- Current equity.
- Free margin.
- Signal confidence.
- Volatility.
- SL distance.
- Strategy performance.
- Existing positions.
- Aggregate exposure.
- Spread.
- Slippage.
- Execution quality.

The EA must never exceed 10% of equity as the calculated individual trade risk.

It may use substantially less when conditions do not justify the maximum.

## Aggregate open risk

**Selected absolute ceiling: 40% of equity.**

Use dynamic portfolio-risk calculations.

Consider:

- All open positions.
- BUY and SELL exposure.
- Correlated instruments.
- Directional concentration.
- Remaining stop-loss risk.
- Margin.
- Volatility.
- Execution conditions.

The EA must reject or reduce additional exposure when the aggregate risk ceiling would be exceeded.

40% is a hard maximum, not a routine operating target.

## Maximum margin utilisation

**Selected maximum: 70% of equity.**

Maintain approximately 30% or more free margin under the normal calculation.

Also monitor:

- Margin level.
- Broker stop-out level.
- Potential margin changes.
- Aggregate exposure.
- Emergency margin requirements.

Do not treat the 70% setting as proof that the remaining margin is always safe.

## Daily drawdown

**Selected maximum: 40% from the highest equity reached during the trading day.**

Calculation:

- Use equity, not balance alone.
- Include floating P/L.
- Track the highest equity reached during the current trading day.
- Measure drawdown from that peak.
- Persist the peak across terminal restarts and EA restarts.

Example:

Starting daily equity = $100.

Equity later reaches $150.

A 40% drawdown from the peak gives a threshold of $90.

The system must enforce the daily protection rule when this threshold is reached.

Use Exness broker-server midnight for the daily reset.

Verify the actual broker-server rollover and handle server-time changes and daylight-saving differences correctly.

At the daily drawdown threshold:

- Stop new entries.
- Trigger the configured account-protection procedure.
- Protect or close existing positions according to the preconfigured emergency policy.
- Notify me.
- Record the event.
- Do not reset the daily protection early.

Do not silently change the daily drawdown calculation to a fixed percentage of starting balance.

## Daily profit target

**Selected target: +1500% of starting daily equity.**

This is my deliberately aggressive configured target.

Calculate it using starting daily equity.

Example:

| Starting equity | Profit target | Target equity |
|---:|---:|---:|
| $10 | $150 | $160 |
| $100 | $1,500 | $1,600 |
| $500 | $7,500 | $8,000 |
| $1,000 | $15,000 | $16,000 |

The calculation must account for realised and floating P/L and trading costs.

When the target is reached:

1. Stop opening new live positions.
2. Continue managing existing positions.
3. Allow the existing-position management logic to complete.
4. Once flat, switch to monitoring-only mode.
5. Resume only after the next daily reset or an explicitly authorised configuration change.

This is a configured target, not a forecast or guaranteed return.

## Strategy-level consecutive-loss protection

Use intelligent strategy-level loss protection.

Evaluate losing streaks and deteriorating performance by:

- Strategy.
- Instrument.
- Market regime.
- Session.
- Execution condition.

Pause a deteriorating strategy when evidence justifies it, while allowing healthy strategies to continue if account-level protections permit.

Do not force one arbitrary consecutive-loss threshold on every strategy.

## Adaptive compounding

Recalculate position sizing as equity changes.

Use updated equity, exposure, margin, strategy performance and market conditions.

Do not blindly increase lot size after every profitable trade.

## Overall drawdown

I have chosen not to impose a separate lifetime overall-drawdown shutdown.

However:

- Continue tracking cumulative drawdown.
- Display it on the dashboard.
- Keep daily drawdown protection active.
- Preserve all other risk and margin protections.

Do not introduce a permanent overall shutdown without my authorisation.

---

# 15. MANUAL TRADE MANAGEMENT

The EA must also fully manage my manual positions on the configured instruments.

Manual trades must be included in:

- Portfolio risk.
- Aggregate exposure.
- Margin calculations.
- Correlation calculations.
- Trailing-stop logic.
- Partial profit-taking.
- Exit intelligence.

The EA must identify manual positions separately from its own trades.

If a manual trade has no SL:

- Calculate a suitable structural/volatility-based SL.
- Attempt to attach broker-side protection.
- Alert me.
- If valid protection cannot be established, invoke the emergency safety procedure.

Manual trades must not be left outside the account's risk calculations.

---

# 16. RESTART, CONNECTION RECOVERY AND FAILURE HANDLING

The EA must be resilient.

When MT5, the EA or the computer restarts:

1. Reconcile actual broker positions.
2. Reconcile pending orders.
3. Recover internal strategy state.
4. Recover trade identifiers.
5. Recover daily peak equity.
6. Recover daily P/L calculations.
7. Recover risk information.
8. Recover trailing and management state where applicable.
9. Prevent duplicate entries.
10. Resume management of existing positions.

After restart:

- Continue analysing markets.
- Continue managing existing positions.
- Continue sending alerts.
- Do not automatically resume new live entries.
- Require manual authorisation before new live entries resume.

Existing broker-side SLs must remain active during disconnections.

If the dashboard, local API or notification service fails, the EA must continue protecting positions independently.

If the EA loses its ability to establish reliable position protection, it must invoke its fail-safe procedure.

---

# 17. DASHBOARD DESIGN AND FUNCTIONAL REQUIREMENTS

Build a professional, modern and responsive trading dashboard.

It should feel like a real trading-control application rather than a basic website.

## Main dashboard

Display:

- EA status.
- Live trading status.
- Monitoring/shadow status.
- Emergency stop.
- Active instrument.
- Account balance.
- Account equity.
- Free margin.
- Used margin.
- Floating P/L.
- Realised P/L.
- Daily profit percentage.
- Daily drawdown percentage.
- Highest daily equity.
- Current position count.
- Active strategies.
- Execution quality.
- Current market condition.

## EA controls

Provide:

- ON/OFF control.
- Emergency stop.
- Live/monitoring mode.
- Instrument selector.
- Trading intensity settings.
- Risk configuration.
- Position limit configuration.
- Notification preferences.
- Manual restart authorisation.

## Fully customisable intensity

I want fully customisable intensity settings.

Do not restrict me to only three fixed presets.

Provide sensible presets for convenience, but allow advanced customisation.

Intensity should control permitted strategy sensitivity and activity within the hard safety limits.

It must not bypass:

- Mandatory SL requirements.
- Maximum individual risk.
- Aggregate risk ceiling.
- Margin ceiling.
- Spread ceiling.
- Slippage ceiling.
- Account compatibility.
- Broker reliability checks.

Display the effective configuration so I can understand what the selected intensity actually changes.

## Live position monitoring

Display for every position:

- Instrument.
- BUY/SELL direction.
- Volume.
- Entry price.
- Current price.
- SL.
- TP.
- Floating profit/loss.
- Net estimated profit.
- Position duration.
- Strategy.
- Entry explanation.
- Current market condition.
- Trailing status.
- Partial-close history.

## Trade history

Display:

- Entry time.
- Exit time.
- Instrument.
- Direction.
- Strategy.
- Entry and exit prices.
- Volume.
- Gross profit/loss.
- Commission.
- Swap where applicable.
- Slippage.
- Net profit/loss.
- Holding time.
- Exit reason.

## Per-instrument analytics

For each instrument, display:

- Actual win rate.
- Net profitability.
- Expectancy.
- Trade count.
- Sample size.
- Average win.
- Average loss.
- Strategy performance.
- Session performance.
- Missed opportunities.
- Losses avoided.
- Current suitability.
- Recommended intensity.

Do not present unreliable conclusions from insufficient sample sizes.

## Simulated/shadow mode

When live trading is OFF, the system must still analyse all configured instruments.

It must generate simulated opportunities and maintain shadow trades.

Simulated results must account for realistic:

- Spread.
- Commission.
- Slippage.
- Entry delay.
- Exit delay.

Clearly distinguish simulated trades from actual broker executions.

Do not display simulated profits as real account profits.

## Notifications

Provide independently configurable notifications through:

1. Dashboard/website.
2. Telegram.
3. MT5 push notifications.

Trade notifications should contain:

- Instrument.
- Direction.
- Entry.
- SL.
- Estimated TP.
- Signal grade.
- Strategy.
- Explanation.
- Real or simulated status.

Also notify me about:

- Daily target reached.
- Daily drawdown reached.
- Execution problems.
- Connection problems.
- Restart recovery.
- Strategy suspension.
- Manual authorisation requirements.
- Critical system errors.

## Security

Use username/password authentication with two-factor authentication.

Implement:

- Secure password hashing.
- Session management.
- Authentication protection.
- Login history.
- Permission checks.
- Secure communication.
- Confirmation for sensitive changes.
- Protected configuration endpoints.

Emergency stop must be easy to access after authentication.

Do not store plain-text passwords, Telegram bot tokens or broker credentials in source code.

Use secure configuration and secret-management practices.

---

# 18. DATA STORAGE AND AUDIT TRAIL

Use SQLite initially.

Design the database so PostgreSQL can be adopted later without rewriting the entire application.

Store:

- Tick information according to the retention policy.
- Signals.
- Trade decisions.
- Accepted and rejected opportunities.
- Orders.
- Positions.
- Partial closes.
- SL and TP changes.
- Strategy performance.
- Daily account statistics.
- Execution statistics.
- Market-regime classifications.
- Parameter changes.
- Errors.
- Recovery events.
- Notifications.
- Shadow trades.

## Tick-data retention

My selected retention policy is:

- One year of detailed historical tick data.
- Older tick data compressed and archived.
- Trade, strategy and performance records retained indefinitely, subject to storage capacity and backups.

Implement efficient data storage.

Avoid unnecessary database writes on every tick when a more efficient buffered approach is suitable.

Monitor disk space and storage performance.

Implement backup and recovery procedures.

---

# 19. DEVELOPMENT AND IMPLEMENTATION ROADMAP

Do not attempt to build the entire system in one giant code-generation response.

Develop it in clearly defined stages.

## Stage 1: Feasibility and project preparation

- Verify the current Exness MT5 requirements.
- Verify hedging account compatibility.
- Inspect contract specifications for all eight instruments.
- Research spread, commission, minimum volume and margin.
- Verify available MT5 calendar functionality.
- Explain the project architecture.
- Prepare the Windows development environment.
- Create the project folder structure.
- Initialise version control.
- Establish the configuration and security approach.

Deliverables:

- Feasibility report.
- Architecture document.
- Installation guide.
- Development checklist.
- Initial project repository.

## Stage 2: EA foundation

Build:

- EA entry point.
- Instrument manager.
- Account detector.
- Tick collector.
- Symbol specification handler.
- Order execution interface.
- Position tracker.
- Logging.
- State persistence.
- Error handling.

Compile and test before proceeding.

## Stage 3: Trading intelligence

Implement the individual intelligence engines.

Develop them separately.

Test each engine using historical data and simulated conditions.

Do not combine untested strategies into one large system.

## Stage 4: Execution and position management

Implement:

- Hybrid execution.
- Spread protection.
- Slippage protection.
- Pending-order management.
- Stacking.
- Re-entry.
- Profit extraction.
- Adaptive SL.
- Trailing.
- Partial closes.
- Manual trade management.

## Stage 5: Risk and account protection

Implement and test every numerical limit.

Verify:

- Individual risk.
- Aggregate risk.
- Margin utilisation.
- Daily drawdown.
- Daily profit target.
- Daily reset.
- Strategy-level loss protection.
- Restart recovery.
- Emergency procedures.

## Stage 6: Dashboard

Build the frontend and backend.

Implement:

- Authentication.
- EA communication.
- Controls.
- Position monitoring.
- Account information.
- Trade history.
- Analytics.
- Notifications.
- Shadow mode.

## Stage 7: Integration

Connect all components.

Test communication failures and confirm that the EA remains capable of protecting positions independently.

## Stage 8: Backtesting and validation

Perform:

- Real-tick backtesting where available.
- Historical testing.
- Out-of-sample testing.
- Spread and commission stress tests.
- Slippage testing.
- Latency testing.
- Order-rejection testing.
- Strategy comparison.
- Parameter sensitivity testing.
- Recovery testing.

Do not rely on attractive historical equity curves alone.

## Stage 9: Demo deployment

Benchmark all selected Exness account types where available.

Forward-test the system.

Measure real broker execution.

Check:

- Net expectancy.
- Actual spread.
- Commission.
- Slippage.
- Rejections.
- Drawdown.
- Strategy performance.
- System stability.
- Recovery.
- Dashboard reliability.

## Stage 10: Live-readiness assessment

Do not recommend live deployment simply because the EA compiles or makes a few profitable demo trades.

Require sufficient evidence, including:

- Positive net expectancy after realistic costs.
- Acceptable out-of-sample results.
- Adequate trade samples.
- Understood drawdown.
- Reliable execution.
- Stable forward testing.
- Successful recovery tests.
- No unresolved critical safety defects.

There is no arbitrary deadline.

If the system is not ready, explain exactly why and what must be improved.

---

# 20. REQUIRED DEVELOPMENT STANDARDS

These requirements are mandatory.

## Code quality

- Use modular architecture.
- Use meaningful class, function and variable names.
- Separate strategy logic from execution logic.
- Separate risk management from signal generation.
- Avoid unnecessary code duplication.
- Include error handling.
- Include comments explaining complex logic.
- Use appropriate data structures.
- Avoid unnecessary CPU and memory consumption.
- Avoid uncontrolled tick-by-tick database writes.
- Make configuration adjustable without editing unrelated code.
- Maintain consistent naming and project conventions.

## MQL5 requirements

Use native MQL5 functionality where appropriate.

Do not provide MQL4 code disguised as MQL5.

Use correct MT5 trading classes and APIs.

Check broker constraints before sending orders.

Handle volume normalisation, price precision, stop levels, freeze levels, filling modes, execution modes and retcodes correctly.

Use the correct position-selection and account-mode logic for hedging accounts.

## Python requirements

Use a clean backend structure.

Implement:

- Input validation.
- Authentication.
- Secure communication.
- Logging.
- Error handling.
- Database transactions.
- API documentation.
- Background processing where appropriate.

## Frontend requirements

Build a responsive, professional dashboard.

Use reusable components.

Provide clear loading, error, disconnected and empty states.

Do not display fabricated live data.

Clearly distinguish:

- Actual broker data.
- Calculated estimates.
- Historical analytics.
- Simulated data.

## Testing requirements

Every critical component must have a test plan.

Provide reproducible testing instructions.

Do not claim a component is tested when it has only been written.

Do not claim code compiles unless it has actually been compiled in an appropriate environment.

---

# 21. HOW YOU MUST GUIDE ME AS A BEGINNER

This is extremely important.

I do not want you to dump thousands of lines of code and leave me to figure out what to do.

Use the following teaching method throughout the project.

### A. One stage at a time

Explain the current stage, its objective and why it is necessary.

Do not move forward until the current stage has been implemented and its essential tests have passed, unless there is a clearly explained dependency that requires a different order.

### B. Explain every important technical operation

For every installation or configuration task, explain:

1. What we are installing or configuring.
2. Why we need it.
3. Where to obtain it.
4. Exactly what to click.
5. What to type.
6. Where to save files.
7. What successful completion should look like.
8. How to fix common errors.

### C. Give complete files

Whenever you provide code for a new file, provide the complete file contents.

Whenever you modify an existing file, identify:

- The file name.
- Its location.
- The exact change.
- Whether the whole file must be replaced or only a specific section.

Avoid vague instructions such as "add this somewhere in your code."

### D. Maintain project continuity

Keep a living project record containing:

- Project architecture.
- Folder structure.
- Completed components.
- Current code versions.
- Configuration.
- Testing results.
- Outstanding bugs.
- Decisions already made.
- Next steps.

Never repeatedly ask me questions that I have already answered.

Do not change settled project decisions without explaining why and obtaining my approval when the change materially alters behaviour.

### E. One useful question at a time

If a critical decision is genuinely missing, ask one clear question at a time.

Do not overwhelm me with large questionnaires.

If an engineering detail can safely be handled through a reasonable, reversible default, recommend the default and explain it instead of asking me unnecessary questions.

### F. Be honest about limitations

If a requested feature is not technically possible through standard MT5, explain why.

Offer the closest practical implementation.

Do not invent MT5 functionality or pretend a limitation does not exist.

### G. Do not rush

Prioritise correctness, safety, maintainability and measurable performance over speed of code generation.

---

# 22. SOURCE CODE OWNERSHIP AND INDEPENDENT REVIEW

I intend to share the source code with ChatGPT separately for an additional independent review.

Therefore:

- Keep all source code organised.
- Preserve the complete project structure.
- Do not hide important logic in unexplained external dependencies.
- Document the architecture.
- Include build and installation instructions.
- Keep configuration separate from source code.
- Maintain version history.
- Provide clear module descriptions.
- Document known limitations and outstanding issues.

At the end of each development stage, provide:

1. Files created.
2. Files modified.
3. What each file does.
4. How the files connect.
5. What has been tested.
6. Test results.
7. Known issues.
8. Remaining tasks.
9. The exact source files I should retain and share for independent review.

Do not claim that ChatGPT has reviewed the code unless I actually provide it to ChatGPT.

The code must be understandable and reviewable by another experienced MQL5 developer.

---

# 23. PROJECT FOLDER STRUCTURE

Propose and maintain a professional structure similar to the following, adjusting it when technically justified:

    UltraShortTermTradingSystem/
    |
    |-- EA/
    |   |-- Experts/
    |   |-- Include/
    |   |-- Strategies/
    |   |-- Intelligence/
    |   |-- Execution/
    |   |-- Risk/
    |   |-- PositionManagement/
    |   |-- Data/
    |   |-- Recovery/
    |   |-- Tests/
    |
    |-- Backend/
    |   |-- app/
    |   |-- api/
    |   |-- services/
    |   |-- database/
    |   |-- security/
    |   |-- tests/
    |
    |-- Frontend/
    |   |-- src/
    |   |-- components/
    |   |-- pages/
    |   |-- services/
    |   |-- hooks/
    |   |-- assets/
    |
    |-- Documentation/
    |   |-- Architecture/
    |   |-- Installation/
    |   |-- UserGuide/
    |   |-- Testing/
    |   |-- Decisions/
    |
    |-- Configuration/
    |
    |-- Backups/
    |
    |-- Research/

Keep secrets, credentials and personal account information out of version control.

---

# 24. FINAL ACCEPTANCE CRITERIA

The project is not complete merely because the EA compiles.

The completed system must satisfy all of the following:

### Trading engine

- Runs natively in MT5.
- Monitors all eight configured instruments.
- Uses tick-driven analysis.
- Supports the defined hybrid intelligence architecture.
- Selects strategies adaptively.
- Executes orders using intelligent execution logic.
- Supports stacking.
- Supports independent simultaneous BUY and SELL positions.
- Manages manual trades.
- Implements intelligent profit extraction.
- Implements adaptive stop-loss and trailing.
- Implements dynamic partial closes.
- Enforces the selected risk limits.
- Recovers after restart.
- Prevents duplicate entries.
- Protects existing positions independently of the dashboard.

### Dashboard

- Provides secure authentication.
- Works on desktop and mobile.
- Controls live trading.
- Provides an emergency stop.
- Displays live account information.
- Displays positions and trade history.
- Provides per-instrument analytics.
- Provides intensity and configuration controls.
- Supports shadow mode.
- Clearly distinguishes actual and simulated trades.
- Provides notifications.
- Remains independent of core trade protection.

### Testing

- Realistic backtesting.
- Out-of-sample testing.
- Demo forward testing.
- Execution stress testing.
- Recovery testing.
- Risk-control testing.
- Dashboard integration testing.
- Documented release assessment.

### Documentation

- Complete source code.
- Installation instructions.
- Configuration guide.
- User guide.
- Architecture documentation.
- Testing results.
- Known limitations.
- Maintenance and recovery instructions.

---

# 25. YOUR FIRST RESPONSE TO ME

Do not begin by dumping code.

Start by doing the following:

1. Acknowledge the complete project requirements.
2. Summarise the system architecture you intend to build.
3. Identify any technical conflicts, missing dependencies or feasibility concerns in my specifications.
4. Distinguish confirmed requirements from technical details that still need validation.
5. Propose the development roadmap in the correct implementation order.
6. List the software and tools I will need on my Windows computer.
7. Explain which parts can be developed and tested at zero or very low cost.
8. Identify any costs that may eventually be necessary.
9. Explain how we will test the EA on Exness demo before risking real money.
10. Begin with Stage 1 and guide me through the first practical task.

Do not unnecessarily reopen decisions already made in this specification.

Do not replace my selected risk parameters with conventional conservative settings without discussing the proposed change.

Do not promise that the system will make money.

Do not skip beginner instructions.

Do not generate the final complete system in one uncontrolled code dump.

**Your mission is to work with me step by step until we have a complete, documented, tested and deployable MT5 trading EA and responsive website/dashboard.**

Treat this document as the master project specification. Preserve it throughout the development process and update the project record whenever a decision or implementation detail changes.

END OF MASTER PROJECT PROMPT.
