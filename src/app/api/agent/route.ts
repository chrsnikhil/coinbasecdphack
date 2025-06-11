import { NextResponse } from 'next/server';
import { TaskAgent } from '@/agent/TaskAgent';
import { defaultConfig } from '@/agent/config';
import { fetchFileContent } from '@/utils/fileUtils';

let agent: TaskAgent | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Initialize agent
async function initializeAgents() {
  if (isInitializing) {
    console.log('Initialization already in progress, waiting...');
    return initializationPromise;
  }

  if (agent) {
    console.log('Agent already initialized');
    return;
  }

  isInitializing = true;
  console.log('Starting agent initialization...');
  
  initializationPromise = (async () => {
    try {
      // Initialize TaskAgent for AI review
      console.log('Initializing TaskAgent...');
      agent = new TaskAgent(defaultConfig);
      console.log('TaskAgent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      agent = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
}

export async function GET() {
  try {
    await initializeAgents();
    if (!agent) {
      throw new Error('Agent not initialized');
    }
    return NextResponse.json({ status: 'Agent API is ready' });
  } catch (error) {
    console.error('Agent status check failed:', error);
    return NextResponse.json(
      { error: 'Agent API is not ready' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initializeAgents();
    if (!agent) {
      throw new Error('Agent not initialized');
    }

    const { action, params } = await request.json();
    console.log('Received agent action:', { action, params });
    
    console.log('\n=== AI Agent Interaction ===');
    console.log('Action:', action);
    console.log('Parameters:', JSON.stringify(params, null, 2));
    
    switch (action) {
      case 'reviewTask':
        console.log('\n--- Task Review Request ---');
        console.log('Task ID:', params.taskId);
        console.log('Task Description:', params.taskDescription);
        console.log('Submission Data:', JSON.stringify(params.submissionData, null, 2));
        console.log('Payment Address:', params.payToAddress || 'None provided');

        // Fetch and analyze file content
        let fileContent = '';
        try {
          console.log('\n--- Fetching File Content ---');
          if (!params.submissionData.ipfsHash) {
            throw new Error('No IPFS hash provided');
          }
          
          fileContent = await fetchFileContent(
            params.submissionData.ipfsHash,
            params.submissionData.fileName
          );
          
          if (fileContent.startsWith('[Error')) {
            console.warn('Warning: File content fetch resulted in an error:', fileContent);
          } else {
            console.log('File Content Length:', fileContent.length);
            console.log('First 500 characters:', fileContent.substring(0, 500));
          }
        } catch (error) {
          console.error('Error fetching file content:', error);
          fileContent = `[Error fetching file content: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        }

        // Review the submission with optional payment
        const review = await agent.reviewTaskSubmission(params.taskId, {
          taskDescription: params.taskDescription,
          submission: {
            ...params.submissionData,
            content: fileContent
          }
        }, params.payToAddress);

        // Log the review response before returning
        console.log('Review response to be sent:', JSON.stringify(review, null, 2));

        return NextResponse.json({ review });

      case 'processPayment':
        console.log('\n--- Payment Processing Request ---');
        console.log('Task ID:', params.taskId);
        console.log('Amount:', params.amount);
        console.log('Recipient:', params.recipient);

        try {
          // Use the agent's payment handler directly
          const paymentResult = await agent.processPayment(params.taskId, params.amount, params.recipient);
          return NextResponse.json({ payment: paymentResult });
        } catch (error) {
          console.error('Payment processing failed:', error);
          return NextResponse.json({
            error: 'Payment processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Agent action failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute agent action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 