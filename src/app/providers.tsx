'use client';

import type { ReactNode } from 'react';
import { createConfig, http, WagmiConfig, cookieToInitialState } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Freelance Platform',
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: true,
});

export function Providers({ children, cookie }: { children: ReactNode; cookie?: string | null }) {
  const [queryClient] = useState(() => new QueryClient());
  const initialState = cookieToInitialState(config, cookie);

  return (
    <WagmiConfig config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
          rpcUrl={baseSepolia.rpcUrls.default.http[0]}
          children={children}
          config={{
            wallet: {
              display: 'modal',
            },
          }}
        />
      </QueryClientProvider>
    </WagmiConfig>
  );
}