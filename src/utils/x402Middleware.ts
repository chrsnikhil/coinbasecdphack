import { NextResponse } from 'next/server';

export async function x402Middleware(request: Request) {
  try {
    console.log('x402Middleware: Starting request processing');
    
    // Get the request method
    const method = request.method;
    console.log('x402Middleware: Request method:', method);

    // Only process POST requests
    if (method === 'POST') {
      console.log('x402Middleware: Processing POST request');
      
      // Clone the request to read the body
      const clonedRequest = request.clone();
      let body;
      try {
        body = await clonedRequest.json();
        console.log('x402Middleware: Request body:', body);
      } catch (error) {
        console.error('x402Middleware: Error parsing request body:', error);
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }

      // Get file size from either direct request or submission object
      let fileSize = body.fileSize;
      if (body.submission && body.submission.fileSize) {
        fileSize = body.submission.fileSize;
      }

      console.log('x402Middleware: File size:', fileSize);

      if (fileSize) {
        const fileSizeInGB = fileSize / (1024 * 1024 * 1024);
        console.log('x402Middleware: File size in GB:', fileSizeInGB);

        // Calculate cost based on file size
        const costPerGB = 0.0001; // $0.0001 per GB
        const cost = fileSizeInGB * costPerGB;
        console.log('x402Middleware: Calculated cost:', cost);

        // Create response with x402 headers
        const response = NextResponse.json({ success: true });
        response.headers.set('x-402-payment-required', 'true');
        response.headers.set('x-402-payment-amount', cost.toString());
        response.headers.set('x-402-payment-currency', 'USD');
        response.headers.set('x-402-payment-description', 'File storage cost');
        return response;
      } else {
        // If fileSize is undefined, set a default cost
        const defaultCost = 0.00001;
        console.log('x402Middleware: Using default cost:', defaultCost);
        const response = NextResponse.json({ success: true });
        response.headers.set('x-402-payment-required', 'true');
        response.headers.set('x-402-payment-amount', defaultCost.toString());
        response.headers.set('x-402-payment-currency', 'USD');
        response.headers.set('x-402-payment-description', 'Default file storage cost');
        return response;
      }
    }

    // For non-POST requests, return a success response
    console.log('x402Middleware: Proceeding to next middleware');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('x402Middleware: Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 