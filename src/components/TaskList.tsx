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
import GlassCard from '@/components/GlassCard';
import { ArrowRight } from 'lucide-react';

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
  const { writeContract } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      setLoading(false);
      setSelectedFile(null);
      setPendingTxHash(undefined);
      if (currentToastId) toast.dismiss(currentToastId);
      toast.success('Task submitted for review!', { duration: 3000 });
      setCurrentToastId(undefined);
      refetchTasks();
    }
  }, [isTransactionSuccess, refetchTasks, currentToastId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmitCompletion = async (taskId: number) => {
    if (!selectedFile) {
      toast.error('Please select a file to submit.', { duration: 3000 });
      return;
    }

    setLoading(true);
    setError(null);
    const toastId = toast.loading('Uploading file to IPFS...');
    setCurrentToastId(toastId);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const pinataResponse = await fetch('/api/pinata/upload', {
        method: 'POST',
        body: formData,
      });

      if (!pinataResponse.ok) {
        const errorData = await pinataResponse.json();
        throw new Error(errorData.message || 'Failed to upload file to IPFS');
      }

      const pinataData = await pinataResponse.json();
      const ipfsCid = pinataData.ipfsHash;
      toast.loading('File uploaded. Sending for AI review...', { id: toastId });

      // Find the task for description and title
      const taskToReview = tasks.find(task => task.id === taskId);
      if (!taskToReview) {
        throw new Error('Task not found for review.');
      }

      const agentResponse = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reviewTask',
          params: {
            taskId: Number(taskId),
            taskDescription: taskToReview.description,
            submissionData: {
              ipfsHash: ipfsCid,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
            },
          },
        }),
      });

      if (!agentResponse.ok) {
        let errorData = { message: 'AI agent review failed' };
        try {
          errorData = await agentResponse.json();
        } catch (e) {
          console.error('Failed to parse AI agent error response:', e);
        }
        throw new Error(errorData.message);
      }

      let agentData;
      try {
        agentData = await agentResponse.json();
        console.log('Parsed AI Agent Response:', agentData); // Log the parsed response
        console.log('Content of agentData.review:', agentData.review); // Added for debugging
      } catch (e) {
        const rawText = await agentResponse.text();
        console.error('Failed to parse AI agent JSON response. Raw text:', rawText, 'Error:', e);
        throw new Error('Failed to parse AI agent review response: ' + (e instanceof Error ? e.message : 'Unknown parsing error') + '. Raw response: ' + rawText.substring(0, 100) + '...');
      }
      
      const reviewStatus = agentData.review?.review?.overallStatus; // Use overallStatus as per AI agent prompt
      const reviewMessage = agentData.review?.review?.overallAssessment?.feedback || agentData.review?.review?.message || 'Review result unknown.';

      if (reviewStatus && reviewStatus.toLowerCase().trim() === 'accepted') {
        toast.loading('AI review accepted. Submitting transaction...', { id: toastId });

        writeContract({
          ...contractConfig,
          functionName: 'submitTaskCompletion',
          args: [BigInt(taskId), ipfsCid],
        }, {
          onSuccess: (hash) => {
            setPendingTxHash(hash);
            toast.loading('Confirming transaction...', { id: toastId });
          },
          onError: (err) => {
            setError(err.message);
            setLoading(false);
            toast.error(`Failed to submit task: ${err.message}`, { id: toastId, duration: 3000 });
            setCurrentToastId(undefined);
          }
        });
      } else {
        throw new Error(`AI review rejected: ${reviewMessage}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit completion');
      setLoading(false);
      toast.error(`Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { duration: 5000, id: currentToastId });
      setCurrentToastId(undefined);
    }
  };

  const handleAcceptTask = async (taskId: number, bounty: bigint) => {
    if (!address) {
      toast.error('Please connect your wallet to accept a task.', { duration: 3000 });
      return;
    }

    setLoading(true);
    setError(null);
    const toastId = toast.loading('Accepting task...');
    setCurrentToastId(toastId);

    try {
      writeContract({
        ...contractConfig,
        functionName: 'acceptTask',
        args: [BigInt(taskId)],
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: toastId });
        },
        onError: (err) => {
          setError(err.message);
          setLoading(false);
          toast.error(`Failed to accept task: ${err.message}`, { id: toastId, duration: 3000 });
          setCurrentToastId(undefined);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept task');
      setLoading(false);
      toast.error('Failed to accept task', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  };

  const renderTaskActions = (task: Task) => {
    if (!isConnected) {
      return (
        <Button
          onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
          className="w-full bg-white/15 backdrop-blur-2xl text-white hover:bg-white/25 text-lg px-10 py-6 border border-white/40 rounded-2xl font-light"
        >
          Connect Wallet
        </Button>
      );
    }

    if (task.isCompleted) {
      return (
        <Button disabled className="w-full bg-green-500/10 text-green-400/80 backdrop-blur-md border border-green-500/20 rounded-2xl px-6 py-3 font-light">
          Completed
        </Button>
      );
    }

    if (!task.isActive) {
      return (
        <Button disabled className="w-full bg-red-500/10 text-red-400/80 backdrop-blur-md border border-red-500/20 rounded-2xl px-6 py-3 font-light">
          Task Inactive
        </Button>
      );
    }

    if (task.worker === address) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-base font-light text-white/70 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border file:border-white/20 file:text-base file:font-light file:bg-white/10 file:text-white/80 hover:file:bg-white/20 focus:outline-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <Button
            onClick={() => handleSubmitCompletion(task.id)}
            disabled={!selectedFile || loading || isTransactionPending}
            className={`w-full bg-white/15 backdrop-blur-2xl text-white text-lg px-10 py-6 border border-white/40 rounded-2xl font-light ${
              (!selectedFile || loading || isTransactionPending)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/25'
            }`}
          >
            {loading || isTransactionPending ? 'Submitting...' : 'Submit Completion'}
            <ArrowRight className="ml-3 w-5 h-5" />
          </Button>
        </div>
      );
    }

    if (task.creator === address) {
      return (
        <Button disabled className="w-full bg-blue-500/10 text-blue-400/80 backdrop-blur-md border border-blue-500/20 rounded-2xl px-6 py-3 font-light">
          Awaiting Worker Submission
        </Button>
      );
    }

    return (
      <Button
        onClick={() => handleAcceptTask(task.id, task.bounty)}
        disabled={loading || isTransactionPending}
        className={`w-full bg-white/15 backdrop-blur-2xl text-white hover:bg-white/25 text-lg px-10 py-6 border border-white/40 rounded-2xl font-light ${
          (loading || isTransactionPending)
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white/25'
        }`}
      >
        {loading || isTransactionPending ? 'Accepting Task...' : 'Accept Task'}
        <ArrowRight className="ml-3 w-5 h-5" />
      </Button>
    );
  };

  return (
    <div className="w-full">
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
        },
      }} />
      
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {tasks.map((task) => (
            <CarouselItem key={task.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <GlassCard className="h-full p-6">
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-light text-white/90">{task.title}</h3>
                      <p className="text-sm text-white/60 line-clamp-3">{task.description}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Bounty:</span>
                        <span className="text-white/90">{formatEther(task.bounty)} ETH</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Status:</span>
                        <span className={`${
                          task.isCompleted ? 'text-green-400/80' :
                          task.isActive ? 'text-blue-400/80' :
                          'text-red-400/80'
                        }`}>
                          {task.isCompleted ? 'Completed' :
                           task.isActive ? 'Active' :
                           'Inactive'}
                        </span>
                      </div>
                      {task.requiredFileTypes.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Required Files:</span>
                          <span className="text-white/90">{task.requiredFileTypes.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    {renderTaskActions(task)}
                  </div>
                </div>
              </GlassCard>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
} 