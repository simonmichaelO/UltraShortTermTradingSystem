# MetaTrader 5 Expert Advisor

There is no EA code in Stage 1. `Experts/` will hold the chart-attached entry point. `Include/USTS/` namespaces the modules so they can be copied to the MT5 data folder's `MQL5/Include/USTS/` without colliding with other projects. `Tests/` will hold native fixtures and verification tools. Stage 2 starts with monitoring and a non-sending execution interface. Do not copy these empty folders into MT5 yet.
