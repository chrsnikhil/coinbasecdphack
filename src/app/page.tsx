"use client";
import { useAccount, useReadContracts } from 'wagmi';
import { useEffect, useState, useMemo } from 'react';
import { publicClient } from '@/utils/viem';
import { contractConfig } from '@/config/contractConfig';
import TaskList from '@/components/TaskList';
import CreateTask from '@/components/CreateTask';
import AnimatedBackground from '@/components/AnimatedBackground';
import GlassCursor from '@/components/GlassCursor';
import { WalletConnect } from '@/components/WalletConnect';

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

export default function Home() {
  const { isConnected } = useAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCount, setTaskCount] = useState<number | undefined>(undefined);

  // Fetch task count separately
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await publicClient.readContract({
          ...contractConfig,
          functionName: 'taskCount',
        });
        setTaskCount(Number(count));
      } catch (error) {
        console.error('Error fetching task count:', error);
        setTaskCount(0); // Assume 0 if count fetch fails
      }
    };
    fetchCount();
  }, []);

  // Prepare contracts for useReadContracts hook
  const contracts = useMemo(() => {
    if (taskCount === undefined) return [];
    return Array.from({ length: taskCount }, (_, i) => ({
      ...contractConfig,
      functionName: 'getTask',
      args: [BigInt(i)],
    }));
  }, [taskCount]);

  const { data: fetchedTasksData, isLoading: isFetchingTasks, isError: isFetchingError, refetch: refetchTasksHook } = useReadContracts({
    contracts,
    query: {
      enabled: taskCount !== undefined, // Only enable if taskCount is known
      select: (data) => {
        const formatted = data.map((taskResult, index) => {
          if (taskResult.status === 'success' && taskResult.result) {
            const [
              creator,
              title,
              description,
              bounty,
              worker,
              isCompleted,
              isActive,
              requiredFileTypes,
              submittedFileCID,
            ] = taskResult.result as [
              string,
              string,
              string,
              bigint,
              string,
              boolean,
              boolean,
              string[],
              string,
            ];

            const task: Task = {
              id: index,
              creator,
              title,
              description,
              bounty,
              worker,
              isCompleted,
              isActive,
              requiredFileTypes,
              submittedFileCID,
            };
            return task;
          }
          console.warn(`Failed to fetch task at index ${index}:`, taskResult.error);
          return null;
        }).filter(Boolean) as Task[];
        return formatted;
      },
    },
    onError: (err) => {
      console.error('Error fetching tasks with useReadContracts:', err);
    }
  });

  // Sync state with fetched data
  useEffect(() => {
    setLoading(isFetchingTasks);
    if (fetchedTasksData) {
      setTasks(fetchedTasksData);
    } else if (isFetchingError) {
      setTasks([]); // Clear tasks on error
    }
  }, [fetchedTasksData, isFetchingTasks, isFetchingError]);

  const handleTaskCreated = () => {
    setLoading(true);
    refetchTasksHook(); // Use the refetch from useReadContracts
  };

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <GlassCursor />
      
      {/* Header with Wallet Connect */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-end">
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {isConnected && (
            <div className="mb-8">
              <CreateTask onTaskCreated={handleTaskCreated} />
            </div>
          )}
          
          {loading ? (
            <div className="text-center text-white/60">Loading tasks...</div>
          ) : (
            <TaskList tasks={tasks} refetchTasks={handleTaskCreated} />
          )}
        </div>
      </div>
    </main>
  );
}