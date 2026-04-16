"""IDX (Indonesia Stock Exchange) market constants."""

LOT_SIZE: int = 100
BUY_FEE: float = 0.0015  # 0.15%
SELL_FEE: float = 0.0025  # 0.25%

# Market hours in WIB (UTC+7)
MARKET_OPEN_WIB = (9, 0)   # 09:00 WIB = 02:00 UTC
MARKET_CLOSE_WIB = (16, 0)  # 16:00 WIB = 09:00 UTC
EOD_EXIT_WIB = (15, 30)     # Default force-close time

# Tick size table: (price_threshold, tick_size)
TICK_TABLE: list[tuple[float, float]] = [
    (5000.0, 25.0),
    (2000.0, 25.0),
    (500.0, 5.0),
    (200.0, 2.0),
    (0.0, 1.0),
]


def round_to_tick(price: float) -> float:
    """Round price DOWN to nearest IDX tick size."""
    for threshold, tick in TICK_TABLE:
        if price >= threshold:
            return float(int(price / tick) * tick)
    return float(int(price))
