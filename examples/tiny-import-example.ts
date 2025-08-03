// Example demonstrating the default export of Tiny with TypeScript
import Tiny from '../src/index.js';

// Set log level for this example
process.env.LOG_LEVEL = 'info';

// Define the shared data type
interface SharedData extends Record<string, unknown> {
  name: string;
  greeting?: string;
}

// Create a simple task using Tiny.Task
class GreetingTask extends Tiny.Task<SharedData, { name: string }, string> {
  async prepare(shared: SharedData) {
    return { name: shared.name || 'World' };
  }
  
  async exec(prepared: { name: string }): Promise<string> {
    return `Hello, ${prepared.name}!`;
  }
}

// Create a flow using Tiny.Flow and Tiny.chainTasks
const greetingTask = new GreetingTask('greeting');
const flow = Tiny.chainTasks(greetingTask);

// Execute the flow
async function runExample() {
  console.log('Running TinyTask example with default import (TypeScript)...\n');
  
  const result = await flow.execute({ name: 'Alice' });
  
  console.log('Flow result:', result);
  console.log('Shared data keys:', Object.keys(result));
  console.log('Greeting result:', result.greeting);
}

runExample().catch(console.error); 