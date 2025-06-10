import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask } from 'wagmi/connectors';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Freelance Platform',
      chainId: baseSepolia.id,
    }),
    metaMask(),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org', {
      batch: {
        batchSize: 1024,
        wait: 16,
      },
    }),
  },
}); 