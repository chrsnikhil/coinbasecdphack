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
  const { data: taskCountBigInt, refetch: refetchTaskCount, isError: isTaskCountError } = useReadContract({
    address: contractConfig.address,
    abi: FREELANCE_PLATFORM_ABI,
    functionName: 'taskCount',
  });

  const taskCount = Number(taskCountBigInt || 0);

  // Prepare calls for useReadContracts using getTask
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

  const { data: completeHash, writeContract: completeTaskContract } = useWriteContract();
  const { isLoading: isCompleting, isSuccess: isCompletedTx } = useWaitForTransactionReceipt({
    hash: completeHash,
  });

  // Refetch tasks when a transaction is successful
  useEffect(() => {
    if (isAccepted || isCompletedTx) {
      refetchTaskCount();
      refetchTasks();
    }
  }, [isAccepted, isCompletedTx, refetchTaskCount, refetchTasks]);

  const handleAcceptTask = (taskId: number) => {
    acceptTaskContract({
      address: contractConfig.address,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'acceptTask',
      args: [BigInt(taskId)],
    });
  };

  const handleCompleteTask = (taskId: number) => {
    completeTaskContract({
      address: contractConfig.address,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'completeTask',
      args: [BigInt(taskId)],
    });
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

      <h2 className="text-2xl font-bold mb-4">Available Tasks</h2>
      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks available.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
              <p className="text-gray-600 mt-2">{task.description}</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Bounty:</span> {formatEther(task.bounty)} ETH
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Creator:</span> {task.creator}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Worker:</span> {task.worker === '0x0000000000000000000000000000000000000000' ? 'N/A' : task.worker}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Status:</span>{' '}
                  {task.isCompleted ? 'Completed' : task.isActive ? 'Active' : 'Inactive'}
                </p>
                {task.isActive && !task.isCompleted && task.worker === '0x0000000000000000000000000000000000000000' && (
                  <button
                    onClick={() => handleAcceptTask(index)}
                    disabled={isAccepting}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    {isAccepting ? 'Accepting...' : 'Accept Task'}
                  </button>
                )}
                {task.isActive && !task.isCompleted && task.worker === address && (
                  <button
                    onClick={() => handleCompleteTask(index)}
                    disabled={isCompleting}
                    className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    {isCompleting ? 'Completing...' : 'Complete Task'}
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