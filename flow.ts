import type { ITask } from './node.ts';

// Utility class for creating flows
export class Flow<SharedData extends Record<string, unknown> = Record<string, unknown>> {
  private startTask: ITask<SharedData>;
  private currentTask: ITask<SharedData> | null = null;

  constructor(startTask: ITask<SharedData>) {
    this.startTask = startTask;
    this.currentTask = startTask;
  }

  /**
   * Execute the flow starting from the current task
   * @param shared - Initial shared data
   * @returns Promise resolving to the final shared data
   */
  public async execute(shared: SharedData): Promise<SharedData> {
    let current = this.currentTask || this.startTask;
    
    while (current) {
      const nextTaskName = await current.run(shared);
      
      if (nextTaskName === 'end' || nextTaskName === 'error') {
        break;
      }
      
      const nextTask = current.successors[nextTaskName];
      if (!nextTask) {
        console.warn(`No successor found for action: ${nextTaskName}`);
        break;
      }
      
      current = nextTask;
    }
    
    return shared;
  }

  /**
   * Reset the flow to start from the beginning
   */
  public reset(): void {
    this.currentTask = this.startTask;
  }

  /**
   * Get the current task in the flow
   */
  public getCurrentTask(): ITask<SharedData> | null {
    return this.currentTask;
  }

  /**
   * Set the current task in the flow
   */
  public setCurrentTask(task: ITask<SharedData>): void {
    this.currentTask = task;
  }

  /**
   * Get the start task of the flow
   */
  public getStartTask(): ITask<SharedData> {
    return this.startTask;
  }
}

// Utility function to chain tasks together
export function chainTasks<SharedData extends Record<string, unknown>>(
  ...tasks: ITask<SharedData>[]
): Flow<SharedData> {
  for (let i = 0; i < tasks.length - 1; i++) {
    tasks[i].connect(tasks[i + 1], 'default');
  }
  
  return new Flow(tasks[0]);
}

// Utility function to create a flow from a single task
export function createFlow<SharedData extends Record<string, unknown>>(
  startTask: ITask<SharedData>
): Flow<SharedData> {
  return new Flow(startTask);
}

// Utility function to create a parallel flow (multiple start tasks)
export function createParallelFlow<SharedData extends Record<string, unknown>>(
  ...startTasks: ITask<SharedData>[]
): Flow<SharedData>[] {
  return startTasks.map(task => new Flow(task));
}

/*
// Example usage of Flow class:

import { Task } from './node';

interface UserData {
  name: string;
  age: number;
  email: string;
  processed?: boolean;
  validated?: boolean;
  timestamp?: string;
}

class ValidationTask extends Task<UserData, UserData, boolean> {
  constructor() {
    super('validation');
  }

  protected async exec(shared: UserData): Promise<boolean> {
    return shared.age >= 0 && shared.name.length > 0;
  }
}

class ProcessingTask extends Task<UserData, UserData, UserData> {
  constructor() {
    super('processing');
  }

  protected async exec(shared: UserData): Promise<UserData> {
    return { ...shared, processed: true, timestamp: new Date().toISOString() };
  }
}

// Example 1: Using chainTasks
async function exampleChainFlow() {
  const validationTask = new ValidationTask();
  const processingTask = new ProcessingTask();
  
  const flow = chainTasks(validationTask, processingTask);
  
  const result = await flow.execute({
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
  });
  
  console.log('Chain flow result:', result);
}

// Example 2: Using createFlow
async function exampleCreateFlow() {
  const validationTask = new ValidationTask();
  const processingTask = new ProcessingTask();
  
  // Manual connection
  validationTask.connect(processingTask, 'success');
  
  const flow = createFlow(validationTask);
  
  const result = await flow.execute({
    name: 'Jane Doe',
    age: 30,
    email: 'jane@example.com'
  });
  
  console.log('Create flow result:', result);
}

// Example 3: Using parallel flows
async function exampleParallelFlow() {
  const validationTask1 = new ValidationTask();
  const validationTask2 = new ValidationTask();
  const processingTask1 = new ProcessingTask();
  const processingTask2 = new ProcessingTask();
  
  // Set up separate flows
  validationTask1.connect(processingTask1, 'default');
  validationTask2.connect(processingTask2, 'default');
  
  const flows = createParallelFlow(validationTask1, validationTask2);
  
  const data1 = { name: 'Alice', age: 25, email: 'alice@example.com' };
  const data2 = { name: 'Bob', age: 30, email: 'bob@example.com' };
  
  const results = await Promise.all([
    flows[0].execute(data1),
    flows[1].execute(data2)
  ]);
  
  console.log('Parallel flow results:', results);
}

// Example 4: Flow with reset functionality
async function exampleFlowWithReset() {
  const validationTask = new ValidationTask();
  const processingTask = new ProcessingTask();
  
  const flow = chainTasks(validationTask, processingTask);
  
  const data = { name: 'Charlie', age: 35, email: 'charlie@example.com' };
  
  // Execute first time
  const result1 = await flow.execute(data);
  console.log('First execution:', result1);
  
  // Reset and execute again
  flow.reset();
  const result2 = await flow.execute(data);
  console.log('Second execution:', result2);
}

// Uncomment to run examples:
// exampleChainFlow();
// exampleCreateFlow();
// exampleParallelFlow();
// exampleFlowWithReset();
*/ 