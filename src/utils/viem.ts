import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

export const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Create a wallet client for Base Sepolia
export const account = createWalletClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
  account: process.env.WALLET_ADDRESS as Address
}); 