'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { formatEther } from 'viem';
import React, { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from 'react-hot-toast';
import { publicClient, walletClient } from "@/utils/viem";

interface Task {
  id: number;
  creator: string;
  title: string;
  description: string;
  bounty: bigint;
  worker: string;
  isCompleted: boolean;
  isActive: boolean;
  requiredFileTypes: string[];
  submittedFileCID: string;
}

interface TaskListProps {
  tasks: Task[];
  refetchTasks: () => void;
}

export default function TaskList({ tasks, refetchTasks }: TaskListProps) {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [applyingTaskId, setApplyingTaskId] = useState<number | null>(null);

  const { writeContract } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      refetchTasks();
      setPendingTxHash(undefined);
      setSelectedFile(null);
      setApplyingTaskId(null);
      if (currentToastId) toast.dismiss(currentToastId);
      toast.success('Transaction confirmed successfully!', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  }, [isTransactionSuccess, refetchTasks]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleApply = async (taskId: number) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    try {
      setError(null);
      setApplyingTaskId(taskId);
      const toastId = toast.loading('Applying for task...');
      setCurrentToastId(toastId);

      // First check if task is still available
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      if (!task.isActive) {
        throw new Error('Task is not active');
      }
      if (task.worker !== '0x0000000000000000000000000000000000000000') {
        throw new Error('Task already has a worker');
      }
      if (task.creator === address) {
        throw new Error('You cannot accept your own task');
      }

      // Use the writeContract function from the hook
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'acceptTask',
        args: [BigInt(taskId)],
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: toastId });
        },
        onError: (err) => {
          console.error('Error applying for task:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to apply for task';
          setError(errorMessage);
          toast.error(errorMessage, { id: toastId, duration: 3000 });
          setApplyingTaskId(null);
          setPendingTxHash(undefined);
        }
      });
    } catch (err) {
      console.error('Error applying for task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply for task';
      setError(errorMessage);
      toast.error(errorMessage, { id: currentToastId, duration: 3000 });
      setApplyingTaskId(null);
      setPendingTxHash(undefined);
    }
  };

  const handleSubmitCompletion = async (taskId: number) => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const toastId = toast.loading('Submitting task...');
      setCurrentToastId(toastId);

      // 1. Upload to IPFS
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/pinata/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const { ipfsHash } = await uploadResponse.json();
      if (!ipfsHash) {
        throw new Error('No IPFS hash received');
      }

      toast.loading('Getting AI review...', { id: toastId });

      // 2. Get AI review
      const reviewResponse = await fetch('/api/tasks/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          ipfsHash,
          account: address,
        }),
      });

      if (!reviewResponse.ok) {
        throw new Error('Failed to get review');
      }

      const reviewData = await reviewResponse.json();
      if (!reviewData.approved) {
        toast.error(`Review not approved: ${reviewData.feedback}`, { id: toastId });
        setError(`Review not approved: ${reviewData.feedback}`);
        return;
      }

      toast.loading('Submitting to blockchain...', { id: toastId });

      // 3. Submit to contract
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'submitTaskCompletion',
        args: [BigInt(taskId), ipfsHash],
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: toastId });
        },
        onError: (err) => {
          console.error('Error submitting task completion:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to submit task completion';
          setError(errorMessage);
          toast.error(errorMessage, { id: toastId, duration: 3000 });
          setSubmittingTaskId(null);
          setPendingTxHash(undefined);
        }
      });

      // Refresh task list
      await refetchTasks();
      setSelectedFile(null);
      setError(null);
      toast.success('Task submitted successfully!', { id: toastId });
    } catch (err) {
      console.error('Error submitting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit task');
      toast.error(err instanceof Error ? err.message : 'Failed to submit task', { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const renderTaskActions = (task: Task) => {
    if (!isConnected) {
      return (
        <Button
          onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
          className="w-full bg-white text-black hover:bg-zinc-200"
        >
          Connect Wallet
        </Button>
      );
    }

    if (task.isCompleted) {
      return (
        <Button disabled className="w-full bg-green-500/20 text-green-400 border border-green-500/20">
          Completed
        </Button>
      );
    }

    if (!task.isActive) {
      return (
        <Button disabled className="w-full bg-zinc-800 text-zinc-400">
          Task Inactive
        </Button>
      );
    }

    if (task.worker === address) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <Button
            onClick={() => handleSubmitCompletion(task.id)}
            disabled={!selectedFile || loading}
            className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Completion'}
          </Button>
        </div>
      );
    }

    if (task.worker === '0x0000000000000000000000000000000000000000') {
      return (
        <Button
          onClick={() => handleApply(task.id)}
          disabled={applyingTaskId === task.id || task.creator === address}
          className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applyingTaskId === task.id ? 'Applying...' : 'Apply for Task'}
        </Button>
      );
    }

    return (
      <Button disabled className="w-full bg-zinc-800 text-zinc-400">
        Task Assigned
      </Button>
    );
  };

  return (
    <div className="w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {tasks.map((task) => (
            <CarouselItem key={task.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <div className="bg-black/90 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:border-white/20 transition-all duration-300 h-full flex flex-col shadow-lg">
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold line-clamp-1 text-white">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.isCompleted 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                          : !task.isActive
                            ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                            : task.worker && task.worker !== '0x0000000000000000000000000000000000000000'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {task.isCompleted ? 'Completed' : !task.isActive ? 'Inactive' : task.worker && task.worker !== '0x0000000000000000000000000000000000000000' ? 'In Progress' : 'Open'}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-4 line-clamp-2">{task.description}</p>
                  <div className="flex flex-col gap-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.bounty} ETH
                    </span>
                    {task.worker && task.worker !== '0x0000000000000000000000000000000000000000' && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Worker: {task.worker.slice(0, 6)}...{task.worker.slice(-4)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {renderTaskActions(task)}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <Toaster position="bottom-right" />
    </div>
  );
} 