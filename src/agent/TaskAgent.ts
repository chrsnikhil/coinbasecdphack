import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AgentConfig, initializeModel } from './config';
import { getPaymentService } from '../utils/paymentService';
import { X402PaymentHandler } from '../utils/x402PaymentHandler';

export class TaskAgent {
  private model: ChatOpenAI;
  private config: AgentConfig;
  private paymentHandler: X402PaymentHandler;

  constructor(config: AgentConfig) {
    this.config = config;
    this.model = initializeModel(config);
    this.paymentHandler = new X402PaymentHandler(getPaymentService());
  }

  async reviewTaskSubmission(taskId: number, submission: {
    taskDescription: string;
    submission: {
      content: string;
      fileName: string;
      fileType: string;
      ipfsHash: string;
    };
  }, payToAddress?: string) {
    try {
      console.log('Starting task review...');
      console.log('Task ID:', taskId);
      console.log('Task Description:', submission.taskDescription);
      console.log('File Name:', submission.submission.fileName);
      console.log('File Type:', submission.submission.fileType);
      console.log('IPFS Hash:', submission.submission.ipfsHash);
      
      if (payToAddress) {
        console.log('Payment address provided:', payToAddress);
      }

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

        Format your response as a JSON object with the following structure. DO NOT include any comments or extraneous text within the JSON object. The response must be pure JSON.
        {{
          "codeQuality": {{
            "score": number,
            "feedback": string
          }},
          "functionality": {{
            "score": number,
            "feedback": string
          }},
          "bestPractices": {{
            "score": number,
            "feedback": string
          }},
          "security": {{
            "score": number,
            "feedback": string
          }},
          "performance": {{
            "score": number,
            "feedback": string
          }},
          "overallAssessment": {{
            "score": number,
            "feedback": string
          }},
          "overallStatus": "accepted" | "rejected"
        }}
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
        const rawContent = reviewResponse.content.toString();
        // Use regex to find a JSON object in the response, specifically looking for ```json ... ```
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonString = '';

        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1].trim();
        } else {
          // Fallback if no specific JSON block is found, try to parse the whole response (less robust)
          jsonString = rawContent.trim();
        }

        review = JSON.parse(jsonString);
      } catch (error) {
        console.error('Failed to parse review response:', error);
        review = {
          error: 'Failed to parse review response',
          rawResponse: reviewResponse.content,
        };
      }

      // Process payment if address is provided and review was successful
      let paymentResult = null;
      if (payToAddress && !review.error) {
        console.log('Processing x402 payment for task review...');
        try {
          paymentResult = await this.paymentHandler.payForTaskReview(taskId, payToAddress);
          console.log('Payment result:', paymentResult);
        } catch (paymentError) {
          console.error('Payment failed but review completed:', paymentError);
          // Don't fail the entire review if payment fails
        }
      }

      return {
        review,
        payment: paymentResult
      };
    } catch (error) {
      console.error('Error in reviewTaskSubmission:', error);
      throw new Error(`Failed to review task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a payment using the x402 payment handler
   */
  async processPayment(taskId: number, amount: string, recipient: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      console.log(`Processing payment for task ${taskId}: ${amount} ETH to ${recipient}`);
      
      const result = await this.paymentHandler.createPayment({
        amount,
        recipient,
        description: `Manual payment for task #${taskId}`
      });

      return result;
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }
}