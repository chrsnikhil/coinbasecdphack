'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

export function X402PaymentDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { address, isConnected } = useAccount();

  const testAgentPayment = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      // Simulate a task review that triggers an agent payment
      console.log('Testing agent payment via task review...');
      
      // Call the agent API to process payment
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processPayment',
          params: {
            taskId: 999, // Test task ID
            amount: '0.001', // 0.001 ETH
            recipient: address // Pay to connected wallet
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process agent payment');
      }

      const data = await response.json();
      console.log('Agent payment result:', data);

      if (data.payment?.success) {
        setResult(`✅ Payment successful!\nTransaction: ${data.payment.transactionHash}\nAmount: 0.001 ETH\nRecipient: ${address}`);
        toast.success('Agent payment completed successfully!');
      } else {
        setResult(`❌ Payment failed: ${data.payment?.error || 'Unknown error'}`);
        toast.error('Agent payment failed');
      }

    } catch (error) {
      console.error('Error testing agent payment:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to test agent payment');
    } finally {
      setIsLoading(false);
    }
  };

  const testTaskReviewWithPayment = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      console.log('Testing task review with agent payment...');
      
      // Call the agent API to review a task and trigger payment
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reviewTask',
          params: {
            taskId: 999,
            taskDescription: 'Create a simple React component',
            submissionData: {
              fileName: 'component.tsx',
              fileType: 'text/typescript',
              ipfsHash: 'QmTestHash123',
              content: 'import React from "react";\n\nexport const TestComponent = () => {\n  return <div>Hello World</div>;\n};'
            },
            payToAddress: address // This will trigger the payment
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to review task');
      }

      const data = await response.json();
      console.log('Task review with payment result:', data);

      let resultText = '📝 Task Review Completed\n\n';
      
      if (data.review?.review) {
        resultText += `Review: ${JSON.stringify(data.review.review, null, 2)}\n\n`;
      }

      if (data.review?.payment) {
        if (data.review.payment.success) {
          resultText += `💰 Payment: ✅ Success\nTransaction: ${data.review.payment.transactionHash}\nAmount: 0.001 ETH`;
          toast.success('Task reviewed and payment sent!');
        } else {
          resultText += `💰 Payment: ❌ Failed\nError: ${data.review.payment.error}`;
          toast.warning('Task reviewed but payment failed');
        }
      } else {
        resultText += '💰 Payment: Not processed';
      }

      setResult(resultText);

    } catch (error) {
      console.error('Error testing task review with payment:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to test task review');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white shadow-lg">
      <h2 className="text-2xl font-bold mb-4">X402 Agent Payment Demo</h2>
      <p className="text-gray-600 mb-6">
        Test the AI agent's ability to make payments using the x402 protocol when reviewing tasks.
      </p>

      <div className="space-y-4 mb-6">
        <Button
          onClick={testAgentPayment}
          disabled={isLoading || !isConnected}
          className="w-full"
        >
          {isLoading ? 'Processing...' : 'Test Direct Agent Payment'}
        </Button>

        <Button
          onClick={testTaskReviewWithPayment}
          disabled={isLoading || !isConnected}
          className="w-full"
          variant="outline"
        >
          {isLoading ? 'Processing...' : 'Test Task Review + Payment'}
        </Button>
      </div>

      {!isConnected && (
        <p className="text-amber-600 text-sm mb-4">
          ⚠️ Please connect your wallet to test agent payments
        </p>
      )}

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap text-gray-700">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p>💡 <strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Agent reviews task submissions using AI</li>
          <li>On successful review, agent automatically pays reviewer using x402</li>
          <li>Payment is made from agent's wallet to specified address</li>
          <li>All transactions happen on Base Sepolia testnet</li>
        </ul>
      </div>
    </div>
  );
}