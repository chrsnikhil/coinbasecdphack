'use client';

import { useState } from 'react';
import { Transaction, TransactionButton, TransactionStatus } from '@coinbase/onchainkit/transaction';
import { contractConfig } from '@/config/contractConfig';
import { parseEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

export function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('0.00000001');

  const queryClient = useQueryClient();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New Task</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bounty (ETH)</label>
          <input
            type="number"
            value={bounty}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBounty(e.target.value)}
            step="0.00000001"
            min="0.00000001"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <Transaction
          calls={[
            {
              address: contractConfig.address,
              abi: contractConfig.abi,
              functionName: 'createTask',
              args: [title, description],
              value: parseEther(bounty),
            },
          ]}
          onStatus={(status) => {
            if (status.statusName === 'success') {
              setTitle('');
              setDescription('');
              setBounty('0.00000001');
              queryClient.invalidateQueries({ queryKey: ['taskCount'] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
          }}
        >
          <TransactionButton
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            disabled={!title || !description}
          >
            Create Task
          </TransactionButton>
          <TransactionStatus />
        </Transaction>
      </div>
    </div>
  );
} 