import { createWalletClient, createPublicClient, http, parseEther, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export interface PaymentConfig {
  recipientAddress: string;
  amount: string; // Amount in ETH
  reason: string;
}

export class PaymentService {
  private walletClient;
  private publicClient;
  private account;

  constructor() {
    // Get private key from environment
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required');
    }

    // Create account from private key
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create wallet client
    this.walletClient = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });

    // Create public client for reading data
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });
  }

  /**
   * Send payment to a wallet address
   */
  async sendPayment(config: PaymentConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      console.log('Initiating payment:', {
        from: this.account.address,
        to: config.recipientAddress,
        amount: config.amount,
        reason: config.reason
      });

      // Validate recipient address
      const recipientAddress = getAddress(config.recipientAddress);
      
      // Parse amount to wei
      const value = parseEther(config.amount);

      // Send the transaction
      const hash = await this.walletClient.sendTransaction({
        to: recipientAddress,
        value: value,
        data: '0x', // Empty data for simple ETH transfer
      });

      console.log('Payment sent successfully:', {
        transactionHash: hash,
        amount: config.amount,
        recipient: recipientAddress,
        reason: config.reason
      });

      return {
        success: true,
        transactionHash: hash
      };

    } catch (error) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    try {
      const balance = await this.publicClient.getBalance({
        address: this.account.address
      });
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.account.address;
  }
}

// Singleton instance
let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}
