'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { parseEther } from 'viem';
import { useState } from 'react';

export function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const bountyAmount = parseFloat(bounty);
      if (isNaN(bountyAmount) || bountyAmount <= 0) {
        setError('Bounty must be greater than 0');
        return;
      }

      writeContract({
        address: contractConfig.address,
        abi: FREELANCE_PLATFORM_ABI,
        functionName: 'createTask',
        args: [title, description],
        value: parseEther(bounty),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Task</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 outline-none transition-all"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 outline-none transition-all"
            rows={4}
            required
          />
        </div>
        <div>
          <label htmlFor="bounty" className="block text-sm font-medium text-gray-700 mb-1">
            Bounty (ETH)
          </label>
          <input
            type="number"
            id="bounty"
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 outline-none transition-all"
            step="0.0001"
            min="0.0001"
            required
          />
          <p className="mt-2 text-sm text-gray-500">Minimum bounty: 0.0001 ETH</p>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full bg-[#0052FF] text-white px-6 py-3 rounded-lg hover:bg-[#0043CC] disabled:bg-gray-300 disabled:cursor-not-allowed font-medium shadow-lg transition-all"
        >
          {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Create Task'}
        </button>
        {isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Task created successfully!</p>
          </div>
        )}
      </form>
    </div>
  );
} 