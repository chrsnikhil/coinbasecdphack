'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { formatEther } from 'viem';
import React, { useEffect, useState } from 'react';

interface Task {
  creator: string;
  title: string;
  description: string;
  bounty: bigint;
  worker: string;
  isCompleted: boolean;
  isActive: boolean;
}

export function TaskList() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptingTaskId, setAcceptingTaskId] = useState<number | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  const { data: taskCountBigInt, refetch: refetchTaskCount, isError: isTaskCountError } = useReadContract({
    address: contractConfig.address,
    abi: FREELANCE_PLATFORM_ABI,
    functionName: 'taskCount',
  });

  const taskCount = Number(taskCountBigInt || 0);

  const contractCalls = Array.from({ length: taskCount }, (_, i) => ({
    address: contractConfig.address,
    abi: FREELANCE_PLATFORM_ABI,
    functionName: 'getTask',
    args: [BigInt(i)],
  }));

  const { 
    data: fetchedTasks, 
    refetch: refetchTasks,
    isError: isTasksError,
    isLoading: isLoadingTasks 
  } = useReadContracts({
    contracts: contractCalls,
    query: {
      enabled: taskCount > 0,
      select: (data) => {
        if (!data) return [];
        
        return data
          .filter((item) => item.status === 'success' && item.result)
          .map((item) => {
            const [creator, title, description, bounty, worker, isCompleted, isActive] = item.result as [string, string, string, bigint, string, boolean, boolean];
            return {
              creator,
              title,
              description,
              bounty,
              worker,
              isCompleted,
              isActive,
            } as Task;
          });
      },
    },
  });

  const tasks: Task[] = fetchedTasks || [];

  const { data: acceptHash, writeContract: acceptTaskContract } = useWriteContract();
  const { isLoading: isAccepting, isSuccess: isAccepted } = useWaitForTransactionReceipt({
    hash: acceptHash,
  });

  const { data: completeHash, writeContract: completeTaskContract, isError: isCompleteError } = useWriteContract();
  const { isLoading: isCompleting, isSuccess: isCompletedTx, isError: isCompleteTxError } = useWaitForTransactionReceipt({
    hash: completeHash,
  });

  useEffect(() => {
    if (isAccepted) {
      refetchTaskCount();
      refetchTasks();
      setAcceptingTaskId(null);
      setSuccess('Task accepted successfully!');
      setTimeout(() => setSuccess(null), 5000);
    }
  }, [isAccepted, refetchTaskCount, refetchTasks]);

  useEffect(() => {
    if (isCompletedTx) {
      refetchTaskCount();
      refetchTasks();
      setCompletingTaskId(null);
      const task = tasks[completingTaskId!];
      if (task) {
        setSuccess(`Task completed! ${formatEther(task.bounty)} ETH has been transferred to your wallet.`);
      }
      setTimeout(() => setSuccess(null), 5000);
    }
  }, [isCompletedTx, refetchTaskCount, refetchTasks, completingTaskId, tasks]);

  useEffect(() => {
    if (isCompleteError) {
      setError('Failed to send transaction. Please try again.');
      setCompletingTaskId(null);
    }
  }, [isCompleteError]);

  useEffect(() => {
    if (isCompleteTxError) {
      setError('Transaction failed. Please try again.');
      setCompletingTaskId(null);
    }
  }, [isCompleteTxError]);

  const handleAcceptTask = (taskId: number) => {
    console.log('Accepting task:', taskId);
    console.log('Current address:', address);
    setAcceptingTaskId(taskId);
    setError(null);
    acceptTaskContract({
      address: contractConfig.address,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'acceptTask',
      args: [BigInt(taskId)],
    });
  };

  const handleCompleteTask = (taskId: number) => {
    console.log('Starting task completion:', {
      taskId,
      currentAddress: address,
      taskDetails: tasks[taskId],
      isCompleting,
      completingTaskId
    });

    setCompletingTaskId(taskId);
    setError(null);
    
    try {
      completeTaskContract({
        address: contractConfig.address,
        abi: FREELANCE_PLATFORM_ABI,
        functionName: 'completeTask',
        args: [BigInt(taskId)],
      });

      // Add timeout to reset state if transaction gets stuck
      setTimeout(() => {
        if (completingTaskId === taskId) {
          console.log('Transaction timeout - resetting state');
          setCompletingTaskId(null);
          setError('Transaction timed out. Please try again.');
        }
      }, 60000); // 60 seconds timeout
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to complete task. Please try again.');
      setCompletingTaskId(null);
    }
  };

  if (isTaskCountError || isTasksError) {
    return <div className="text-red-500">Error loading tasks. Please try again.</div>;
  }

  if (isLoadingTasks) {
    return <div className="text-gray-600">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Your Wallet Address</h3>
        <p className="text-sm text-gray-500 break-all">{address || 'Not connected'}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">Available Tasks</h2>
      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks available.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
              <p className="text-gray-600 mt-2">{task.description}</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Bounty:</p>
                  <p className="text-sm font-semibold text-[#0052FF]">{formatEther(task.bounty)} ETH</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Creator:</p>
                  <p className="text-sm text-gray-500 break-all">{task.creator}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Worker:</p>
                  <p className="text-sm text-gray-500 break-all">
                    {task.worker === '0x0000000000000000000000000000000000000000' ? 'Not assigned' : task.worker}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Status:</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    task.isCompleted 
                      ? 'bg-green-100 text-green-800' 
                      : task.isActive 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.isCompleted ? 'Completed' : task.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {task.isActive && !task.isCompleted && task.worker === '0x0000000000000000000000000000000000000000' && (
                  <button
                    onClick={() => handleAcceptTask(index)}
                    disabled={isAccepting && acceptingTaskId === index}
                    className={`w-full mt-4 px-6 py-3 rounded-lg font-medium shadow-lg transition-all flex items-center justify-center space-x-2 ${
                      isAccepting && acceptingTaskId === index
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-[#0052FF] text-white hover:bg-[#0043CC]'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isAccepting && acceptingTaskId === index ? 'Accepting Task...' : 'Accept Task'}</span>
                  </button>
                )}
                {task.isActive && !task.isCompleted && task.worker === address && (
                  <button
                    onClick={() => handleCompleteTask(index)}
                    disabled={isCompleting && completingTaskId === index}
                    className={`w-full mt-4 px-6 py-3 rounded-lg font-medium shadow-lg transition-all flex items-center justify-center space-x-2 ${
                      isCompleting && completingTaskId === index
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    <svg 
                      className={`w-5 h-5 ${
                        isCompleting && completingTaskId === index ? '!text-gray-800' : 'text-white'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`${
                      isCompleting && completingTaskId === index ? '!text-gray-800' : 'text-white'
                    }`}>
                      {isCompleting && completingTaskId === index ? 'Completing Task...' : 'Complete Task & Claim Bounty'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 