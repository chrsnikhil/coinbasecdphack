import { NextResponse } from 'next/server';
import { getPaymentService } from '@/utils/paymentService';
import { X402PaymentHandler } from '@/utils/x402PaymentHandler';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('X402 Payment request:', body);
    
    const { action, amount, recipient, description, taskId } = body;

    if (!action || !amount || !recipient) {
      return NextResponse.json(
        { error: 'Missing required fields: action, amount, recipient' },
        { status: 400 }
      );
    }

    const paymentHandler = new X402PaymentHandler(getPaymentService());

    switch (action) {
      case 'createPayment':
        const paymentResult = await paymentHandler.createPayment({
          amount,
          recipient,
          description: description || 'X402 payment'
        });

        return NextResponse.json({
          success: paymentResult.success,
          transactionHash: paymentResult.transactionHash,
          error: paymentResult.error,
          paymentDetails: paymentResult.paymentDetails
        });

      case 'payForReview':
        if (!taskId) {
          return NextResponse.json(
            { error: 'taskId is required for review payment' },
            { status: 400 }
          );
        }

        const reviewPaymentResult = await paymentHandler.payForTaskReview(
          taskId,
          recipient
        );

        return NextResponse.json({
          success: reviewPaymentResult.success,
          transactionHash: reviewPaymentResult.transactionHash,
          error: reviewPaymentResult.error
        });

      case 'getStatus':
        const { transactionHash } = body;
        if (!transactionHash) {
          return NextResponse.json(
            { error: 'transactionHash is required for status check' },
            { status: 400 }
          );
        }

        const status = await paymentHandler.getPaymentStatus(transactionHash);
        return NextResponse.json(status);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('X402 payment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const paymentService = getPaymentService();
    const balance = await paymentService.getBalance();
    const address = paymentService.getAddress();

    return NextResponse.json({
      status: 'X402 Payment API is ready',
      agentAddress: address,
      balance: balance.toString()
    });
  } catch (error) {
    console.error('X402 status check failed:', error);
    return NextResponse.json(
      { error: 'X402 Payment API is not ready' },
      { status: 500 }
    );
  }
}
