import { createPublicClient, createWalletClient, http, type Address, fallback, webSocket } from 'viem';
import { baseSepolia } from 'viem/chains';

// Create a fallback transport with both HTTP and WebSocket
const transport = fallback([
  webSocket('wss://sepolia.base.org'),
  http('https://sepolia.base.org', {
    batch: {
      batchSize: 1024,
      wait: 16,
    },
    retryCount: 3,
    retryDelay: 1000,
  })
]);

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport,
});

export const walletClient = createWalletClient({
  chain: baseSepolia,
  transport,
});

// Create a wallet client for Base Sepolia with proper error handling
export const account = createWalletClient({
  chain: baseSepolia,
  transport,
  account: process.env.WALLET_ADDRESS as Address
}); 