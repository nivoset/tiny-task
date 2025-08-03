// Example demonstrating the default export of Tiny
import Tiny from '../dist/index.js';

// Set log level for this example
process.env.LOG_LEVEL = 'info';

// Create a simple task using Tiny.Task
class GreetingTask extends Tiny.Task {
  async prepare(shared) {
    return { name: shared.name || 'World' };
  }
  
  async exec(prepared) {
    return `Hello, ${prepared.name}!`;
  }
}

// Create a flow using Tiny.Flow and Tiny.chainTasks
const greetingTask = new GreetingTask('greeting');
const flow = Tiny.chainTasks(greetingTask);

// Execute the flow
async function runExample() {
  console.log('Running TinyTask example with default import...\n');
  
  const result = await flow.execute({ name: 'Alice' });
  
  console.log('Flow result:', result);
  console.log('Shared data keys:', Object.keys(result));
}

runExample().catch(console.error); 