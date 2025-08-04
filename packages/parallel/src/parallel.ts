import { Task } from '@tiny/task';
import { createTaskLogger } from '@tiny/core';

// Interface for parallel task configuration
export interface ParallelTaskConfig {
  maxConcurrency: number;
  timeout?: number; // Optional timeout per individual task
}

// Interface for parallel task results
export interface ParallelTaskResult<T> {
  results: T[];
  errors: Array<{ index: number; error: Error; data: unknown }>;
  totalProcessed: number;
  totalErrors: number;
  processingTime: number;
}

// Abstract base class for parallel tasks
export abstract class ParallelTask<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SharedData extends Record<string, any> = Record<string, unknown>,
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
    _shared: SharedData,
    _prepared: PreparedData[],
    _result: ParallelTaskResult<ExecResult>
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
    // @ts-expect-error - this is a valid way to update shared data in this case
    shared[this.name] = result;
  }

  /**
   * Process items in parallel with concurrency control
   * @param items - Array of items to process
   * @returns Promise resolving to parallel task results
   */
  private async processInParallel(items: PreparedData[]): Promise<ParallelTaskResult<ExecResult>> {
    const startTime = Date.now();
    const results: ExecResult[] = [];
    const errors: Array<{ index: number; error: Error; data: unknown }> = [];
    
    this.logger.debug('Starting parallel processing', { 
      totalItems: items.length, 
      maxConcurrency: this.config.maxConcurrency 
    });
    
    // Process items in batches based on maxConcurrency
    for (let i = 0; i < items.length; i += this.config.maxConcurrency) {
      const batch = items.slice(i, i + this.config.maxConcurrency);
      const batchNumber = Math.floor(i / this.config.maxConcurrency) + 1;
      const totalBatches = Math.ceil(items.length / this.config.maxConcurrency);
      
      this.logger.debug('Processing batch', { 
        batchNumber, 
        totalBatches, 
        batchSize: batch.length 
      });
      
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.execItem(item);
          this.logger.debug('Item processed successfully', { 
            globalIndex, 
            batchIndex 
          });
          return { index: globalIndex, result, error: null };
        } catch (error) {
          this.logger.debug('Item processing failed', { 
            globalIndex, 
            batchIndex, 
            error: error instanceof Error ? error.message : String(error)
          });
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
            results.push(undefined as ExecResult);
          }
          results[index] = result!;
        }
      });
      
      this.logger.debug('Batch completed', { 
        batchNumber, 
        batchSuccesses: batchResults.filter(r => !r.error).length,
        batchErrors: batchResults.filter(r => r.error).length
      });
    }

    const processingTime = Date.now() - startTime;

    this.logger.debug('Parallel processing completed', { 
      totalResults: results.length, 
      totalErrors: errors.length, 
      processingTime 
    });

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
      this.logger.debug('Starting parallel task execution');
      
      // Step 1: Prepare data into array
      const prepared = await this.prepare(shared);
      
      if (!Array.isArray(prepared) || prepared.length === 0) {
        this.logger.warn('No items to process');
        return 'default';
      }

      this.logger.info('Processing items in parallel', { 
        itemCount: prepared.length, 
        maxConcurrency: this.config.maxConcurrency 
      });
      
      // Step 2: Execute in parallel
      const result = await this.processInParallel(prepared);
      
      // Step 3: Determine next step and update shared data
      const nextTask = await this.post(shared, prepared, result);
      
      // Update shared data with the execution result
      this.updateSharedData(shared, result);
      
      this.logger.info('Parallel task completed', { 
        totalProcessed: result.totalProcessed, 
        totalErrors: result.totalErrors, 
        processingTime: result.processingTime 
      });
      
      return nextTask;
    } catch (error) {
      this.logger.error('Parallel task execution failed', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
