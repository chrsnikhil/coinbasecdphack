import '@coinbase/onchainkit/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WagmiConfig, cookieToInitialState } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/config/wagmiConfig';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'wagmi/chains';
import { Providers } from './providers';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Freelance Platform',
  description: 'A decentralized freelancing platform on Base',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookie = headersList.get('cookie');
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers initialState={initialState}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
