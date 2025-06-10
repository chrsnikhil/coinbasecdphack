import { PaymentService, PaymentConfig } from './paymentService';

export interface X402PaymentOptions {
  amount: string; // Amount in ETH
  recipient: string; // Wallet address to pay
  description?: string;
}

export class X402PaymentHandler {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * Create a payment using x402 protocol
   */
  async createPayment(options: X402PaymentOptions): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
    paymentDetails?: any;
  }> {
    try {
      console.log('Creating x402 payment:', options);

      // Create payment configuration
      const paymentConfig: PaymentConfig = {
        recipientAddress: options.recipient,
        amount: options.amount,
        reason: options.description || 'AI Agent Task Review Payment'
      };

      // Execute the payment
      const result = await this.paymentService.sendPayment(paymentConfig);

      if (result.success) {
        console.log('X402 payment completed successfully:', {
          transactionHash: result.transactionHash,
          amount: options.amount,
          recipient: options.recipient
        });

        return {
          success: true,
          transactionHash: result.transactionHash,
          paymentDetails: {
            amount: options.amount,
            recipient: options.recipient,
            description: options.description,
            timestamp: new Date().toISOString(),
            agentAddress: this.paymentService.getAddress()
          }
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      console.error('X402 payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'X402 payment failed'
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
  }> {
    try {
      // This would typically query the blockchain for transaction status
      // For now, we'll return a simple status
      return {
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Failed to get payment status:', error);
      return {
        status: 'failed'
      };
    }
  }

  /**
   * Create payment for task review
   */
  async payForTaskReview(taskId: number, reviewerAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const paymentAmount = '0.001'; // 0.001 ETH as reward for review
    
    return this.createPayment({
      amount: paymentAmount,
      recipient: reviewerAddress,
      description: `Payment for reviewing task #${taskId} by AI Agent`
    });
  }
}