'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, FREELANCE_PLATFORM_ADDRESS } from '@/config/contractConfig';

export function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('0.001'); // Default bounty

  const { data: hash, writeContract, isPending } = useWriteContract();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    writeContract({
      address: FREELANCE_PLATFORM_ADDRESS,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'createTask',
      args: [title, description],
      value: parseEther(bounty),
    });
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({
      hash,
    });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Post a Task</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="bounty" className="block text-sm font-medium text-gray-700">Bounty (ETH)</label>
          <input
            type="number"
            id="bounty"
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            min="0.001"
            step="0.001"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Waiting for transaction...' : 'Post Task'}
        </button>
        {hash && <p className="text-sm text-gray-500 mt-2">Transaction Hash: {hash}</p>}
        {isConfirmed && <p className="text-sm text-green-600 mt-2">Task posted successfully!</p>}
      </form>
    </div>
  );
} 