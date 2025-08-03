import { Task } from './node.ts';

// Interface for parallel task configuration
export interface ParallelTaskConfig {
  maxConcurrency: number;
  timeout?: number; // Optional timeout per individual task
}

// Interface for parallel task results
export interface ParallelTaskResult<T> {
  results: T[];
  errors: Array<{ index: number; error: Error; data: any }>;
  totalProcessed: number;
  totalErrors: number;
  processingTime: number;
}

// Abstract base class for parallel tasks
export abstract class ParallelTask<
  SharedData extends Record<string, unknown> = Record<string, unknown>,
  PreparedData = SharedData,
  ExecResult = unknown
> extends Task<SharedData, PreparedData[], ParallelTaskResult<ExecResult>> {
  
  private config: ParallelTaskConfig;

  constructor(name: string, config: ParallelTaskConfig) {
    super(name);
    this.config = config;
  }

  /**
   * Required method to prepare shared data into an array for parallel processing
   * @param shared - The shared data
   * @returns Promise resolving to an array of prepared data items
   */
  protected abstract prepare(shared: SharedData): Promise<PreparedData[]>;

  /**
   * Required method to execute the main logic on a single item
   * @param prepared - A single prepared data item
   * @returns Promise resolving to the execution result for this item
   */
  protected abstract execItem(prepared: PreparedData): Promise<ExecResult>;

  /**
   * Override the base exec method to handle parallel processing
   * @param prepared - The array of prepared data items
   * @returns Promise resolving to parallel task results
   */
  protected async exec(prepared: PreparedData[]): Promise<ParallelTaskResult<ExecResult>> {
    return this.processInParallel(prepared);
  }

  /**
   * Optional method to determine the next task and handle post-execution logic
   * Override this method to customize flow control
   * @param shared - The shared data
   * @param prepared - The original prepared data array
   * @param result - The parallel execution results
   * @returns Promise resolving to the name of the next task
   */
  protected async post(
    shared: SharedData,
    prepared: PreparedData[],
    result: ParallelTaskResult<ExecResult>
  ): Promise<keyof typeof this.successors | 'default'> {
    // Default implementation: continue to next task
    return 'default';
  }

  /**
   * Optional method to update shared data with parallel execution results
   * Override this method to customize how results are stored
   * @param shared - The shared data to update
   * @param result - The parallel execution results
   */
  protected updateSharedData(shared: SharedData, result: ParallelTaskResult<ExecResult>): void {
    // Default implementation: store results in shared data under task name
    (shared as any)[this.name] = result;
  }

  /**
   * Process items in parallel with concurrency control
   * @param items - Array of items to process
   * @returns Promise resolving to parallel task results
   */
  private async processInParallel(items: PreparedData[]): Promise<ParallelTaskResult<ExecResult>> {
    const startTime = Date.now();
    const results: ExecResult[] = [];
    const errors: Array<{ index: number; error: Error; data: any }> = [];
    
    // Process items in batches based on maxConcurrency
    for (let i = 0; i < items.length; i += this.config.maxConcurrency) {
      const batch = items.slice(i, i + this.config.maxConcurrency);
             const batchPromises = batch.map(async (item, batchIndex) => {
         const globalIndex = i + batchIndex;
         try {
           const result = await this.execItem(item);
           return { index: globalIndex, result, error: null };
         } catch (error) {
           return { 
             index: globalIndex, 
             result: null, 
             error: error instanceof Error ? error : new Error(String(error)),
             data: item
           };
         }
       });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process batch results
      batchResults.forEach(({ index, result, error, data }) => {
        if (error) {
          errors.push({ index, error, data });
        } else {
          // Ensure results array is large enough
          while (results.length <= index) {
            results.push(null as any);
          }
          results[index] = result!;
        }
      });
    }

    const processingTime = Date.now() - startTime;

    return {
      results,
      errors,
      totalProcessed: items.length,
      totalErrors: errors.length,
      processingTime
    };
  }

  /**
   * Main execution method that orchestrates parallel processing
   * @param shared - Shared data accessible to all tasks
   * @returns Promise resolving to the name of the next task to execute
   */
  public async run(shared: SharedData): Promise<string> {
    try {
      // Step 1: Prepare data into array
      const prepared = await this.prepare(shared);
      
      if (!Array.isArray(prepared) || prepared.length === 0) {
        console.warn(`Parallel task ${this.name}: No items to process`);
        return 'default';
      }

      console.log(`Parallel task ${this.name}: Processing ${prepared.length} items with max concurrency ${this.config.maxConcurrency}`);
      
      // Step 2: Execute in parallel
      const result = await this.processInParallel(prepared);
      
      // Step 3: Determine next step and update shared data
      const nextTask = await this.post(shared, prepared, result);
      
      // Update shared data with the execution result
      this.updateSharedData(shared, result);
      
      console.log(`Parallel task ${this.name}: Completed ${result.totalProcessed} items, ${result.totalErrors} errors, ${result.processingTime}ms`);
      
      return nextTask;
    } catch (error) {
      console.error(`Error in parallel task ${this.name}:`, error);
      return 'error';
    }
  }
}

// Utility function to create a parallel task with default configuration
export function createParallelTask<
  SharedData extends Record<string, unknown>,
  PreparedData,
  ExecResult
>(
  name: string,
  maxConcurrency: number,
  prepareFn: (shared: SharedData) => Promise<PreparedData[]>,
  execFn: (prepared: PreparedData) => Promise<ExecResult>
): ParallelTask<SharedData, PreparedData, ExecResult> {
  
  return new (class extends ParallelTask<SharedData, PreparedData, ExecResult> {
    constructor() {
      super(name, { maxConcurrency });
    }

    protected async prepare(shared: SharedData): Promise<PreparedData[]> {
      return prepareFn(shared);
    }

    protected async execItem(prepared: PreparedData): Promise<ExecResult> {
      return execFn(prepared);
    }
  })();
}

/*
// Example usage of ParallelTask:

import { ParallelTask, createParallelTask } from './parallel-task.ts';
import { chainTasks } from './flow.ts';

interface UserData {
  users: Array<{ id: string; name: string; email: string }>;
  processedUsers?: Array<{ id: string; name: string; email: string; processed: boolean }>;
  processingStats?: {
    totalProcessed: number;
    totalErrors: number;
    processingTime: number;
  };
}

// Example 1: Custom parallel task class
class UserProcessingTask extends ParallelTask<UserData, { id: string; name: string; email: string }, { id: string; processed: boolean }> {
  constructor() {
    super('userProcessing', { maxConcurrency: 5 });
  }

  protected async prepare(shared: UserData): Promise<Array<{ id: string; name: string; email: string }>> {
    // Extract users to process
    return shared.users || [];
  }

  protected async execItem(user: { id: string; name: string; email: string }): Promise<{ id: string; processed: boolean }> {
    // Simulate some processing work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    // Simulate occasional errors
    if (Math.random() < 0.1) {
      throw new Error(`Failed to process user ${user.id}`);
    }
    
    return { id: user.id, processed: true };
  }

  protected updateSharedData(shared: UserData, result: ParallelTaskResult<{ id: string; processed: boolean }>): void {
    // Update shared data with processing results
    shared.processedUsers = result.results.filter(r => r !== null);
    shared.processingStats = {
      totalProcessed: result.totalProcessed,
      totalErrors: result.totalErrors,
      processingTime: result.processingTime
    };
  }
}

// Example 2: Using createParallelTask utility
const emailValidationTask = createParallelTask<UserData, string, boolean>(
  'emailValidation',
  3, // max concurrency
  async (shared: UserData) => {
    // Extract emails to validate
    return shared.users?.map(user => user.email) || [];
  },
  async (email: string) => {
    // Simulate email validation
    await new Promise(resolve => setTimeout(resolve, 200));
    return email.includes('@') && email.includes('.');
  }
);

// Example 3: Using parallel tasks in a flow
async function exampleParallelFlow() {
  const userProcessingTask = new UserProcessingTask();
  const emailValidationTask = createParallelTask<UserData, string, boolean>(
    'emailValidation',
    3,
    async (shared: UserData) => shared.users?.map(user => user.email) || [],
    async (email: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return email.includes('@') && email.includes('.');
    }
  );

  const flow = chainTasks(userProcessingTask, emailValidationTask);

  const data: UserData = {
    users: [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      { id: '4', name: 'Diana', email: 'diana@example.com' },
      { id: '5', name: 'Eve', email: 'eve@example.com' },
      { id: '6', name: 'Frank', email: 'frank@example.com' },
      { id: '7', name: 'Grace', email: 'grace@example.com' },
      { id: '8', name: 'Henry', email: 'henry@example.com' },
      { id: '9', name: 'Ivy', email: 'ivy@example.com' },
      { id: '10', name: 'Jack', email: 'jack@example.com' }
    ]
  };

  const result = await flow.execute(data);
  console.log('Parallel processing completed:', result);
}

// Example 4: Error handling in parallel tasks
class RobustProcessingTask extends ParallelTask<UserData, { id: string; data: any }, { id: string; success: boolean }> {
  constructor() {
    super('robustProcessing', { maxConcurrency: 2, timeout: 5000 });
  }

  protected async prepare(shared: UserData): Promise<Array<{ id: string; data: any }>> {
    return shared.users?.map(user => ({ id: user.id, data: user })) || [];
  }

  protected async execItem(item: { id: string; data: any }): Promise<{ id: string; success: boolean }> {
    // Simulate processing with potential errors
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000));
    
    if (Math.random() < 0.2) {
      throw new Error(`Processing failed for item ${item.id}`);
    }
    
    return { id: item.id, success: true };
  }

  protected async post(
    shared: UserData,
    prepared: Array<{ id: string; data: any }>,
    result: ParallelTaskResult<{ id: string; success: boolean }>
  ): Promise<keyof typeof this.successors | 'default'> {
    // Route based on error rate
    const errorRate = result.totalErrors / result.totalProcessed;
    
    if (errorRate > 0.5) {
      return 'error'; // Too many errors
    } else if (errorRate > 0.1) {
      return 'retry'; // Some errors, might want to retry
    } else {
      return 'default'; // Success
    }
  }
}

// Uncomment to run examples:
// exampleParallelFlow();
*/ 