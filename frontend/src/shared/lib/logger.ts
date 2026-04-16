type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = import.meta.env.DEV ? "debug" : "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatPrefix(module: string): string {
  return `[${new Date().toISOString()}] [${module}]`;
}

export function createLogger(module: string) {
  return {
    debug: (...args: unknown[]) => {
      if (shouldLog("debug")) console.debug(formatPrefix(module), ...args);
    },
    info: (...args: unknown[]) => {
      if (shouldLog("info")) console.info(formatPrefix(module), ...args);
    },
    warn: (...args: unknown[]) => {
      if (shouldLog("warn")) console.warn(formatPrefix(module), ...args);
    },
    error: (...args: unknown[]) => {
      if (shouldLog("error")) console.error(formatPrefix(module), ...args);
    },
  };
}
