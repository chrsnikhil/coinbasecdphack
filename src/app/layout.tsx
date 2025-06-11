import '@coinbase/onchainkit/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WagmiConfig, cookieToInitialState } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmiConfig';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'wagmi/chains';
import { Providers } from './providers';
import { headers } from 'next/headers';
import { Toaster } from 'react-hot-toast';
import GlassCursor from '@/components/GlassCursor';

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});

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
  const initialState = cookieToInitialState(config, cookie);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white`}>
        <Providers initialState={initialState}>
          {children}
          <Toaster position="top-left" />
        </Providers>
        <GlassCursor />
      </body>
    </html>
  );
}
