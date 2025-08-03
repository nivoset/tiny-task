import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Flow, chainTasks, createFlow, createParallelFlow } from '../dist/flow.js';
import { Task } from '../dist/task.js';

// Set log level to error for tests to reduce noise
process.env.LOG_LEVEL = 'error';

// Test task implementations
class ValidationTask extends Task {
  constructor() {
    super('validation');
  }

  async exec(data) {
    return data.value > 0;
  }

  async post(shared, prepared, result) {
    if (!shared.steps) shared.steps = [];
    shared.steps.push('validation');
    return result ? 'default' : 'error';
  }
}

class ProcessingTask extends Task {
  constructor() {
    super('processing');
  }

  async exec(data) {
    return `Processed: ${data.value}`;
  }

  async post(shared, prepared, result) {
    if (!shared.steps) shared.steps = [];
    shared.steps.push('processing');
    shared.result = result;
    return 'default';
  }
}

class ErrorTask extends Task {
  constructor() {
    super('error');
  }

  async exec(data) {
    if (!data.steps) data.steps = [];
    data.steps.push('error');
  }
}

class SuccessTask extends Task {
  constructor() {
    super('success');
  }

  async exec(data) {
    if (!data.steps) data.steps = [];
    data.steps.push('success');
    data.processed = true;
  }
}

describe('Flow', () => {
  test('should create a flow with start task', () => {
    const startTask = new ValidationTask();
    const flow = new Flow(startTask);
    
    assert.strictEqual(flow.getStartTask(), startTask);
    assert.strictEqual(flow.getCurrentTask(), startTask);
  });

  test('should execute a simple flow', async () => {
    const validationTask = new ValidationTask();
    const processingTask = new ProcessingTask();
    const successTask = new SuccessTask();
    
    validationTask.connect(processingTask, 'default');
    processingTask.connect(successTask, 'default');
    
    const flow = new Flow(validationTask);
    const data = { value: 42 };
    
    const result = await flow.execute(data);
    
    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.result, 'Processed: 42');
    assert.deepStrictEqual(result.steps, ['validation', 'processing', 'success']);
  });

  test('should handle conditional routing', async () => {
    const validationTask = new ValidationTask();
    const successTask = new SuccessTask();
    const errorTask = new ErrorTask();
    
    validationTask.connect(successTask, 'default');
    validationTask.connect(errorTask, 'error');
    
    const flow = new Flow(validationTask);
    
    // Test success path
    const successData = { value: 10 };
    const successResult = await flow.execute(successData);
    assert.deepStrictEqual(successResult.steps, ['validation', 'success']);
    
    // Test error path
    flow.reset();
    const errorData = { value: -5 };
    const errorResult = await flow.execute(errorData);
    // The error task should be executed when validation returns 'error'
    assert.deepStrictEqual(errorResult.steps, ['validation', 'error']);
  });

  test('should handle flow with no successors', async () => {
    const task = new ValidationTask();
    const flow = new Flow(task);
    const data = { value: 42 };
    
    const result = await flow.execute(data);
    assert.strictEqual(result.value, 42);
    assert.deepStrictEqual(result.steps, ['validation']);
  });

  test('should reset flow to start', () => {
    const startTask = new ValidationTask();
    const flow = new Flow(startTask);
    
    // Change current task
    const newTask = new ProcessingTask();
    flow.setCurrentTask(newTask);
    assert.strictEqual(flow.getCurrentTask(), newTask);
    
    // Reset
    flow.reset();
    assert.strictEqual(flow.getCurrentTask(), startTask);
  });
});

describe('Flow Utilities', () => {
  test('should chain tasks together', () => {
    const task1 = new ValidationTask();
    const task2 = new ProcessingTask();
    const task3 = new SuccessTask();
    
    const flow = chainTasks(task1, task2, task3);
    
    assert.strictEqual(flow.getStartTask(), task1);
    assert.strictEqual(task1.successors.default, task2);
    assert.strictEqual(task2.successors.default, task3);
  });

  test('should create flow from single task', () => {
    const task = new ValidationTask();
    const flow = createFlow(task);
    
    assert.strictEqual(flow.getStartTask(), task);
  });

  test('should create parallel flows', () => {
    const task1 = new ValidationTask();
    const task2 = new ProcessingTask();
    
    const flows = createParallelFlow(task1, task2);
    
    assert.strictEqual(flows.length, 2);
    assert.strictEqual(flows[0].getStartTask(), task1);
    assert.strictEqual(flows[1].getStartTask(), task2);
  });
}); 