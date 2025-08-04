import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ParallelTask, createParallelTask } from '../dist/parallel.js';

// Set log level to error for tests to reduce noise
process.env.LOG_LEVEL = 'error';

// Test parallel task implementation
class TestParallelTask extends ParallelTask {
  constructor(maxConcurrency = 2) {
    super('testParallelTask', { maxConcurrency });
  }

  async prepare(shared) {
    return shared.items || [];
  }

  async execItem(item) {
    // Simulate some processing work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate occasional errors
    if (item.value < 0) {
      throw new Error(`Invalid value for item ${item.id}: ${item.value}`);
    }
    
    return { id: item.id, processed: true };
  }

  updateSharedData(shared, result) {
    shared.results = result.results.filter(r => r !== null);
    shared.processingStats = {
      totalProcessed: result.totalProcessed,
      totalErrors: result.totalErrors,
      processingTime: result.processingTime
    };
  }
}

describe('ParallelTask', () => {
  test('should create a parallel task with correct configuration', () => {
    const task = new TestParallelTask(3);
    assert.strictEqual(task.name, 'testParallelTask');
  });

  test('should process items in parallel with concurrency limit', async () => {
    const task = new TestParallelTask(2);
    const data = {
      items: [
        { id: '1', value: 10 },
        { id: '2', value: 20 },
        { id: '3', value: 30 },
        { id: '4', value: 40 }
      ]
    };
    
    const result = await task.run(data);
    assert.strictEqual(result, 'default');
    assert.strictEqual(data.results?.length, 4);
    assert.strictEqual(data.processingStats?.totalProcessed, 4);
    assert.strictEqual(data.processingStats?.totalErrors, 0);
    assert(data.processingStats?.processingTime > 0);
  });

  test('should handle errors gracefully', async () => {
    const task = new TestParallelTask(2);
    const data = {
      items: [
        { id: '1', value: 10 },
        { id: '2', value: -5 }, // This will cause an error
        { id: '3', value: 30 }
      ]
    };
    
    const result = await task.run(data);
    assert.strictEqual(result, 'default');
    assert.strictEqual(data.results?.length, 3); // All results (including failed ones)
    assert.strictEqual(data.processingStats?.totalProcessed, 3);
    assert.strictEqual(data.processingStats?.totalErrors, 1);
  });

  test('should handle empty input gracefully', async () => {
    const task = new TestParallelTask(2);
    const data = { items: [] };
    
    const result = await task.run(data);
    assert.strictEqual(result, 'default');
    // When there are no items, processingStats might not be set
    assert.strictEqual(data.processingStats?.totalProcessed || 0, 0);
  });

  test('should respect concurrency limits', async () => {
    const task = new TestParallelTask(1); // Max concurrency of 1
    const data = {
      items: [
        { id: '1', value: 10 },
        { id: '2', value: 20 },
        { id: '3', value: 30 }
      ]
    };
    
    const startTime = Date.now();
    await task.run(data);
    const endTime = Date.now();
    
    // With concurrency of 1, processing should take longer
    // Each item takes ~10ms, so 3 items should take at least 20ms
    assert(endTime - startTime >= 20);
  });
});

describe('createParallelTask', () => {
  test('should create a parallel task from functions', async () => {
    const parallelTask = createParallelTask(
      'testParallelTask',
      2,
      async (shared) => shared.items || [],
      async (item) => item.value > 0
    );
    
    const data = {
      items: [
        { id: '1', value: 10 },
        { id: '2', value: -5 },
        { id: '3', value: 30 }
      ]
    };
    
    const result = await parallelTask.run(data);
    assert.strictEqual(result, 'default');
    assert.strictEqual(data.testParallelTask.totalProcessed, 3);
    assert.strictEqual(data.testParallelTask.totalErrors, 0);
    assert.strictEqual(data.testParallelTask.results.filter(r => r === true).length, 2);
  });

  test('should handle function errors', async () => {
    const parallelTask = createParallelTask(
      'testParallelTask',
      2,
      async (shared) => shared.items || [],
      async (item) => {
        if (item.value < 0) {
          throw new Error(`Invalid value: ${item.value}`);
        }
        return item.value > 0;
      }
    );
    
    const data = {
      items: [
        { id: '1', value: 10 },
        { id: '2', value: -5 }, // This will cause an error
        { id: '3', value: 30 }
      ]
    };
    
    const result = await parallelTask.run(data);
    assert.strictEqual(result, 'default');
    assert.strictEqual(data.testParallelTask.totalProcessed, 3);
    assert.strictEqual(data.testParallelTask.totalErrors, 1);
  });
}); 