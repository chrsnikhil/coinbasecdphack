import { useState, useCallback, useEffect } from 'react';
import { checkAgentStatus } from '@/utils/agent';

export const useTaskAgent = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initAgent = async () => {
      try {
        // Check if the agent API is ready
        const status = await checkAgentStatus();
        if (status.status === 'Agent API is ready') {
          setIsInitialized(true);
        } else {
          throw new Error('Agent API not ready');
        }
      } catch (err) {
        setError(err as Error);
      }
    };

    initAgent();
  }, []);

  const reviewTask = useCallback(async (taskId: number, submissionData: any) => {
    if (!isInitialized) {
      throw new Error('Agent not initialized');
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reviewTask',
          params: {
            taskId,
            taskDescription: submissionData.description,
            submissionData: {
              fileName: submissionData.files[0],
              fileType: 'application/pdf',
              ipfsHash: submissionData.ipfsHash
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to review task');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const processPayment = useCallback(async (taskId: number, amount: string, recipient: string) => {
    if (!isInitialized) {
      throw new Error('Agent not initialized');
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processPayment',
          params: {
            taskId,
            amount,
            recipient
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process payment');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const monitorTask = useCallback(async (taskId: number) => {
    if (!isInitialized) {
      throw new Error('Agent not initialized');
    }

    setIsLoading(true);
    setError(null);
    try {
      const status = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'monitorTask',
          params: {
            taskId
          }
        })
      });

      if (!status.ok) {
        throw new Error('Failed to monitor task');
      }

      const data = await status.json();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const resolveDispute = useCallback(async (taskId: number, disputeData: any) => {
    if (!isInitialized) {
      throw new Error('Agent not initialized');
    }

    setIsLoading(true);
    setError(null);
    try {
      const resolution = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolveDispute',
          params: {
            taskId,
            disputeData
          }
        })
      });

      if (!resolution.ok) {
        throw new Error('Failed to resolve dispute');
      }

      const data = await resolution.json();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  return {
    reviewTask,
    processPayment,
    monitorTask,
    resolveDispute,
    isLoading,
    error,
    isInitialized,
  };
}; 