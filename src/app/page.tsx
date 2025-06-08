'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { CreateTask } from '@/components/CreateTask';
import { TaskList } from '@/components/TaskList';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Freelance Platform</h1>
          <WalletConnect />
        </div>

        {isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CreateTask />
            <TaskList />
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600">Please connect your wallet to start using the platform.</p>
          </div>
        )}
      </div>
    </main>
  );
}
