'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { CreateTask } from '@/components/CreateTask';
import { TaskList } from '@/components/TaskList';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Freelance Platform</h1>
          <WalletConnect />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CreateTask />
          <TaskList />
        </div>
      </div>
    </main>
  );
}
