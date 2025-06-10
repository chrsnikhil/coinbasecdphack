import { useState } from 'react';
import { useTaskAgent } from '../agent/useTaskAgent';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function AgentTest() {
  const { reviewTask, processPayment, isLoading, error, isInitialized } = useTaskAgent();
  const [testResult, setTestResult] = useState<string>('');

  const runWalletTest = async () => {
    try {
      // Test task review
      const reviewResult = await reviewTask(1, {
        title: "Test Task",
        description: "This is a test task submission",
        files: ["test-file.pdf"]
      });
      setTestResult(prev => prev + '\nReview Result: ' + reviewResult);

      // Test payment (with a very small amount)
      const paymentResult = await processPayment(
        1,
        '0.0001', // Very small amount for testing
        '0x4c8bbcfc6DaE447228FcbB220C1DD4cae623EaaF' // Test recipient address
      );
      setTestResult(prev => prev + '\nPayment Result: ' + JSON.stringify(paymentResult, null, 2));

      toast.success('Agent test completed successfully!');
    } catch (err) {
      console.error('Test failed:', err);
      setTestResult(prev => prev + '\nError: ' + (err as Error).message);
      toast.error('Agent test failed: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Agent Test Panel</h2>
      
      <div className="space-y-2">
        <p>Agent Status: {isInitialized ? '✅ Initialized' : '⏳ Initializing...'}</p>
        {error && <p className="text-red-500">Error: {error.message}</p>}
      </div>

      <Button 
        onClick={runWalletTest}
        disabled={!isInitialized || isLoading}
        className="w-full"
      >
        {isLoading ? 'Running Test...' : 'Run Agent Test'}
      </Button>

      {testResult && (
        <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
} 