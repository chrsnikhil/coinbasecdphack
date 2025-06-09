'use client';

import TaskList from '@/components/TaskList';
import CreateTask from '@/components/CreateTask';
import { useReadContract, useReadContracts, useConnect, useAccount } from 'wagmi';
import { contractConfig } from '@/config/contractConfig';
import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';

interface Task {
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

export default function Home() {
  const { isConnected } = useAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: taskCount } = useReadContract({
    ...contractConfig,
    functionName: 'taskCount',
  });

  const taskIds = Array.from({ length: Number(taskCount || 0) }, (_, i) => i);
  const taskContracts = taskIds.map((id) => ({
    ...contractConfig,
    functionName: 'getTask',
    args: [BigInt(id)],
  }));

  const { data: tasksData } = useReadContracts({
    contracts: taskContracts,
  });

  useEffect(() => {
    if (tasksData) {
      const formattedTasks = tasksData.map((task: any) => ({
        creator: task.result[0],
        title: task.result[1],
        description: task.result[2],
        bounty: task.result[3],
        worker: task.result[4],
        isCompleted: task.result[5],
        isActive: task.result[6],
        requiredFileTypes: task.result[7],
        submittedFileCID: task.result[8],
      }));
      setTasks(formattedTasks);
      setIsLoading(false);
    }
  }, [tasksData]);

  const refetchTasks = () => {
    setIsLoading(true);
    // The tasks will be automatically refetched when taskCount changes
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Freelance Platform</h1>
          <WalletConnect />
        </div>

        <section className="w-full max-w-7xl space-y-12 mb-12">
          <CreateTask onTaskCreated={refetchTasks} />
          <TaskList tasks={tasks} refetchTasks={refetchTasks} />
        </section>
      </div>
    </main>
  );
}
