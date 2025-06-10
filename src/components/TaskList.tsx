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

interface Task {
  id: number;
  title: string;
  description: string;
  bounty: bigint;
  creator: string;
  worker: string;
  isActive: boolean;
  isCompleted: boolean;
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
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [submittingFileTaskId, setSubmittingFileTaskId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingTaskId, setApplyingTaskId] = useState<number | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);

  const { writeContract } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      refetchTasks();
      setPendingTxHash(undefined);
      setIsApplying(false);
      setApplyingTaskId(null);
      setIsSubmittingFile(false);
      setSubmittingFileTaskId(null);
      setSelectedFile(null);
      if (currentToastId) toast.dismiss(currentToastId);
      toast.success('Transaction confirmed successfully!', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  }, [isTransactionSuccess, refetchTasks]);

  const handleApply = async (taskId: number) => {
    if (!address) return;
    
    try {
      setError(null);
      setIsApplying(true);
      setApplyingTaskId(taskId);

      const toastId = toast.loading('Applying for task...');
      setCurrentToastId(toastId);

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
          setIsApplying(false);
          setApplyingTaskId(null);
          toast.error(`Failed to apply: ${err.message}`, { id: toastId, duration: 3000 });
          setCurrentToastId(undefined);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply for task');
      setIsApplying(false);
      setApplyingTaskId(null);
      toast.error('Failed to apply for task', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmitCompletion = async (taskId: number, task: Task) => {
    if (!address || !selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (task.requiredFileTypes.length > 0 && !task.requiredFileTypes.includes(fileExtension)) {
      toast.error(`Invalid file type. Required: ${task.requiredFileTypes.join(', ')}`);
      return;
    }

    // Validate task state before proceeding
    if (!task.isActive) {
      toast.error('This task is no longer active');
      return;
    }

    if (task.worker !== address) {
      toast.error('You are not the assigned worker for this task');
      return;
    }

    try {
      setError(null);
      setIsSubmittingFile(true);
      setSubmittingFileTaskId(taskId);

      const toastId = toast.loading('Uploading file to IPFS...');
      setCurrentToastId(toastId);

      let ipfsHash = '';
      try {
        // First, fetch the presigned URL from your API route
        const presignedUrlResponse = await fetch('/api/pinata/presigned-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: selectedFile.name,
            type: selectedFile.type,
          }),
        });

        if (!presignedUrlResponse.ok) {
          const errorData = await presignedUrlResponse.json();
          throw new Error(`Failed to get presigned URL: ${errorData.error}`);
        }

        const { url } = await presignedUrlResponse.json();
        console.log('Got presigned URL:', url);

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Now, upload the file using the presigned URL
        const uploadResponse = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Upload failed with status: ${uploadResponse.status}`);
        }

        // Get the IPFS hash from the response
        const responseData = await uploadResponse.json();
        console.log('Upload response:', responseData);

        if (!responseData.data || !responseData.data.cid) {
          throw new Error('No IPFS hash received in response');
        }

        ipfsHash = responseData.data.cid;
        toast.success('File uploaded to IPFS!', { id: toastId, duration: 2000 });
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload file');
        setIsSubmittingFile(false);
        setSubmittingFileTaskId(null);
        toast.error(`File upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`, { id: toastId, duration: 3000 });
        setCurrentToastId(undefined);
        return;
      }

      // AI Review Step
      const reviewToastId = toast.loading('AI is reviewing your submission...');
      setCurrentToastId(reviewToastId);

      try {
        const reviewResponse = await fetch('/api/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reviewTask',
            params: {
              taskId,
              taskDescription: task.description,
              submissionData: {
                ipfsHash,
                fileName: selectedFile.name,
                fileType: selectedFile.type,
              }
            }
          })
        });

        if (!reviewResponse.ok) {
          throw new Error('Failed to get AI review');
        }

        const reviewResult = await reviewResponse.json();
        console.log('AI Review Result:', reviewResult);

        // Check if the review recommends approval
        if (!reviewResult.result.includes('RECOMMENDATION: APPROVE')) {
          toast.error('Submission rejected by AI review', { id: reviewToastId, duration: 5000 });
          setCurrentToastId(undefined);
          setIsSubmittingFile(false);
          setSubmittingFileTaskId(null);
          return;
        }

        toast.success('AI review passed!', { id: reviewToastId, duration: 2000 });
      } catch (reviewError) {
        console.error('Review error:', reviewError);
        setError(reviewError instanceof Error ? reviewError.message : 'Failed to get AI review');
        setIsSubmittingFile(false);
        setSubmittingFileTaskId(null);
        toast.error(`AI review failed: ${reviewError instanceof Error ? reviewError.message : 'Unknown error'}`, { id: reviewToastId, duration: 3000 });
        setCurrentToastId(undefined);
        return;
      }

      const submitToastId = toast.loading('Submitting task completion...');
      setCurrentToastId(submitToastId);

      console.log('Submitting task completion with:', {
        taskId,
        ipfsHash,
        taskState: {
          isActive: task.isActive,
          worker: task.worker,
          address,
          bounty: task.bounty.toString()
        }
      });

      writeContract({
        ...contractConfig,
        functionName: 'submitTaskCompletion',
        args: [BigInt(taskId), ipfsHash],
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: submitToastId });
        },
        onError: (err) => {
          console.error('Transaction error:', err);
          setError(err.message);
          setIsSubmittingFile(false);
          setSubmittingFileTaskId(null);
          toast.error(`Failed to submit: ${err.message}`, { id: submitToastId, duration: 3000 });
          setCurrentToastId(undefined);
        }
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit completion');
      setIsSubmittingFile(false);
      setSubmittingFileTaskId(null);
      toast.error('Failed to submit completion', { duration: 3000 });
      setCurrentToastId(undefined);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
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
        Available Tasks
      </h2>
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
        </div>
      )}
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full relative"
      >
        <CarouselContent className="-ml-4">
          {tasks.map((task, index) => (
            <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <div className="bg-black/90 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:border-white/20 transition-all duration-300 h-full flex flex-col shadow-lg">
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold line-clamp-1 text-white">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      {task.isCompleted && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20">
                          Completed
                        </span>
                      )}
                      {!task.isActive && !task.isCompleted && task.worker !== '0x0000000000000000000000000000000000000000' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                          In Progress
                        </span>
                      )}
                      {task.isActive && task.worker === '0x0000000000000000000000000000000000000000' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                          Open
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-4 line-clamp-2">{task.description}</p>
                  <div className="flex flex-col gap-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatEther(task.bounty)} ETH
                    </span>
                    {task.requiredFileTypes && task.requiredFileTypes.length > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0015.586 6H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
                        </svg>
                        Files: {task.requiredFileTypes.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {!isConnected ? (
                    <Button
                      onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
                      className="w-full bg-white text-black hover:bg-zinc-200"
                    >
                      Connect Wallet to Apply
                    </Button>
                  ) : !task.isActive ? (
                    <div className="text-center text-zinc-400">
                      This task is no longer active.
                    </div>
                  ) : task.isCompleted ? (
                    <div className="space-y-4">
                      <div className="text-center text-zinc-300">
                        Task completed. Submitted File:
                      </div>
                      <a 
                        href={`https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${task.submittedFileCID}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors duration-200 text-sm font-medium"
                      >
                        View Submitted File
                      </a>
                    </div>
                  ) : task.worker === address ? (
                    <div className="space-y-4">
                      <div className="text-center text-zinc-300">
                        You are the assigned worker for this task.
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                        />
                        <Button
                          onClick={() => handleSubmitCompletion(task.id, task)}
                          disabled={!selectedFile || isSubmittingFile}
                          className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingFile && submittingFileTaskId === task.id ? 'Submitting...' : 'Submit Completion'}
                        </Button>
                      </div>
                    </div>
                  ) : task.worker === '0x0000000000000000000000000000000000000000' ? (
                    <Button
                      onClick={() => handleApply(task.id)}
                      disabled={isApplying && applyingTaskId === task.id}
                      className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplying && applyingTaskId === task.id ? 'Applying...' : 'Apply for Task'}
                    </Button>
                  ) : (
                    <div className="text-center text-zinc-400">
                      This task has been assigned to another worker.
                    </div>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex items-center justify-between absolute -bottom-12 left-0 right-0">
          <CarouselPrevious className="static bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-800" />
          <CarouselNext className="static bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-800" />
        </div>
      </Carousel>
    </div>
  );
} 