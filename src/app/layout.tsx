import '@coinbase/onchainkit/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Freelance Platform',
  description: 'A decentralized freelancing platform on Base',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookie = headersList.get("cookie");

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers cookie={cookie}>{children}</Providers>
      </body>
    </html>
  );
}
