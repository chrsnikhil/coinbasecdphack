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
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [currentReview, setCurrentReview] = useState<any>(null);

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
        console.log('Parsed AI Agent Response:', agentData);
        console.log('Content of agentData.review:', agentData.review);
      } catch (e) {
        const rawText = await agentResponse.text();
        console.error('Failed to parse AI agent JSON response. Raw text:', rawText, 'Error:', e);
        throw new Error('Failed to parse AI agent review response: ' + (e instanceof Error ? e.message : 'Unknown parsing error') + '. Raw response: ' + rawText.substring(0, 100) + '...');
      }
      
      const reviewStatus = agentData.review?.review?.overallStatus;
      const reviewMessage = agentData.review?.review?.overallAssessment?.feedback || agentData.review?.review?.message || 'Review result unknown.';

      // Show review popup
      setCurrentReview(agentData.review?.review);
      setShowReviewPopup(true);

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
        <div className="flex flex-col gap-2">
          <Button disabled className="w-full bg-green-500/10 text-green-400/80 backdrop-blur-md border border-green-500/20 rounded-2xl px-6 py-3 font-light">
            Completed
          </Button>
          {task.submittedFileCID && address === task.creator && (
            <Button
              onClick={() => window.open(`https://ipfs.io/ipfs/${task.submittedFileCID}`, '_blank')}
              className="w-full bg-blue-500/10 text-blue-400/80 backdrop-blur-md border border-blue-500/20 rounded-2xl px-6 py-3 font-light"
            >
              View Submission
            </Button>
          )}
        </div>
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

      {/* AI Review Popup */}
      <AnimatePresence>
        {showReviewPopup && currentReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <motion.h3 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-light text-white"
                  >
                    AI Review Results
                  </motion.h3>
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setShowReviewPopup(false)}
                    className="text-white/60 hover:text-white"
                  >
                    ×
                  </motion.button>
                </div>
                
                <div className="space-y-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-black/60 border border-white/5"
                  >
                    <h4 className="text-lg font-light text-white mb-2">Overall Assessment</h4>
                    <p className="text-white/90">{currentReview.overallAssessment?.feedback || 'No feedback provided'}</p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-xl bg-black/60 border border-white/5"
                    >
                      <h4 className="text-lg font-light text-white mb-2">Code Quality</h4>
                      <p className="text-white/90">{currentReview.codeQuality?.feedback || 'No feedback provided'}</p>
                    </motion.div>
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-xl bg-black/60 border border-white/5"
                    >
                      <h4 className="text-lg font-light text-white mb-2">Documentation</h4>
                      <p className="text-white/90">{currentReview.documentation?.feedback || 'No feedback provided'}</p>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-xl bg-black/60 border border-white/5"
                  >
                    <h4 className="text-lg font-light text-white mb-2">Security Analysis</h4>
                    <p className="text-white/90">{currentReview.securityAnalysis?.feedback || 'No feedback provided'}</p>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-end"
                >
                  <Button
                    onClick={() => setShowReviewPopup(false)}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-xl font-light transition-all duration-200"
                  >
                    Close
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 