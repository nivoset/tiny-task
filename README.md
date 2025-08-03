# TinyTask

A lightweight, modular task flow system with parallel processing capabilities built in TypeScript.

## Features

- **Modular Task System**: Create reusable, composable tasks with strong typing
- **Flow Orchestration**: Chain tasks together with conditional routing
- **Parallel Processing**: Execute multiple tasks concurrently with configurable concurrency limits
- **Type Safety**: Full TypeScript support with generics for type-safe data flow
- **Error Handling**: Built-in error handling and recovery mechanisms
- **Structured Logging**: Pino-based logging with configurable levels and structured output
- **Extensible**: Easy to extend and customize for your specific needs

## Installation

```bash
npm install tinytask
```

## Quick Start

```typescript
import { Task, Flow, chainTasks } from 'tinytask';

// Define your data interface
interface UserData {
  name: string;
  age: number;
  email: string;
  processed?: boolean;
  validated?: boolean;
}

// Create a validation task
class ValidationTask extends Task<UserData, UserData, boolean> {
  constructor() {
    super('validation');
  }

  protected async exec(data: UserData): Promise<boolean> {
    return data.age >= 0 && data.name.length > 0;
  }
}

// Create a processing task
class ProcessingTask extends Task<UserData, UserData, UserData> {
  constructor() {
    super('processing');
  }

  protected async exec(data: UserData): Promise<UserData> {
    return { ...data, processed: true };
  }
}

// Chain tasks together
const flow = chainTasks(new ValidationTask(), new ProcessingTask());

// Execute the flow
const result = await flow.execute({
  name: 'John Doe',
  age: 25,
  email: 'john@example.com'
});

console.log(result); // { name: 'John Doe', age: 25, email: 'john@example.com', processed: true }
```

## Core Concepts

### Task

A `Task` is the fundamental unit of work in TinyTask. Each task has three main phases:

1. **Prepare** (optional): Transform shared data into the format needed for execution
2. **Execute** (required): Perform the main work of the task
3. **Post** (optional): Determine the next task and update shared data

```typescript
class MyTask extends Task<SharedData, PreparedData, ExecResult> {
  constructor() {
    super('myTask');
  }

  // Optional: Transform data for execution
  protected async prepare(shared: SharedData): Promise<PreparedData> {
    return transformedData;
  }

  // Required: Main task logic
  protected async exec(prepared: PreparedData): Promise<ExecResult> {
    return result;
  }

  // Optional: Determine next step and update shared data
  protected async post(
    shared: SharedData,
    prepared: PreparedData,
    result: ExecResult
  ): Promise<keyof typeof this.successors | 'default'> {
    return 'nextTask';
  }

  // Optional: Update shared data with results
  protected updateSharedData(shared: SharedData, result: ExecResult): void {
    shared.myTask = result;
  }
}
```

### Flow

A `Flow` orchestrates the execution of multiple tasks in sequence:

```typescript
import { Flow, chainTasks, createFlow } from 'tinytask';

// Method 1: Chain tasks together
const flow = chainTasks(task1, task2, task3);

// Method 2: Manual connection
task1.connect(task2, 'success');
task2.connect(task3, 'default');
const flow = createFlow(task1);

// Execute the flow
const result = await flow.execute(initialData);
```

### ParallelTask

For processing multiple items concurrently:

```typescript
import { ParallelTask, createParallelTask } from 'tinytask';

// Custom parallel task
class UserProcessingTask extends ParallelTask<UserData, User, ProcessedUser> {
  constructor() {
    super('userProcessing', { maxConcurrency: 5 });
  }

  protected async prepare(shared: UserData): Promise<User[]> {
    return shared.users || [];
  }

  protected async execItem(user: User): Promise<ProcessedUser> {
    // Process a single user
    return processedUser;
  }
}

// Or use the utility function
const emailValidationTask = createParallelTask<UserData, string, boolean>(
  'emailValidation',
  3, // max concurrency
  async (shared: UserData) => shared.emails || [],
  async (email: string) => email.includes('@')
);
```

## API Reference

### Task

#### Constructor
```typescript
constructor(name: string)
```

#### Methods
- `run(shared: SharedData): Promise<string>` - Execute the task lifecycle
- `connect(next: Task, action: string = 'default'): Task` - Connect to next task
- `prepare(shared: SharedData): Promise<PreparedData>` - Transform data (optional)
- `exec(prepared: PreparedData): Promise<ExecResult>` - Main execution logic (required)
- `post(shared: SharedData, prepared: PreparedData, result: ExecResult): Promise<string>` - Post-processing (optional)
- `updateSharedData(shared: SharedData, result: ExecResult): void` - Update shared data (optional)

### Flow

#### Constructor
```typescript
constructor(startTask: Task)
```

#### Methods
- `execute(shared: SharedData): Promise<SharedData>` - Execute the flow
- `reset(): void` - Reset to start task
- `getCurrentTask(): Task | null` - Get current task
- `setCurrentTask(task: Task): void` - Set current task
- `getStartTask(): Task` - Get start task

#### Utility Functions
- `chainTasks(...tasks: Task[]): Flow` - Chain tasks together
- `createFlow(startTask: Task): Flow` - Create flow from single task
- `createParallelFlow(...startTasks: Task[]): Flow[]` - Create multiple flows

### ParallelTask

#### Constructor
```typescript
constructor(name: string, config: ParallelTaskConfig)
```

#### Configuration
```typescript
interface ParallelTaskConfig {
  maxConcurrency: number;
  timeout?: number;
}
```

#### Methods
- `prepare(shared: SharedData): Promise<PreparedData[]>` - Prepare array of items (required)
- `execItem(prepared: PreparedData): Promise<ExecResult>` - Process single item (required)
- `updateSharedData(shared: SharedData, result: ParallelTaskResult<ExecResult>): void` - Update shared data (optional)

#### Utility Function
- `createParallelTask(name: string, maxConcurrency: number, prepareFn, execFn): ParallelTask`

## Logging

TinyTask uses Pino for structured logging with configurable levels. The logging system provides:

- **Structured JSON output** in production
- **Pretty-printed logs** in development
- **Configurable log levels** via `LOG_LEVEL` environment variable
- **Context-aware logging** with task and flow information

### Log Levels

- `error` - Only error messages
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information
- `trace` - Very detailed tracing

### Usage

```typescript
import { logger, createTaskLogger, createFlowLogger } from 'tinytask';

// Use the main logger
logger.info('Application started');

// Create task-specific logger
const taskLogger = createTaskLogger('myTask');
taskLogger.debug('Task execution details');

// Create flow-specific logger
const flowLogger = createFlowLogger('myFlow');
flowLogger.info('Flow completed');
```

### Environment Configuration

```bash
# Set log level
export LOG_LEVEL=debug

# Enable pretty printing in development
export NODE_ENV=development
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Project Structure

```
src/
├── task.ts          # Core Task class and interfaces
├── flow.ts          # Flow orchestration
├── parallel.ts      # ParallelTask implementation
└── index.ts         # Main exports

test/
├── task.test.ts     # Task tests
├── flow.test.ts     # Flow tests
└── parallel.test.ts # ParallelTask tests

dist/                # Compiled JavaScript output
```

### Testing

TinyTask uses Node.js built-in test runner with TypeScript support:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
```

## Examples

See the `examples/` directory for more detailed examples including:

- **Logging Example** (`examples/logging-example.js` / `examples/logging-example.ts`) - Demonstrates structured logging with Pino
- Basic task chaining
- Conditional routing
- Parallel processing
- Error handling
- Integration with external services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC 