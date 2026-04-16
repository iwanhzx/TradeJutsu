"""Custom exception hierarchy for TradeJutsu."""


class TradeJutsuError(Exception):
    """Base exception for all TradeJutsu errors."""
    pass


class SymbolNotFoundError(TradeJutsuError):
    def __init__(self, symbol: str):
        self.symbol = symbol
        super().__init__(f"Symbol not found: {symbol}")


class SymbolAlreadyExistsError(TradeJutsuError):
    def __init__(self, symbol: str):
        self.symbol = symbol
        super().__init__(f"Symbol already exists: {symbol}")


class DataFetchError(TradeJutsuError):
    pass


class InsufficientDataError(TradeJutsuError):
    pass
