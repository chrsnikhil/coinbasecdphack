'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { parseEther } from 'viem';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import toast, { Toaster } from 'react-hot-toast';

interface CreateTaskProps {
  onTaskCreated: () => void; // Callback to refresh task list
}

export default function CreateTask({ onTaskCreated }: CreateTaskProps) {
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('');
  const [requiredFileTypes, setRequiredFileTypes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined); // To keep track of the active toast

  const { writeContract } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      setTitle('');
      setDescription('');
      setBounty('');
      setRequiredFileTypes('');
      setPendingTxHash(undefined);
      setIsSubmitting(false);
      if (currentToastId) toast.dismiss(currentToastId); // Dismiss any pending toast
      toast.success('Task created successfully!', { duration: 3000 });
      setCurrentToastId(undefined);
      onTaskCreated(); // Trigger refresh in parent
    }
  }, [isTransactionSuccess, onTaskCreated, currentToastId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet to create a task.', { duration: 3000 });
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const bountyInWei = parseEther(bounty);
      const fileTypesArray = requiredFileTypes.split(',').map(type => type.trim()).filter(type => type.length > 0);
      
      const toastId = toast.loading('Creating task...');
      setCurrentToastId(toastId);

      writeContract({
        ...contractConfig,
        functionName: 'createTask',
        args: [title, description, bountyInWei, fileTypesArray],
        value: bountyInWei,
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: toastId }); // Removed duration here
        },
        onError: (err) => {
          setError(err.message);
          setIsSubmitting(false);
          toast.error(`Failed to create task: ${err.message}`, { id: toastId, duration: 3000 });
          setCurrentToastId(undefined);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setIsSubmitting(false);
      toast.error('Failed to create task', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <Toaster position="top-left" toastOptions={{
        style: {
          background: '#000',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
          duration: 3000,
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
          duration: 3000,
        },
        loading: {
          // No explicit duration here, will be dismissed by success/error or manually
        },
      }} />
      <h2 className="text-3xl font-bold mb-8 tracking-tight">
        Create New Task
      </h2>
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
        </div>
      )}
      <div className="bg-black/90 backdrop-blur-sm rounded-lg p-6 border border-white/10 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
              Task Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
              Task Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe the task in detail"
              required
              className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bounty" className="block text-sm font-medium text-zinc-300">
              Bounty (ETH)
            </label>
            <input
              id="bounty"
              type="text"
              value={bounty}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (/^\d*\.?\d*$/.test(value)) {
                  setBounty(value);
                }
              }}
              placeholder="Enter bounty amount in ETH"
              required
              className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="requiredFileTypes" className="block text-sm font-medium text-zinc-300">
              Required File Types (comma-separated, e.g., pdf, docx, jpg)
            </label>
            <input
              id="requiredFileTypes"
              type="text"
              value={requiredFileTypes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequiredFileTypes(e.target.value)}
              placeholder="e.g., pdf, docx, jpg"
              className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
            />
          </div>
          {!isConnected ? (
            <Button
              type="button"
              onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              Connect Wallet to Create Task
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting || isTransactionPending}
              className={`w-full ${
                isSubmitting || isTransactionPending
                  ? 'bg-white/10 text-zinc-400'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {isSubmitting || isTransactionPending ? 'Creating Task...' : 'Create Task'}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
} 