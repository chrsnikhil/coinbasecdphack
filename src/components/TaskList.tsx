'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
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
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Available Tasks</h2>
      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks available at the moment.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="border p-4 rounded-md">
              <h3 className="text-xl font-semibold">{task.title}</h3>
              <p className="text-gray-700">{task.description}</p>
              <p className="text-sm text-gray-500">
                Bounty: {formatEther(task.bounty)} ETH
              </p>
              <p className="text-sm text-gray-500">Creator: {task.creator}</p>
              <p className="text-sm text-gray-500">
                Worker: {task.worker === '0x0000000000000000000000000000000000000000' ? 'N/A' : task.worker}
              </p>
              <p className="text-sm text-gray-500">
                Status: {task.isCompleted ? 'Completed' : task.isActive ? 'Active' : 'Inactive'}
              </p>
              {!task.isCompleted && task.isActive && task.worker === '0x0000000000000000000000000000000000000000' && (
                <button
                  onClick={() => handleAcceptTask(index)}
                  disabled={isAccepting}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {isAccepting ? 'Accepting...' : 'Accept Task'}
                </button>
              )}
              {!task.isCompleted && task.isActive && task.worker !== '0x0000000000000000000000000000000000000000' && (
                <button
                  onClick={() => handleCompleteTask(index)}
                  disabled={isCompleting}
                  className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
                >
                  {isCompleting ? 'Completing...' : 'Complete Task'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {(isAccepted || isCompletedTx) && (
        <p className="text-sm text-green-600 mt-2">Transaction successful!</p>
      )}
    </div>
  );
} 