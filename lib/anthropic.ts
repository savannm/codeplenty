//SDK initialization
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    // Optional: default timeout (ms)
    timeout: 30000,
    // Optional: max retries
    maxRetries: 3,
});

export default client;