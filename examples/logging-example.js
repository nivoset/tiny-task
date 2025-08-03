import { Task, chainTasks, logger } from '../dist/index.js';

// Set log level to debug to see all logs
process.env.LOG_LEVEL = 'debug';

// Example task with custom logging
class LoggingExampleTask extends Task {
  constructor() {
    super('loggingExample');
  }

  async exec(data) {
    // Use the task-specific logger
    this.logger.debug('Processing data', { inputValue: data.value });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = `Processed: ${data.value * 2}`;
    this.logger.info('Task completed', { result });
    
    return result;
  }
}

// Example task with error logging
class ErrorExampleTask extends Task {
  constructor() {
    super('errorExample');
  }

  async exec(data) {
    this.logger.debug('Starting error example task');
    
    if (data.value < 0) {
      this.logger.warn('Negative value detected', { value: data.value });
      throw new Error('Negative values are not allowed');
    }
    
    return `Valid value: ${data.value}`;
  }
}

// Example flow with logging
async function runLoggingExample() {
  logger.info('Starting logging example');
  
  const task1 = new LoggingExampleTask();
  const task2 = new ErrorExampleTask();
  
  const flow = chainTasks(task1, task2);
  
  // Test with positive value
  logger.info('Testing with positive value');
  const result1 = await flow.execute({ value: 5 });
  console.log('Result 1:', result1);
  
  // Reset flow for next test
  flow.reset();
  
  // Test with negative value (will cause error)
  logger.info('Testing with negative value');
  const result2 = await flow.execute({ value: -3 });
  console.log('Result 2:', result2);
  
  logger.info('Logging example completed');
}

// Run the example
runLoggingExample().catch(console.error); 