'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WagmiConfig, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { http } from 'viem';

const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http('https://chain-proxy.wallet.coinbase.com?targetName=base-sepolia'),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <OnchainKitProvider chain={baseSepolia}>
        {children}
      </OnchainKitProvider>
    </WagmiConfig>
  );
} 