'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { parseEther, UserRejectedRequestError } from 'viem';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import GlassCard from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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

export function CreateTask() {
  const { address, isConnected } = useAccount();
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [bounty, setBounty] = useState('');
  const [requiredFileTypes, setRequiredFileTypes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [currentReview, setCurrentReview] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const { writeContract, data: writeContractData, error: writeError } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: writeContractData,
  });

  useEffect(() => {
    console.log('useEffect triggered in CreateTask:', { isSubmitting, isTransactionPending, isTransactionSuccess, writeContractData, currentToastId });

    // Handle "Confirming transaction..." toast
    if (writeContractData && isTransactionPending) {
      if (!currentToastId) {
        console.log('Showing Confirming transaction toast...');
        const id = toast.loading("Confirming transaction...", { duration: Infinity });
        setCurrentToastId(String(id));
      }
    }
    // Handle success toast - This should be the highest priority if successful
    else if (isTransactionSuccess && writeContractData) { // Ensure writeContractData is still around for context of this specific tx
      console.log('Transaction success path reached! Dismissing current toast and showing success toast.');
      if (currentToastId) toast.dismiss(currentToastId);
      toast.success('Task created successfully!');
      // Reset form and states after successful transaction
      setTaskName('');
      setTaskDescription('');
      setBounty('');
      setRequiredFileTypes('');
      setIsSubmitting(false); // Only reset isSubmitting here
      setCurrentToastId(undefined);
    }
    // Handle failure toast (transaction completed, but not successfully)
    else if (!isTransactionPending && writeContractData && !isTransactionSuccess) {
      console.log('Transaction failed path reached. Dismissing current toast and showing error toast.');
      if (currentToastId) toast.dismiss(currentToastId);
      toast.error('Task creation failed!');
      setIsSubmitting(false); // Only reset isSubmitting here
      setCurrentToastId(undefined);
    }
    // If writeContractData becomes undefined (e.g., from an error in handleSubmit before setting hash),
    // and there's a currentToastId, dismiss it.
    else if (!writeContractData && currentToastId) {
      if (currentToastId) toast.dismiss(currentToastId);
      setCurrentToastId(undefined);
    }
  }, [isTransactionPending, isTransactionSuccess, writeContractData, currentToastId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmitCompletion = async (taskId: number) => {
    // Implementation will be added when needed
  };

  const handleAcceptTask = async (taskId: number, bounty: bigint) => {
    // Implementation will be added when needed
  };

  const renderTaskActions = (task: Task) => {
    // Implementation will be added when needed
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !taskDescription.trim() || !bounty || parseFloat(bounty) <= 0) {
      toast.error("Please fill in all fields correctly, including a valid bounty that is greater than 0.");
      return;
    }

    setIsSubmitting(true);
    const initialLoadingToastId = toast.loading("Creating task...", { duration: Infinity });
    setCurrentToastId(String(initialLoadingToastId));

    try {
      const parsedBounty = parseEther(bounty);
      // console.log("Bounty string:", bounty); // Removed debug log
      // console.log("Parsed bounty (BigInt):", parsedBounty); // Removed debug log

      const fileTypesArray = requiredFileTypes.split(',').map(type => type.trim()).filter(type => type !== '');

      // console.log("Arguments for createTask:", { // Removed debug log
      //   taskName,
      //   taskDescription,
      //   parsedBounty: parsedBounty.toString(),
      //   fileTypesArray,
      // });

      // console.log("Attempting to write contract..."); // Removed debug log
      await writeContract({
        ...contractConfig,
        functionName: 'createTask',
        args: [taskName, taskDescription, parsedBounty, fileTypesArray],
        value: parsedBounty,
      });

      // If writeContract succeeds without throwing, the transaction was initiated
      // The transaction hash is now available in writeContractData from the hook
      if (initialLoadingToastId) toast.dismiss(initialLoadingToastId);

    } catch (err: any) {
      // console.error("Error during contract write or initial checks:", err); // Modified error logging
      setError(err.shortMessage || String(err));
      if (initialLoadingToastId) toast.dismiss(initialLoadingToastId); // Dismiss initial loading toast on error

      if (err instanceof UserRejectedRequestError) {
        toast.error("Transaction rejected by user in wallet.", {
          duration: 5000,
        });
      } else {
        toast.error(`Failed to create task: ${err.shortMessage || String(err)}`, {
          duration: 5000,
        });
      }

      setIsSubmitting(false); // Reset submitting state after error
      setCurrentToastId(undefined); // Clear toast ID on error
    }
  };

  const inputVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.01, borderColor: "rgba(255, 255, 255, 0.6)", transition: { duration: 0.2 } },
    focus: { borderColor: "rgba(255, 255, 255, 0.8)", boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.2)", transition: { duration: 0.2 } }
  };

  const buttonVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.6 } },
    hover: { scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.25)", transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <GlassCard className="w-full max-w-2xl mx-auto p-8" hoverEffect={false}>
          <h2 className="text-2xl font-light mb-8">
            Create New Task
          </h2>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
            >
              {error}
            </motion.div>
          )}
          
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div variants={inputVariants} className="space-y-2">
              <label htmlFor="taskName" className="block text-base font-light text-white/70">
                Task Name
              </label>
              <motion.input
                id="taskName"
                value={taskName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskName(e.target.value)}
                placeholder="Enter task name"
                required
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                whileHover="hover"
                whileFocus="focus"
              />
            </motion.div>
            <motion.div variants={inputVariants} className="space-y-2">
              <label htmlFor="taskDescription" className="block text-base font-light text-white/70">
                Task Description
              </label>
              <motion.textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskDescription(e.target.value)}
                placeholder="Enter task description"
                required
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none min-h-[100px]"
                whileHover="hover"
                whileFocus="focus"
              />
            </motion.div>
            <motion.div variants={inputVariants} className="space-y-2">
              <label htmlFor="bounty" className="block text-base font-light text-white/70">
                Bounty (ETH)
              </label>
              <motion.input
                id="bounty"
                type="text"
                value={bounty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value)) {
                    setBounty(value);
                  }
                }}
                placeholder="Enter bounty amount in ETH"
                required
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                whileHover="hover"
                whileFocus="focus"
              />
            </motion.div>
            <motion.div variants={inputVariants} className="space-y-2">
              <label htmlFor="requiredFileTypes" className="block text-base font-light text-white/70">
                Required File Types (comma-separated, e.g., pdf, docx, jpg)
              </label>
              <motion.input
                id="requiredFileTypes"
                type="text"
                value={requiredFileTypes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequiredFileTypes(e.target.value)}
                placeholder="e.g., pdf, docx, jpg"
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                whileHover="hover"
                whileFocus="focus"
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting || !taskName.trim() || !taskDescription.trim() || !bounty || parseFloat(bounty) <= 0}
              className="w-full px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 
                         border border-white/20 transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting || isTransactionPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isSubmitting ? "Creating Task..." : "Confirming..."}</span>
                </>
              ) : (
                "Create Task"
              )}
            </motion.button>
          </motion.form>
        </GlassCard>
      </motion.div>
    </div>
  );
} 