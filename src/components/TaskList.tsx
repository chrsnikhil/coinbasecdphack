'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, FREELANCE_PLATFORM_ADDRESS } from '@/config/contractConfig';
import { formatEther } from 'viem';
import React from 'react';

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
  const { data: taskCountBigInt } = useReadContract({
    address: FREELANCE_PLATFORM_ADDRESS,
    abi: FREELANCE_PLATFORM_ABI,
    functionName: 'taskCount',
  });

  const taskCount = Number(taskCountBigInt || 0);
  const tasks: Task[] = [];

  for (let i = 0; i < taskCount; i++) {
    // This is a simplified approach. In a real app, you'd use a more efficient way to fetch all tasks.
    // For example, a contract event listener or a backend service to index tasks.
    const { data: task } = useReadContract({
      address: FREELANCE_PLATFORM_ADDRESS,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'tasks',
      args: [BigInt(i)],
    });
    if (task) {
      tasks.push(task as Task);
    }
  }

  const { data: acceptHash, writeContract: acceptTaskContract } = useWriteContract();
  const { isLoading: isAccepting, isSuccess: isAccepted } = useWaitForTransactionReceipt({
    hash: acceptHash,
  });

  const { data: completeHash, writeContract: completeTaskContract } = useWriteContract();
  const { isLoading: isCompleting, isSuccess: isCompletedTx } = useWaitForTransactionReceipt({
    hash: completeHash,
  });

  const handleAcceptTask = (taskId: number) => {
    acceptTaskContract({
      address: FREELANCE_PLATFORM_ADDRESS,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'acceptTask',
      args: [BigInt(taskId)],
    });
  };

  const handleCompleteTask = (taskId: number) => {
    completeTaskContract({
      address: FREELANCE_PLATFORM_ADDRESS,
      abi: FREELANCE_PLATFORM_ABI,
      functionName: 'completeTask',
      args: [BigInt(taskId)],
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Available Tasks</h2>
      {
        tasks.length === 0 ? (
          <p className="text-gray-600">No tasks available at the moment.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div key={index} className="border p-4 rounded-md">
                <h3 className="text-xl font-semibold">{task.title}</h3>
                <p className="text-gray-700">{task.description}</p>
                <p className="text-sm text-gray-500">Bounty: {formatEther(task.bounty)} ETH</p>
                <p className="text-sm text-gray-500">Creator: {task.creator}</p>
                <p className="text-sm text-gray-500">Worker: {task.worker === '0x0000000000000000000000000000000000000000' ? 'N/A' : task.worker}</p>
                <p className="text-sm text-gray-500">Status: {task.isCompleted ? 'Completed' : task.isActive ? 'Active' : 'Inactive'}</p>
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
        )
      }
      {(isAccepted || isCompletedTx) && <p className="text-sm text-green-600 mt-2">Transaction successful!</p>}
    </div>
  );
} 