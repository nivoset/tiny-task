// Base interface for all tasks
export interface ITask<SharedData extends Record<string, unknown> = Record<string, unknown>> {
  readonly name: string;
  successors: Record<string, ITask<SharedData>>;
  connect(next: ITask<SharedData>, action?: string): ITask<SharedData>;
  run(shared: SharedData): Promise<string>;
}

// Abstract base class for all tasks
export abstract class Task<
  SharedData extends Record<string, unknown> = Record<string, unknown>,
  PreparedData = SharedData,
  ExecResult = unknown
> implements ITask<SharedData> {
  
  public readonly name: string;
  public successors: Record<string, ITask<SharedData>> = {};
  
  constructor(name: string) {
    this.name = name;
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
      // Step 1: Prepare data
      const prepared = await this.prepare(shared);
      
      // Step 2: Execute the main logic
      const result = await this.exec(prepared);
      
      // Step 3: Determine next step and update shared data
      const nextNode = await this.post(shared, prepared, result);
      
      // Update shared data with the execution result
      this.updateSharedData(shared, result);
      
      return nextNode;
    } catch (error) {
      console.error(`Error in node ${this.name}:`, error);
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
    shared: SharedData, 
    prepared: PreparedData, 
    result: ExecResult
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
    (shared as any)[this.name] = result;
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

/*
// Example usage and implementation:

// Define your shared data type
interface UserData {
  name: string;
  age: number;
  email: string;
  processed?: boolean;
  validated?: boolean;
  timestamp?: string;
}

// Example 1: Simple validation task
class ValidationTask extends Task<UserData, UserData, boolean> {
  constructor() {
    super('validation');
  }

  protected async exec(shared: UserData): Promise<boolean> {
    // Validate the user data
    const isValid = shared.age >= 0 && 
                   shared.name.length > 0 && 
                   shared.email.includes('@');
    
    console.log(`Validation result: ${isValid}`);
    return isValid;
  }

  protected async post(
    shared: UserData, 
    prepared: UserData, 
    result: boolean
  ): Promise<keyof typeof this.successors | 'default'> {
    // If validation fails, go to error path, otherwise continue
    return result ? 'default' : 'error';
  }
}

// Example 2: Data processing task with custom preparation
class ProcessingTask extends Task<UserData, { name: string; age: number }, UserData> {
  constructor() {
    super('processing');
  }

  protected async prepare(shared: UserData): Promise<{ name: string; age: number }> {
    // Extract only the fields we need for processing
    return {
      name: shared.name,
      age: shared.age
    };
  }

  protected async exec(prepared: { name: string; age: number }): Promise<UserData> {
    // Process the data
    const processed = {
      name: prepared.name.toUpperCase(),
      age: prepared.age,
      email: 'processed@example.com', // Add default email
      processed: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('Processing completed:', processed);
    return processed;
  }
}

// Example 3: Task with custom shared data update
class LoggingTask extends Task<UserData, UserData, void> {
  constructor() {
    super('logging');
  }

  protected async exec(shared: UserData): Promise<void> {
    console.log('Current shared data:', shared);
  }

  protected updateSharedData(shared: UserData, result: void): void {
    // Custom update logic - add logging timestamp
    (shared as any).lastLogged = new Date().toISOString();
  }
}

// Example 4: Conditional routing task
class AgeCheckTask extends Task<UserData, UserData, string> {
  constructor() {
    super('ageCheck');
  }

  protected async exec(shared: UserData): Promise<string> {
    if (shared.age < 18) {
      return 'minor';
    } else if (shared.age < 65) {
      return 'adult';
    } else {
      return 'senior';
    }
  }

  protected async post(
    shared: UserData, 
    prepared: UserData, 
    result: string
  ): Promise<keyof typeof this.successors | 'default'> {
    // Route based on age category
    return result as keyof typeof this.successors;
  }
}

// Example 5: Using the tasks in a flow
async function exampleFlow() {
  // Import flow utilities
  import { chainTasks } from './flow';
  
  // Create tasks
  const validationTask = new ValidationTask();
  const processingTask = new ProcessingTask();
  const loggingTask = new LoggingTask();
  const ageCheckTask = new AgeCheckTask();

  // Set up conditional routing for age check
  ageCheckTask.connect(processingTask, 'adult');
  ageCheckTask.connect(loggingTask, 'minor');
  ageCheckTask.connect(loggingTask, 'senior');

  // Chain the tasks
  const flow = chainTasks(validationTask, ageCheckTask);

  // Execute the flow
  const initialData: UserData = {
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
  };

  try {
    const result = await flow.execute(initialData);
    console.log('Flow completed successfully:', result);
  } catch (error) {
    console.error('Flow failed:', error);
  }
}

// Example 6: Manual task connection
async function manualFlowExample() {
  // Import flow utilities
  import { createFlow } from './flow';
  
  const validationTask = new ValidationTask();
  const processingTask = new ProcessingTask();
  const loggingTask = new LoggingTask();

  // Manual connection with custom action names
  validationTask.connect(processingTask, 'success');
  validationTask.connect(loggingTask, 'error');

  const flow = createFlow(validationTask);
  
  const data: UserData = {
    name: 'Jane Doe',
    age: 30,
    email: 'jane@example.com'
  };

  const result = await flow.execute(data);
  console.log('Manual flow result:', result);
}

// Uncomment to run examples:
// exampleFlow();
// manualFlowExample();
*/
