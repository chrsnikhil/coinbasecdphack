import { NextResponse } from 'next/server';
import { TaskAgent } from '@/agent/TaskAgent';
import { defaultConfig } from '@/agent/config';
import { fetchFileContent } from '@/utils/fileUtils';
import type { AgentKit, CdpWalletProvider, WalletProvider } from '@coinbase/agentkit';

let agent: TaskAgent | null = null;
let agentKit: AgentKit | null = null;
let walletProvider: WalletProvider | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Initialize agent and AgentKit
async function initializeAgents() {
  if (isInitializing) {
    console.log('Initialization already in progress, waiting...');
    return initializationPromise;
  }

  if (agent) {
    console.log('TaskAgent already initialized');
    return;
  }

  isInitializing = true;
  console.log('Starting agent initialization...');
  
  initializationPromise = (async () => {
    try {
      console.log('Environment variables status:', {
        hasApiKeyId: !!process.env.NEXT_PUBLIC_CDP_API_KEY_ID,
        hasApiKeySecret: !!process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET,
        hasWalletSecret: !!process.env.NEXT_PUBLIC_CDP_WALLET_SECRET,
        networkId: process.env.NEXT_PUBLIC_NETWORK_ID || 'base-sepolia'
      });
      
      // Initialize TaskAgent for AI review
      console.log('Initializing TaskAgent...');
      agent = new TaskAgent(defaultConfig);
      console.log('TaskAgent initialized successfully');
      
      // Temporarily disable CDP wallet initialization due to Twitter dependency issue
      console.warn('CDP wallet initialization is temporarily disabled due to Twitter dependency conflicts.');
      console.warn('AI review functionality will work, but payment processing will be unavailable.');
      
      // Set wallet features to null for now
      agentKit = null;
      walletProvider = null;

      // TODO: Re-enable this once the Twitter dependency issue is resolved
      /*
      // Initialize AgentKit for blockchain operations
      const cdpWalletConfig = {
        apiKeyId: process.env.NEXT_PUBLIC_CDP_API_KEY_ID,
        apiKeySecret: process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET,
        walletSecret: process.env.NEXT_PUBLIC_CDP_WALLET_SECRET,
        networkId: process.env.NEXT_PUBLIC_NETWORK_ID || 'base-sepolia',
      };

      // Check if CDP credentials are configured
      if (!cdpWalletConfig.apiKeyId || !cdpWalletConfig.apiKeySecret || !cdpWalletConfig.walletSecret) {
        console.warn('CDP credentials not configured. Wallet features will be disabled.');
        console.warn('Missing credentials:', {
          missingApiKeyId: !cdpWalletConfig.apiKeyId,
          missingApiKeySecret: !cdpWalletConfig.apiKeySecret,
          missingWalletSecret: !cdpWalletConfig.walletSecret
        });
        return;
      }

      try {
        console.log('Attempting to import CDP wallet provider...');
        // Set environment variables to disable Twitter functionality before importing
        const originalTwitter = process.env.TWITTER_API_KEY;
        process.env.TWITTER_API_KEY = '';
        
        // Import only the specific components we need
        const { CdpWalletProvider, AgentKit } = await import('@coinbase/agentkit');
        console.log('AgentKit components imported successfully');
        
        // Restore original environment
        if (originalTwitter) {
          process.env.TWITTER_API_KEY = originalTwitter;
        } else {
          delete process.env.TWITTER_API_KEY;
        }
        
        // Initialize the CDP wallet provider
        console.log('Configuring CDP wallet provider...');
        walletProvider = await CdpWalletProvider.configureWithWallet(cdpWalletConfig);
        console.log('CDP wallet provider configured successfully');

        // Initialize AgentKit with the wallet provider
        console.log('Initializing AgentKit...');
        agentKit = await AgentKit.from({
          walletProvider,
        });

        console.log('TaskAgent and AgentKit initialized successfully');
      } catch (error) {
        console.error('Failed to initialize CDP components:', error);
        // Continue without CDP features
        agentKit = null;
        walletProvider = null;
      }
      */
    } catch (error) {
      console.error('Failed to initialize agents:', error);
      // Set all agents to null to prevent partial initialization
      agent = null;
      agentKit = null;
      walletProvider = null;
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
      throw new Error('TaskAgent not initialized');
    }
    return NextResponse.json({ 
      status: 'Agent API is ready', 
      features: {
        aiReview: true,
        walletOperations: false,
        note: 'Wallet features temporarily disabled due to dependency conflicts'
      }
    });
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
      throw new Error('TaskAgent not initialized');
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

        // Get wallet details for verification (placeholder since wallet is disabled)
        const walletDetails = {
          address: 'N/A - Wallet features disabled',
          network: 'N/A - Wallet features disabled',
          name: 'N/A - Wallet features disabled'
        };

        // Review the submission
        const review = await agent.reviewTaskSubmission(params.taskId, {
          taskDescription: params.taskDescription,
          submission: {
            ...params.submissionData,
            content: fileContent
          }
        });

        return NextResponse.json({
          review,
          walletVerification: walletDetails
        });

      case 'processPayment':
        return NextResponse.json(
          { 
            error: 'Payment processing is temporarily disabled due to wallet dependency conflicts',
            message: 'Please use alternative payment methods for now'
          },
          { status: 503 }
        );

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