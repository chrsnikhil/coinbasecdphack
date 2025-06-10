import { ChatOpenAI } from '@langchain/openai';

// Agent configuration types
export interface AgentConfig {
  // AI Configuration
  apiKey: string;
  modelName: string;
  useFallback: boolean;
}

// Helper function to validate API keys
function validateApiKey(key: string | undefined, name: string): string {
  if (!key) {
    console.warn(`${name} is not configured. Using fallback model.`);
    return '';
  }
  return key;
}

// Default configuration
export const defaultConfig: AgentConfig = {
  // AI Configuration
  apiKey: validateApiKey(process.env.NEXT_PUBLIC_AKASH_API_KEY, 'AkashChat API key'),
  modelName: process.env.NEXT_PUBLIC_AKASH_API_KEY 
    ? 'Meta-Llama-3-1-8B-Instruct-FP8' 
    : 'gpt-3.5-turbo',
  useFallback: !process.env.NEXT_PUBLIC_AKASH_API_KEY,
};

// Initialize the AI model
export const initializeModel = (config: AgentConfig) => {
  try {
    console.log('Initializing AI model with configuration:', {
      modelName: config.modelName,
      useFallback: config.useFallback,
      baseURL: config.useFallback ? undefined : 'https://chatapi.akash.network/api/v1'
    });

    const model = new ChatOpenAI({
      openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
      modelName: config.modelName,
      temperature: 0.7,
      configuration: config.useFallback ? undefined : {
        baseURL: 'https://chatapi.akash.network/api/v1',
      },
    });

    console.log('AI model initialized successfully');
    return model;
  } catch (error) {
    console.error('Failed to initialize AI model:', error);
    throw new Error(`Failed to initialize AI model: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 