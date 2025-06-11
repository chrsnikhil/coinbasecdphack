"use client";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { publicClient } from '@/utils/viem';
import { FREELANCE_PLATFORM_ABI, contractConfig } from '@/config/contractConfig';
import TaskList from '@/components/TaskList';
import { CreateTask } from '@/components/CreateTask';
import AnimatedBackground from '@/components/AnimatedBackground';
import GlassCursor from '@/components/GlassCursor';
import { WalletConnect } from '@/components/WalletConnect';
import { formatEther, parseEther } from 'viem';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import AllTasksPopup from '@/components/AllTasksPopup';
import AIReviewsPopup from '@/components/AIReviewsPopup';
import { reviewStorage } from '@/utils/reviewStorage';
import { baseSepolia } from 'wagmi/chains';

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

// Define the exact type for the result of getTask from the ABI for clarity
type GetTaskResult = [
  string, // creator
  string, // title
  string, // description
  bigint, // bounty
  string, // worker
  boolean, // isCompleted
  boolean, // isActive
  string[], // requiredFileTypes
  string, // submittedFileCID
];

export default function Home() {
  const { address, isConnected, chain: connectedChain } = useAccount();
  const currentChainId = useChainId();
  const { writeContract } = useWriteContract();
  const { switchChain } = useSwitchChain();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCount, setTaskCount] = useState<number | undefined>(undefined);

  // State lifted from TaskList
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [currentReview, setCurrentReview] = useState<any>(null);

  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const fetchCount = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
    ...contractConfig,
    functionName: 'taskCount',
  });
      setTaskCount(Number(count));
    } catch (error: any) {
      console.error('Error fetching task count:', String(error));
      setTaskCount(0); // Assume 0 if count fetch fails
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    console.log('Current Wallet Chain ID (as perceived by Wagmi):', currentChainId);
    console.log('Current Wallet Chain (as perceived by Wagmi):', connectedChain?.name, connectedChain?.id);
    console.log('Expected Chain ID:', baseSepolia.id);
  }, [currentChainId, connectedChain]);

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
          if (taskResult.status === 'success') {
            const result = taskResult.result as unknown;
            if (Array.isArray(result) && result.length === 9) {
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
              ] = result as GetTaskResult;
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
          }
          return null;
        }).filter(Boolean) as Task[];
        return formatted;
      },
    },
  });

  useEffect(() => {
    setLoading(isFetchingTasks);
    if (fetchedTasksData) {
      setTasks(fetchedTasksData as Task[]);
    } else if (isFetchingError) {
      setTasks([]);
    }
  }, [fetchedTasksData, isFetchingTasks, isFetchingError]);

  // Functions lifted from TaskList
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  }, [setSelectedFile]);

  // New useEffect to handle transaction status for all actions
  useEffect(() => {
    if (isTransactionSuccess && pendingTxHash) {
      toast.success('Transaction confirmed!');
      refetchTasksHook(); // Re-fetch all tasks to update their status
      setPendingTxHash(undefined);
      setCurrentToastId(undefined);
      setLoading(false); // Ensure loading state is reset
    } else if (!isTransactionPending && pendingTxHash) { // Transaction failed after being sent
      toast.error('Transaction failed. Please check your wallet or the network.');
      setPendingTxHash(undefined);
      setCurrentToastId(undefined);
      setLoading(false); // Ensure loading state is reset
    }
  }, [isTransactionSuccess, isTransactionPending, pendingTxHash, refetchTasksHook, setCurrentToastId]);

  const handleSubmitCompletion = useCallback(async (taskId: number) => {
    if (!selectedFile) {
      toast.error('Please select a file to submit.');
      return;
    }

    console.log('Checking connected chain for submission:', { connectedChainId: connectedChain?.id, expectedChainId: baseSepolia.id });
    if (!connectedChain || connectedChain.id !== baseSepolia.id) {
      toast.error(`Please switch your wallet to the Base Sepolia network (Chain ID: ${baseSepolia.id}) to submit tasks.`);
      try {
        await switchChain({ chainId: baseSepolia.id });
        toast.success("Network switched successfully. Please click 'Submit Completion' again.");
        return;
      } catch (switchError: any) {
        console.error("Error switching chain:", switchError);
        toast.error(`Failed to switch to Base Sepolia: ${switchError.message || switchError.shortMessage || String(switchError)}`);
        return;
      }
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

      // Store the review in localStorage
      try {
        reviewStorage.addReview({
          taskId: Number(taskId),
          taskTitle: taskToReview.title,
          taskDescription: taskToReview.description,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          ipfsHash: ipfsCid,
          review: agentData.review?.review,
          status: reviewStatus && reviewStatus.toLowerCase().trim() === 'accepted' ? 'accepted' : 'rejected'
        });
        console.log('Review stored in localStorage');
      } catch (storageError) {
        console.error('Failed to store review in localStorage:', storageError);
        // Don't fail the whole process if storage fails
      }

      setCurrentReview(agentData.review?.review);
      setShowReviewPopup(true);

      if (reviewStatus && reviewStatus.toLowerCase().trim() === 'accepted') {
        toast.loading('AI review accepted. Submitting transaction...', { id: toastId });

        writeContract({
          ...contractConfig,
          functionName: 'submitTaskCompletion',
          args: [BigInt(taskId), ipfsCid],
          chain: baseSepolia,
        }, {
          onSuccess: (hash) => {
            setPendingTxHash(hash);
            // No toast.loading here, useEffect will handle confirmation toast
          },
          onError: (err: any) => {
            setError(String(err));
            setLoading(false);
            toast.error(`Failed to submit task: ${String(err)}`, { id: toastId });
            setCurrentToastId(undefined);
          }
        });
      } else {
        throw new Error(`AI review rejected: ${reviewMessage}`);
      }

    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      toast.error(`Submission failed: ${err instanceof Error ? err.message : String(err)}`, { id: currentToastId });
      setCurrentToastId(undefined);
    }
  }, [selectedFile, tasks, address, connectedChain, switchChain, writeContract, contractConfig, baseSepolia, toast, setPendingTxHash, setCurrentToastId, setLoading, setError, currentReview, setShowReviewPopup, setCurrentReview]);

  const handleAcceptTask = useCallback(async (taskId: number, bounty: bigint) => {
    if (!address) {
      toast.error('Please connect your wallet to accept a task.');
      return;
    }

    console.log('Checking connected chain for acceptance:', { connectedChainId: connectedChain?.id, expectedChainId: baseSepolia.id });
    if (!connectedChain || connectedChain.id !== baseSepolia.id) {
      toast.error(`Please switch your wallet to the Base Sepolia network (Chain ID: ${baseSepolia.id}) to accept tasks.`);
      try {
        await switchChain({ chainId: baseSepolia.id });
        toast.success("Network switched successfully. Please click 'Accept Task' again.");
        return;
      } catch (switchError: any) {
        console.error("Error switching chain:", switchError);
        toast.error(`Failed to switch to Base Sepolia: ${switchError.message || switchError.shortMessage || String(switchError)}`);
        return;
      }
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
        chain: baseSepolia,
      }, {
        onSuccess: (hash) => {
          setPendingTxHash(hash);
          // No toast.loading here, useEffect will handle confirmation toast
        },
        onError: (err: any) => {
          setError(String(err));
          setLoading(false);
          toast.error(`Failed to accept task: ${String(err)}`, { id: toastId });
          setCurrentToastId(undefined);
        }
      });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      toast.error(`Failed to accept task: ${err instanceof Error ? err.message : String(err)}`);
      setCurrentToastId(undefined);
    }
  }, [address, connectedChain, switchChain, toast, setLoading, setError, setCurrentToastId, writeContract, contractConfig, baseSepolia, setPendingTxHash]);

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
    } else if (task.worker === '0x0000000000000000000000000000000000000000' && address !== task.creator) {
      return (
        <Button
          onClick={() => handleAcceptTask(task.id, task.bounty)}
          disabled={loading}
          className={`w-full bg-white/15 backdrop-blur-2xl text-white text-base px-4 py-3 border border-white/40 rounded-2xl font-light overflow-hidden whitespace-nowrap text-ellipsis ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/25'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Accepting...
            </div>
          ) : (
            `Accept Task (Bounty: ${formatEther(task.bounty)} ETH)`
          )}
        </Button>
      );
    } else if (task.worker === address && !task.isCompleted) {
      return (
        <div className="flex flex-col gap-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-white/70
            file:mr-4 file:py-2 file:px-4
            file:rounded-2xl file:border-0
            file:text-sm file:font-semibold
            file:bg-white/10 file:text-white/80
            hover:file:bg-white/20 hover:file:cursor-pointer
            focus:outline-none focus:ring-0"
          />
          <Button
            onClick={() => handleSubmitCompletion(task.id)}
            disabled={loading || !selectedFile}
            className={`w-full bg-white/15 backdrop-blur-2xl text-white text-lg px-10 py-6 border border-white/40 rounded-2xl font-light ${
              loading || !selectedFile
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/25'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...
              </div>
            ) : (
              'Submit Completion'
            )}
          </Button>
        </div>
      );
    } else if (task.creator === address && !task.isCompleted) {
      return (
        <Button disabled className="w-full bg-white/10 text-white/50 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 font-light">
          Awaiting Worker Submission
        </Button>
      );
    }
    return null;
  };

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

  const handleTaskCreated = async () => {
    setLoading(true);
    await fetchCount();
    refetchTasksHook();
  };

  const [showAllTasksPopup, setShowAllTasksPopup] = useState(false);
  const [showAIReviewsPopup, setShowAIReviewsPopup] = useState(false);

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
            <div className="mb-8 text-center">
              <CreateTask />
              <div className="flex justify-center gap-4 mt-4 mb-6">
                <Button
                  onClick={() => setShowAllTasksPopup(true)}
                  className="w-auto px-6 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 text-white/80 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                    <span className="text-white/80 group-hover:text-white font-medium transition-colors">
                      Show All Tasks
                    </span>
                  </div>
                </Button>

                <Button
                  onClick={() => setShowAIReviewsPopup(true)}
                  className="w-auto px-6 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 text-white/80 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-white/80 group-hover:text-white font-medium transition-colors">
                      AI Reviews
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="text-center text-white/60">Loading tasks...</div>
          ) : (
            <TaskList 
              tasks={tasks} 
              refetchTasks={handleTaskCreated} 
              loading={loading}
              error={error}
              selectedFile={selectedFile}
              pendingTxHash={pendingTxHash}
              currentToastId={currentToastId}
              showReviewPopup={showReviewPopup}
              currentReview={currentReview}
              handleFileChange={handleFileChange}
              handleSubmitCompletion={handleSubmitCompletion}
              handleAcceptTask={handleAcceptTask}
              renderTaskActions={renderTaskActions}
              setShowReviewPopup={setShowReviewPopup}
              setCurrentReview={setCurrentReview}
            />
          )}

          {/* AI Review Popup - lifted from TaskList */}
          <AnimatePresence>
            {showReviewPopup && currentReview && (
              <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4"
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

          {/* All Tasks Popup */}
          <AnimatePresence>
            {showAllTasksPopup && (
              <AllTasksPopup
                tasks={tasks}
                onClose={() => setShowAllTasksPopup(false)}
                loading={loading}
                error={error}
                selectedFile={selectedFile}
                pendingTxHash={pendingTxHash}
                currentToastId={currentToastId}
                showReviewPopup={showReviewPopup}
                currentReview={currentReview}
                handleFileChange={handleFileChange}
                handleSubmitCompletion={handleSubmitCompletion}
                handleAcceptTask={handleAcceptTask}
                renderTaskActions={renderTaskActions}
                setShowReviewPopup={setShowReviewPopup}
                setCurrentReview={setCurrentReview}
              />
            )}
          </AnimatePresence>

          {/* AI Reviews Popup */}
          <AIReviewsPopup
            isOpen={showAIReviewsPopup}
            onClose={() => setShowAIReviewsPopup(false)}
            onViewReview={(review) => {
              setCurrentReview(review);
              setShowReviewPopup(true);
            }}
          />
        </div>
        </div>
      </main>
  );
}