"""Centralized logging configuration for TradeJutsu."""

import logging
import logging.config

from app.config import settings


def setup_logging() -> None:
    """Configure root logger with console + rotating file handlers."""
    log_dir = settings.log_dir
    log_dir.mkdir(parents=True, exist_ok=True)

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": "INFO",
                    "formatter": "standard",
                    "stream": "ext://sys.stderr",
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "DEBUG",
                    "formatter": "standard",
                    "filename": str(log_dir / "tradejutsu.log"),
                    "maxBytes": 5_000_000,
                    "backupCount": 3,
                    "encoding": "utf-8",
                },
            },
            "loggers": {
                "yfinance": {"level": "WARNING"},
                "urllib3": {"level": "WARNING"},
                "httpcore": {"level": "WARNING"},
                "httpx": {"level": "WARNING"},
                "aiosqlite": {"level": "WARNING"},
                "peewee": {"level": "WARNING"},
            },
            "root": {
                "level": "DEBUG" if settings.debug else "INFO",
                "handlers": ["console", "file"],
            },
        }
    )
