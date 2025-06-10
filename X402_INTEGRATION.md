# X402 Agent Payment Integration

This document explains how the x402-next library has been integrated into the freelance platform to enable AI agents to make payments when reviewing tasks.

## Overview

The integration allows AI agents to automatically send ETH payments to specified wallet addresses as a reward/proof-of-concept when they successfully review task submissions. This demonstrates the x402 protocol's capability for automated, programmable payments.

## Architecture

### Components

1. **PaymentService** (`src/utils/paymentService.ts`)
   - Core payment functionality using viem
   - Manages agent wallet and ETH transfers
   - Handles payment execution on Base Sepolia testnet

2. **X402PaymentHandler** (`src/utils/x402PaymentHandler.ts`)
   - X402 protocol wrapper around PaymentService
   - Provides payment creation and status tracking
   - Specific methods for task review payments

3. **TaskAgent** (`src/agent/TaskAgent.ts`)
   - Updated to include payment capabilities
   - Automatically triggers payments after successful reviews
   - Integrates with x402PaymentHandler

4. **LangChain Service** (`src/utils/langchainService.ts`)
   - Enhanced to support payment addresses
   - Triggers payments for approved reviews
   - Uses Akash API for AI review processing

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required: Akash API key for AI reviews
NEXT_PUBLIC_AKASH_API_KEY=your_akash_api_key_here

# Required: Agent wallet private key for payments
AGENT_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Optional: Test recipient address
TEST_RECIPIENT_ADDRESS=0x4c8bbcfc6DaE447228FcbB220C1DD4cae623EaaF
```

### 2. Agent Wallet Setup

1. Create a new wallet for the agent on Base Sepolia testnet
2. Add the private key to `AGENT_PRIVATE_KEY` environment variable
3. Fund the wallet with test ETH from Base Sepolia faucet
4. Ensure the wallet has sufficient balance for payments (recommended: 0.1+ ETH)

### 3. Test the Integration

Use the X402PaymentDemo component on the main page to test:

1. **Direct Agent Payment**: Tests the agent's ability to send payments
2. **Task Review + Payment**: Tests the full flow of AI review followed by payment

## Usage Examples

### 1. Task Review with Payment

```typescript
// Agent API call with payment address
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reviewTask',
    params: {
      taskId: 1,
      taskDescription: 'Create a React component',
      submissionData: {
        fileName: 'component.tsx',
        fileType: 'text/typescript',
        ipfsHash: 'QmTestHash123'
      },
      payToAddress: '0x4c8bbcfc6DaE447228FcbB220C1DD4cae623EaaF' // Payment recipient
    }
  })
});
```

### 2. Direct Payment

```typescript
// Direct payment through agent
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'processPayment',
    params: {
      taskId: 1,
      amount: '0.001', // ETH amount
      recipient: '0x4c8bbcfc6DaE447228FcbB220C1DD4cae623EaaF'
    }
  })
});
```

## Payment Flow

1. **Task Submission**: User submits work for review
2. **AI Review**: Agent analyzes submission using Akash API
3. **Payment Trigger**: If review is successful and payment address provided:
   - Agent creates x402 payment
   - Sends 0.001 ETH to specified address
   - Returns transaction hash and payment details
4. **Response**: Returns both review results and payment status

## Payment Configuration

- **Default Payment Amount**: 0.001 ETH per successful review
- **Network**: Base Sepolia Testnet
- **Payment Currency**: ETH
- **Payment Trigger**: Successful AI review (APPROVE recommendation)

## Security Considerations

1. **Private Key Management**: Agent private key should be securely stored
2. **Payment Limits**: Consider implementing payment limits per time period
3. **Wallet Balance**: Monitor agent wallet balance to ensure sufficient funds
4. **Validation**: Validate recipient addresses before sending payments

## Troubleshooting

### Common Issues

1. **Payment Fails**:
   - Check agent wallet balance
   - Verify recipient address format
   - Ensure Base Sepolia RPC is accessible

2. **Review Works but Payment Fails**:
   - Review will complete successfully
   - Payment error is logged but doesn't affect review
   - Check agent wallet and network status

3. **Environment Variables**:
   - Ensure `AGENT_PRIVATE_KEY` is set correctly
   - Verify Akash API key is valid
   - Check that private key format includes '0x' prefix

### Testing

1. Use the X402PaymentDemo component for testing
2. Monitor browser console for detailed logs
3. Check Base Sepolia explorer for transaction confirmation
4. Verify agent wallet balance before and after payments

## API Endpoints

- `POST /api/agent` - Main agent API for reviews and payments
- `POST /api/tasks/review` - Alternative review endpoint (legacy)
- `POST /api/tasks/submit` - Task submission with x402 middleware

## Dependencies

- `x402-next`: X402 protocol integration
- `viem`: Ethereum interaction library
- `wagmi`: React hooks for Ethereum
- `@langchain/core`: AI prompt templates
- `axios`: HTTP client for Akash API

## Future Enhancements

1. **Payment Scheduling**: Implement delayed payments
2. **Multi-token Support**: Support ERC-20 token payments
3. **Payment Escrow**: Hold payments until review confirmation
4. **Dynamic Pricing**: Adjust payment amounts based on task complexity
5. **Payment Analytics**: Track payment history and statistics