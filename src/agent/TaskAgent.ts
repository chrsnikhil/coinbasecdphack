import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AgentConfig, initializeModel } from './config';
import type { AgentKit, CdpV2WalletProvider, WalletProvider } from '@coinbase/agentkit';

export class TaskAgent {
  private model: ChatOpenAI;
  private agentKit: AgentKit | null = null;
  private walletProvider: WalletProvider | null = null;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.model = initializeModel(config);
    this.initializeAgentKit().catch(console.error);
  }

  private async initializeAgentKit() {
    try {
      console.log('Initializing AgentKit with config:', {
        hasApiKeyId: !!this.config.cdpApiKeyId,
        hasApiKeySecret: !!this.config.cdpApiKeySecret,
        hasWalletSecret: !!this.config.cdpWalletSecret,
        networkId: this.config.networkId
      });

      if (!this.config.cdpApiKeyId || !this.config.cdpApiKeySecret || !this.config.cdpWalletSecret) {
        console.warn('CDP credentials not configured. Wallet features will be disabled.');
        return;
      }

      const cdpWalletConfig = {
        apiKeyId: this.config.cdpApiKeyId,
        apiKeySecret: this.config.cdpApiKeySecret,
        walletSecret: this.config.cdpWalletSecret,
        networkId: this.config.networkId,
      };

      try {
        console.log('Attempting to import CDP wallet provider...');
        // Import the entire module first
        const agentkit = await import('@coinbase/agentkit');
        console.log('AgentKit module imported successfully');
        
        // Initialize the CDP wallet provider
        console.log('Configuring CDP wallet provider...');
        this.walletProvider = await agentkit.CdpV2WalletProvider.configureWithWallet(cdpWalletConfig);
        console.log('CDP wallet provider configured successfully');

        // Initialize AgentKit with the wallet provider
        console.log('Initializing AgentKit...');
        this.agentKit = await agentkit.AgentKit.from({
          walletProvider: this.walletProvider,
        });

        console.log('AgentKit initialized successfully');
      } catch (error) {
        console.error('Failed to initialize CDP components:', error);
        // Continue without CDP features
        this.agentKit = null;
        this.walletProvider = null;
      }
    } catch (error) {
      console.error('Failed to initialize AgentKit:', error);
      this.agentKit = null;
      this.walletProvider = null;
    }
  }

  async reviewTaskSubmission(taskId: number, submission: {
    taskDescription: string;
    submission: {
      content: string;
      fileName: string;
      fileType: string;
      ipfsHash: string;
    };
  }) {
    try {
      console.log('Starting task review...');
      console.log('Task ID:', taskId);
      console.log('Task Description:', submission.taskDescription);
      console.log('File Name:', submission.submission.fileName);
      console.log('File Type:', submission.submission.fileType);
      console.log('IPFS Hash:', submission.submission.ipfsHash);

      // Create the review prompt
      const reviewPrompt = PromptTemplate.fromTemplate(`
        You are an expert task reviewer. Review the following task submission:

        Task Description: {taskDescription}
        
        Submission Content:
        {content}

        Please provide a detailed review covering:
        1. Code Quality and Structure
        2. Functionality and Requirements
        3. Best Practices
        4. Security Considerations
        5. Performance
        6. Overall Assessment

        Format your response as a JSON object with the following structure:
        {
          "codeQuality": {
            "score": number,
            "feedback": string
          },
          "functionality": {
            "score": number,
            "feedback": string
          },
          "bestPractices": {
            "score": number,
            "feedback": string
          },
          "security": {
            "score": number,
            "feedback": string
          },
          "performance": {
            "score": number,
            "feedback": string
          },
          "overallAssessment": {
            "score": number,
            "feedback": string
          }
        }
      `);

      // Format the prompt
      const formattedPrompt = await reviewPrompt.format({
        taskDescription: submission.taskDescription,
        content: submission.submission.content
      });

      // Get the review from the model
      const reviewResponse = await this.model.invoke(formattedPrompt);
      console.log('Review completed successfully');

      // Parse the review response
      let review;
      try {
        review = JSON.parse(reviewResponse.content.toString());
      } catch (error) {
        console.error('Failed to parse review response:', error);
        review = {
          error: 'Failed to parse review response',
          rawResponse: reviewResponse.content
        };
      }

      // Get wallet details if wallet provider is initialized
      let walletDetails = null;
      if (this.walletProvider) {
        try {
          const address = await this.walletProvider.getAddress();
          const network = await this.walletProvider.getNetwork();
          walletDetails = {
            address,
            network,
            name: await this.walletProvider.getName()
          };
        } catch (error) {
          console.error('Failed to get wallet details:', error);
        }
      }

      return {
        review,
        walletVerification: walletDetails
      };
    } catch (error) {
      console.error('Error in reviewTaskSubmission:', error);
      throw new Error(`Failed to review task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processPayment(taskId: string, amount: string, recipient: string) {
    if (!this.agentKit || !this.walletProvider) {
      throw new Error('CDP features are not available. Please check your configuration.');
    }

    try {
      // Use the wallet provider to send the transaction
      const tx = await this.walletProvider.sendTransaction({
        to: recipient,
        value: amount,
        network: this.config.networkId
      });

      return {
        transactionHash: tx.hash,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error in processPayment:', error);
      throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Monitor task status
  async getTaskStatus(taskId: string) {
    if (!this.agentKit) {
      throw new Error('CDP features are not available. Please check your configuration.');
    }

    try {
      // Use Coinbase Agent for task monitoring
      const status = await this.agentKit?.getTaskStatus({
        taskId: taskId
      });

      return status;
    } catch (error) {
      console.error('Task monitoring error:', error);
      throw error;
    }
  }

  // Handle dispute resolution
  async resolveDispute(taskId: string, resolution: string) {
    if (!this.agentKit) {
      throw new Error('CDP features are not available. Please check your configuration.');
    }

    try {
      // Use Coinbase Agent for dispute resolution
      const result = await this.agentKit?.resolveDispute({
        taskId: taskId,
        resolution: resolution
      });

      return result;
    } catch (error) {
      console.error('Dispute resolution error:', error);
      throw error;
    }
  }
} 