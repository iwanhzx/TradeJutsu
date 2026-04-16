from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TRADEJUTSU_")

    app_name: str = "TradeJutsu"
    debug: bool = True

    # Database paths
    database_dir: Path = Path(__file__).parent.parent / "database"
    duckdb_path: Path = Path(__file__).parent.parent / "database" / "market.duckdb"
    sqlite_path: Path = Path(__file__).parent.parent / "database" / "app.sqlite"

    # API
    api_prefix: str = "/api/v1"

    # yfinance
    yfinance_timeout: int = 30
    yfinance_max_retries: int = 3


settings = Settings()
