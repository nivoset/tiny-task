import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Task } from '../dist/task.js';

// Set log level to error for tests to reduce noise
process.env.LOG_LEVEL = 'error';

// Simple test task
class SimpleTask extends Task {
  constructor() {
    super('simpleTask');
  }

  async exec(data) {
    return `Processed: ${data.value}`;
  }
}

describe('Basic Task', () => {
  test('should create and execute a simple task', async () => {
    const task = new SimpleTask();
    const data = { value: 42 };
    
    const result = await task.exec(data);
    assert.strictEqual(result, 'Processed: 42');
  });

  test('should have correct name', () => {
    const task = new SimpleTask();
    assert.strictEqual(task.name, 'simpleTask');
  });
}); 