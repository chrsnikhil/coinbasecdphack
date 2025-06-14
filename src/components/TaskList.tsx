'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { formatEther } from 'viem';
import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import toast from 'react-hot-toast';
import { publicClient, walletClient } from "@/utils/viem";
import GlassCard from '@/components/GlassCard';
import { ArrowRight, Loader2 } from 'lucide-react';
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
  loading: boolean;
  error: string | null;
  selectedFile: File | null;
  pendingTxHash: `0x${string}` | undefined;
  currentToastId: string | undefined;
  showReviewPopup: boolean;
  currentReview: any;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmitCompletion: (taskId: number) => Promise<void>;
  handleAcceptTask: (taskId: number, bounty: bigint) => Promise<void>;
  renderTaskActions: (task: Task) => JSX.Element | null;
  setShowReviewPopup: Dispatch<SetStateAction<boolean>>;
  setCurrentReview: Dispatch<SetStateAction<any>>;
}

export default function TaskList({
  tasks,
  refetchTasks,
  loading,
  error,
  selectedFile,
  pendingTxHash,
  currentToastId,
  showReviewPopup,
  currentReview,
  handleFileChange,
  handleSubmitCompletion,
  handleAcceptTask,
  renderTaskActions,
  setShowReviewPopup,
  setCurrentReview,
}: TaskListProps) {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      if (currentToastId) toast.dismiss(currentToastId);
      toast.success('Task submitted for review!');
      refetchTasks();
    }
  }, [isTransactionSuccess, refetchTasks, currentToastId]);

  const popupVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2, ease: "easeIn" } },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="w-full relative">
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
        className="w-full px-16 relative"
      >
        <CarouselContent className="-ml-4">
          {tasks.length === 0 ? (
            <CarouselItem className="pl-4 md:basis-full lg:basis-full">
              <GlassCard className="p-6 text-center text-white/70 min-h-[300px] flex items-center justify-center">
                <p>No tasks available at the moment. Be the first to create one!</p>
              </GlassCard>
            </CarouselItem>
          ) : (
            tasks.map((task) => (
              <CarouselItem key={task.id} className="pl-4 md:basis-1/2 lg:basis-1/3 flex">
                <GlassCard className="flex flex-col justify-between p-6 w-full text-white/90 border border-white/10 rounded-3xl" hoverEffect={true}>
                  <div>
                    <h3 className="text-xl font-light mb-2 flex items-center justify-between">
                      {task.title}
                      {task.isCompleted && (
                        <span className="ml-2 text-green-400 text-sm font-medium bg-green-500/10 px-3 py-1 rounded-full">Completed</span>
                      )}
                      {task.isActive && !task.isCompleted && (
                        <span className="ml-2 text-blue-400 text-sm font-medium bg-blue-500/10 px-3 py-1 rounded-full">Active</span>
                      )}
                    </h3>
                    <p className="text-white/70 text-sm mb-4 line-clamp-3">{task.description}</p>
                    <div className="text-sm mb-4">
                      <p><span className="font-light text-white/60">Bounty:</span> <span className="font-medium">{formatEther(task.bounty)} ETH</span></p>
                      <p><span className="font-light text-white/60">Creator:</span> <span className="font-medium line-clamp-1">{task.creator}</span></p>
                      {task.worker !== '0x0000000000000000000000000000000000000000' && (
                        <p><span className="font-light text-white/60">Worker:</span> <span className="font-medium line-clamp-1">{task.worker}</span></p>
                      )}
                      {task.requiredFileTypes.length > 0 && (
                        <p><span className="font-light text-white/60">File Types:</span> <span className="font-medium">{task.requiredFileTypes.join(', ')}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    {renderTaskActions(task)}
                  </div>
                </GlassCard>
              </CarouselItem>
            ))
          )}
        </CarouselContent>
        <CarouselPrevious className="absolute left-8 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200" />
        <CarouselNext className="absolute right-8 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200" />
      </Carousel>

      <AnimatePresence>
        {showReviewPopup && currentReview && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowReviewPopup(false)}
          >
            <motion.div
              className="bg-black/80 border border-white/20 rounded-3xl p-8 max-w-2xl w-full text-white/90 relative shadow-2xl overflow-y-auto max-h-[90vh]"
              variants={popupVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-light mb-6 text-white/95 text-center">AI Review</h2>
              
              <div className="space-y-6 text-white/90">
                <motion.div variants={sectionVariants} initial="hidden" animate="visible">
                  <h3 className="text-xl font-light text-white/95 mb-3 flex items-center">
                    Overall Assessment:
                    {currentReview.overallStatus && (
                      <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                        currentReview.overallStatus.toLowerCase().trim() === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {currentReview.overallStatus}
                      </span>
                    )}
                  </h3>
                  <GlassCard className="p-4 bg-black/60 border border-white/10 rounded-2xl">
                    <p className="text-white/80">{currentReview.overallAssessment?.feedback || 'No feedback provided.'}</p>
                  </GlassCard>
                </motion.div>

                <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
                  <h3 className="text-xl font-light text-white/95 mb-3">Code Quality:</h3>
                  <GlassCard className="p-4 bg-black/60 border border-white/10 rounded-2xl">
                    <ul className="list-disc list-inside text-white/80">
                      {currentReview.codeQuality?.issues?.length > 0 ? (
                        currentReview.codeQuality.issues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))
                      ) : (
                        <li>{currentReview.codeQuality?.feedback || 'No specific code quality feedback.'}</li>
                      )}
                    </ul>
                  </GlassCard>
                </motion.div>

                <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
                  <h3 className="text-xl font-light text-white/95 mb-3">Documentation:</h3>
                  <GlassCard className="p-4 bg-black/60 border border-white/10 rounded-2xl">
                    <ul className="list-disc list-inside text-white/80">
                      {currentReview.documentation?.issues?.length > 0 ? (
                        currentReview.documentation.issues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))
                      ) : (
                        <li>{currentReview.documentation?.feedback || 'No specific documentation feedback.'}</li>
                      )}
                    </ul>
                  </GlassCard>
                </motion.div>

                <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
                  <h3 className="text-xl font-light text-white/95 mb-3">Security Analysis:</h3>
                  <GlassCard className="p-4 bg-black/60 border border-white/10 rounded-2xl">
                    <ul className="list-disc list-inside text-white/80">
                      {currentReview.securityAnalysis?.issues?.length > 0 ? (
                        currentReview.securityAnalysis.issues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))
                      ) : (
                        <li>{currentReview.securityAnalysis?.feedback || 'No specific security analysis feedback.'}</li>
                      )}
                    </ul>
                  </GlassCard>
                </motion.div>
              </div>

              <button
                onClick={() => setShowReviewPopup(false)}
                className="mt-8 w-full bg-white/15 backdrop-blur-md text-white/90 hover:bg-white/25 text-lg px-6 py-3 border border-white/40 rounded-2xl font-light transition-colors duration-200"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 