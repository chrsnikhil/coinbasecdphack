'use client';

import type { ReactNode } from 'react';
import { createConfig, http, WagmiConfig, cookieToInitialState } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { coinbaseWallet } from 'wagmi/connectors';
import { metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { config } from '@/config/wagmiConfig';

export function Providers({ children, initialState }: { children: ReactNode; initialState: any }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));
  
  return (
    <WagmiConfig config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
          rpcUrl="https://sepolia.base.org"
          config={{
            appearance: {
              name: 'CDP Fix',
              logo: 'https://example.com/logo.png',
              mode: 'auto',
              theme: 'default',
            },
            wallet: {
              display: 'modal',
              termsUrl: 'https://example.com/terms',
              privacyUrl: 'https://example.com/privacy',
              supportedWallets: {
                rabby: true,
                trust: true,
                frame: true,
              },
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}