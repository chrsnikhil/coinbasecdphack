import { NextResponse } from 'next/server';
import { x402Middleware } from '@/utils/x402Middleware';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { taskContract } from '@/contracts/taskContract';

// Create a wallet client
const client = createWalletClient({
  chain: baseSepolia,
  transport: http()
});

export async function POST(request: Request) {
  try {
    // Apply x402 middleware
    const middlewareResponse = await x402Middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Clone the request to read the body again
    const clonedRequest = request.clone();
    let body;
    try {
      body = await clonedRequest.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { taskId, submission, account } = body;

    if (!taskId || !submission || !account) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Return the data needed for the frontend to make the contract call
    return NextResponse.json({
      success: true,
      data: {
        taskId,
        ipfsHash: submission.ipfsHash,
        account
      }
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 