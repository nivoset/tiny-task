// Core Task system
export { Task } from '@tiny/task';

// Flow orchestration
export { Flow, chainTasks, createFlow, createParallelFlow } from '@tiny/flow';

// Parallel processing
export { 
  ParallelTask, 
  createParallelTask, 
  type ParallelTaskConfig, 
  type ParallelTaskResult 
} from '@tiny/parallel';

// Logging
export { logger, createTaskLogger, createFlowLogger } from '@tiny/logger';

// Re-export types for convenience
export type { ITask, SimpleTask, DataTransformTask } from '@tiny/task';

// Import all components for the Tiny object
import { Task } from '@tiny/task';
import { Flow, chainTasks, createFlow, createParallelFlow } from '@tiny/flow';
import { ParallelTask, createParallelTask } from '@tiny/parallel';
import { logger, createTaskLogger, createFlowLogger } from '@tiny/logger';

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