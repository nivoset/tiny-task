// Core Task system
export { Task } from './task.js';

// Flow orchestration
export { Flow, chainTasks, createFlow, createParallelFlow } from './flow.js';

// Parallel processing
export { 
  ParallelTask, 
  createParallelTask, 
  type ParallelTaskConfig, 
  type ParallelTaskResult 
} from './parallel.js';

// Logging
export { logger, createTaskLogger, createFlowLogger } from './logger.js';

// Re-export types for convenience
export type { ITask, SimpleTask, DataTransformTask } from './task.js';

// Import all components for the Tiny object
import { Task } from './task.js';
import { Flow, chainTasks, createFlow, createParallelFlow } from './flow.js';
import { ParallelTask, createParallelTask } from './parallel.js';
import { logger, createTaskLogger, createFlowLogger } from './logger.js';

// Create the Tiny object that bundles all main components
const Tiny = {
  Task,
  Flow,
  ParallelTask,
  chainTasks,
  createFlow,
  createParallelFlow,
  createParallelTask,
  logger,
  createTaskLogger,
  createFlowLogger
} as const;

// Default export
export default Tiny; 