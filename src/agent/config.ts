import { ChatOpenAI } from '@langchain/openai';

// Agent configuration types
export interface AgentConfig {
  // AkashChat Configuration
  akashApiKey: string;
  modelName: string;
  // Coinbase Configuration
  cdpApiKeyId: string;
  cdpApiKeySecret: string;
  cdpWalletSecret: string;
  networkId: string;
}

// Validate API keys
function validateApiKey(apiKey: string | undefined, keyName: string): string {
  if (!apiKey) {
    console.warn(`Warning: ${keyName} is not configured. Some features may not work.`);
    return '';
  }
  console.log(`Debug: ${keyName} is configured.`);
  return apiKey;
}

// Default configuration
export const defaultConfig: AgentConfig = {
  // AkashChat Configuration
  akashApiKey: validateApiKey(process.env.NEXT_PUBLIC_AKASH_API_KEY, 'AkashChat API key'),
  modelName: 'Meta-Llama-3-3-70B-Instruct', // Using the most capable model
  
  // Coinbase Configuration
  cdpApiKeyId: validateApiKey(process.env.NEXT_PUBLIC_CDP_API_KEY_ID, 'CDP API Key ID'),
  cdpApiKeySecret: validateApiKey(process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET, 'CDP API Key Secret'),
  cdpWalletSecret: validateApiKey(process.env.NEXT_PUBLIC_CDP_WALLET_SECRET, 'CDP Wallet Secret'),
  networkId: process.env.NEXT_PUBLIC_NETWORK_ID || 'base-sepolia',
};

// Initialize the AI model
export const initializeModel = (config: AgentConfig) => {
  try {
    console.log('Initializing AI model with configuration:', {
      modelName: config.modelName,
      baseURL: 'https://chatapi.akash.network/api/v1'
    });

    const model = new ChatOpenAI({
      openAIApiKey: config.akashApiKey,
      modelName: config.modelName,
      temperature: 0.7,
      configuration: {
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