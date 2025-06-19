import readline from 'readline';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient('https://good-monitor-677.convex.cloud');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your Venice.ai API key: ', async (apiKey) => {
  try {
    const result = await convex.action('providers:validateVeniceApiKey', { apiKey });
    console.log('Validation result:', result);
  } catch (error) {
    console.error('Error validating API key:', error);
  } finally {
    rl.close();
  }
}); 