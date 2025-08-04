export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }
  
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }
  
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }
  
  debug(message: string, ...args: unknown[]): void {
    console.debug(message, ...args);
  }
}

export async function createLogger(): Promise<Logger> {
  try {
    // Try to use pino if available
    const pinoModule = await import('pino');
    const pino = pinoModule.default || pinoModule;
    const logger = pino();
    return logger;
  } catch {
    // Fall back to console logger
    return new ConsoleLogger();
  }
}

export function createLoggerSync(): Logger {
  // Always return console logger for sync usage
  return new ConsoleLogger();
}

export const defaultLogger = createLoggerSync();

// Create a child logger for tasks with additional context
export function createTaskLogger(taskName: string): Logger {
  const logger = createLoggerSync();
  return {
    info: (message: string, ...args: unknown[]) => logger.info(`[Task:${taskName}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(`[Task:${taskName}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => logger.error(`[Task:${taskName}] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => logger.debug(`[Task:${taskName}] ${message}`, ...args),
  };
}

// Create a child logger for flows with additional context
export function createFlowLogger(flowId?: string): Logger {
  const logger = createLoggerSync();
  const flowName = flowId || 'default';
  return {
    info: (message: string, ...args: unknown[]) => logger.info(`[Flow:${flowName}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(`[Flow:${flowName}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => logger.error(`[Flow:${flowName}] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => logger.debug(`[Flow:${flowName}] ${message}`, ...args),
  };
} 