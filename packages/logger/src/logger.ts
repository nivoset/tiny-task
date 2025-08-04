import pino from 'pino';

// Logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
};

// Add pretty printing in development
if (process.env.NODE_ENV !== 'production') {
  try {
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    };
  } catch (error) {
    // Fallback to basic logging if pino-pretty is not available
    console.warn('pino-pretty not available, using basic logging');
  }
}

// Create the main logger instance
export const logger = pino(loggerConfig);

// Create a child logger for tasks with additional context
export function createTaskLogger(taskName: string) {
  return logger.child({ task: taskName });
}

// Create a child logger for flows with additional context
export function createFlowLogger(flowId?: string) {
  return logger.child({ flow: flowId || 'default' });
}

// Export the main logger as default
export default logger; 