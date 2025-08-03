import { createTaskLogger } from './logger.js';

// Base interface for all tasks
export interface ITask<SharedData extends Record<string, unknown> = Record<string, unknown>> {
  readonly name: string;
  successors: Record<string, ITask<SharedData>>;
  connect(next: ITask<SharedData>, action?: string): ITask<SharedData>;
  run(shared: SharedData): Promise<string>;
}

// Abstract base class for all tasks
export abstract class Task<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SharedData extends Record<string, any> = Record<string, unknown>,
  PreparedData = SharedData,
  ExecResult = unknown
> implements ITask<SharedData> {
  
  public readonly name: string;
  public successors: Record<string, ITask<SharedData>> = {};
  protected logger: ReturnType<typeof createTaskLogger>;
  
  constructor(name: string) {
    this.name = name;
    this.logger = createTaskLogger(this.name);
  }

  /**
   * Connect this node to a successor node
   * @param next - The next node in the flow
   * @param action - The action name (defaults to 'default')
   * @returns The connected node for chaining
   */
  public connect(next: ITask<SharedData>, action: string = 'default'): ITask<SharedData> {
    this.successors[action] = next;
    return next;
  }

  /**
   * Main entry point - orchestrates the node's execution flow
   * @param shared - Shared data accessible to all nodes
   * @returns Promise resolving to the name of the next node to execute
   */
  public async run(shared: SharedData): Promise<string> {
    try {
      this.logger.debug('Starting task execution', { taskName: this.name });
      
      // Step 1: Prepare data
      const prepared = await this.prepare(shared);
      this.logger.debug('Data preparation completed', { taskName: this.name });
      
      // Step 2: Execute the main logic
      const result = await this.exec(prepared);
      this.logger.debug('Task execution completed', { taskName: this.name });
      
      // Step 3: Determine next step and update shared data
      const nextNode = await this.post(shared, prepared, result);
      this.logger.debug('Post-processing completed', { taskName: this.name, nextNode });
      
      // Update shared data with the execution result
      this.updateSharedData(shared, result);
      
      this.logger.info('Task completed successfully', { taskName: this.name, nextNode });
      return nextNode;
    } catch (error) {
      this.logger.error('Task execution failed', { 
        taskName: this.name, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return 'error'; // Default error handling
    }
  }

  /**
   * Optional method to prepare/transform shared data for execution
   * Override this method to customize data preparation
   * @param shared - The shared data
   * @returns Promise resolving to prepared data
   */
  protected async prepare(shared: SharedData): Promise<PreparedData> {
    // Default implementation: return shared data as-is
    return shared as unknown as PreparedData;
  }

  /**
   * Required method to execute the main node logic
   * Must be implemented by subclasses
   * @param prepared - The prepared data from the prepare method
   * @returns Promise resolving to the execution result
   */
  protected abstract exec(prepared: PreparedData): Promise<ExecResult>;

  /**
   * Optional method to determine the next node and handle post-execution logic
   * Override this method to customize flow control
   * @param shared - The shared data
   * @param prepared - The prepared data
   * @param result - The execution result
   * @returns Promise resolving to the name of the next node
   */
  protected async post(
    _shared: SharedData, 
    _prepared: PreparedData, 
    _result: ExecResult
  ): Promise<keyof typeof this.successors | 'default'> {
    // Default implementation: continue to next node
    return 'default';
  }

  /**
   * Optional method to update shared data with execution results
   * Override this method to customize how results are stored
   * @param shared - The shared data to update
   * @param result - The execution result
   */
  protected updateSharedData(shared: SharedData, result: ExecResult): void {
    // Default implementation: store result in shared data under node name
    // @ts-expect-error - this is a valid way to update shared data in this case
    shared[this.name] = result;
  }

  /**
   * Validate that the next node name is valid
   * @param nodeName - The name of the next node
   * @returns True if valid, false otherwise
   */
  protected isValidNextNode(nodeName: string): nodeName is keyof typeof this.successors | 'default' {
    return nodeName === 'default' || nodeName in this.successors;
  }
}

// Type aliases for common use cases
export type SimpleTask<SharedData extends Record<string, unknown>> = Task<SharedData, SharedData, unknown>;
export type DataTransformTask<SharedData extends Record<string, unknown>, Output> = Task<SharedData, SharedData, Output>;
