'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import { parseEther } from 'viem';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import toast from 'react-hot-toast';
import GlassCard from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface CreateTaskProps {
  onTaskCreated: () => void; // Callback to refresh task list
}

export default function CreateTask({ onTaskCreated }: CreateTaskProps) {
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('');
  const [requiredFileTypes, setRequiredFileTypes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined); // To keep track of the active toast

  const { writeContract } = useWriteContract();

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  useEffect(() => {
    if (isTransactionSuccess) {
      setTitle('');
      setDescription('');
      setBounty('');
      setRequiredFileTypes('');
      setPendingTxHash(undefined);
      setIsSubmitting(false);
      if (currentToastId) toast.dismiss(currentToastId); // Dismiss any pending toast
      toast.success('Task created successfully!');
      setCurrentToastId(undefined);
      onTaskCreated(); // Trigger refresh in parent
    }
  }, [isTransactionSuccess, onTaskCreated, currentToastId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet to create a task.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const bountyInWei = parseEther(bounty);
      const fileTypesArray = requiredFileTypes.split(',').map(type => type.trim()).filter(type => type.length > 0);
      
      const toastId = toast.loading('Creating task...');
      setCurrentToastId(toastId);

      writeContract({
        ...contractConfig,
        functionName: 'createTask',
        args: [title, description, bountyInWei, fileTypesArray],
        value: bountyInWei,
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          toast.loading('Confirming transaction...', { id: toastId });
        },
        onError: (err) => {
          setError(err.message);
          setIsSubmitting(false);
          toast.error(`Failed to create task: ${err.message}`, { id: toastId });
          setCurrentToastId(undefined);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setIsSubmitting(false);
      toast.error('Failed to create task');
      setCurrentToastId(undefined);
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
          initial="initial"
          animate="animate"
        >
          <motion.div variants={inputVariants} className="space-y-2">
            <label htmlFor="title" className="block text-base font-light text-white/70">
              Task Title
            </label>
            <motion.input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              whileHover="hover"
              whileFocus="focus"
            />
          </motion.div>
          <motion.div variants={inputVariants} className="space-y-2">
            <label htmlFor="description" className="block text-base font-light text-white/70">
              Task Description
            </label>
            <motion.textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe the task in detail"
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
          {!isConnected ? (
            <motion.button
              type="button"
              onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
              className="w-full bg-white/15 backdrop-blur-2xl text-white hover:bg-white/25 text-lg px-10 py-6 border border-white/40 rounded-2xl font-light"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Connect Wallet to Create Task
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              disabled={isSubmitting || isTransactionPending}
              className={`w-full bg-white/15 backdrop-blur-2xl text-white text-lg px-10 py-6 border border-white/40 rounded-2xl font-light ${
                isSubmitting || isTransactionPending
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-white/25'
              }`}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {isSubmitting || isTransactionPending ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                </div>
              ) : (
                'Create Task'
              )}
            </motion.button>
          )}
        </motion.form>
      </GlassCard>
  );
} 