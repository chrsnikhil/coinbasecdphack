'use client';

import React, { Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { formatEther } from 'viem';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';

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

interface AllTasksPopupProps {
  tasks: Task[];
  onClose: () => void;
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

export default function AllTasksPopup({
  tasks,
  onClose,
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
}: AllTasksPopupProps) {
  const { address, isConnected } = useAccount();

  // Variants for popup animation (can be shared from page.tsx if defined there)
  const popupVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="bg-black/80 border border-white/20 rounded-3xl p-8 max-w-4xl w-full h-[90vh] text-white/90 relative shadow-2xl flex flex-col"
        variants={popupVariants}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-light text-white/95">All Tasks</h2>
          <button
            onClick={onClose}
            className="bg-white/15 backdrop-blur-md text-white/90 hover:bg-white/25 text-lg px-4 py-2 border border-white/40 rounded-full font-light transition-colors duration-200"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {tasks.length === 0 ? (
            <div className="text-center text-white/70 min-h-[200px] flex items-center justify-center">
              <p>No tasks available at the moment. Create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <GlassCard key={task.id} className="flex flex-col justify-between p-6 w-full text-white/90 border border-white/10 rounded-3xl" hoverEffect={true}>
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
              ))}
            </div>
          )}
        </div>

        {showReviewPopup && currentReview && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex items-center justify-center p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowReviewPopup(false)} // Close when clicking backdrop
          >
            <motion.div
              className="bg-black/80 border border-white/20 rounded-3xl p-8 max-w-2xl w-full text-white/90 relative shadow-2xl overflow-y-auto max-h-[90vh]"
              variants={popupVariants}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
            >
              <h2 className="text-3xl font-light mb-6 text-white/95 text-center">AI Review</h2>
              
              <div className="space-y-6 text-white/90">
                <motion.div variants={sectionVariants} initial="hidden" animate="visible">
                  <h3 className="text-xl font-light text-white/95 mb-3 flex items-center">
                    Overall Assessment:
                    {currentReview.overallStatus && (
                      <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${currentReview.overallStatus.toLowerCase().trim() === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
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
      </motion.div>
    </motion.div>
  );
} 