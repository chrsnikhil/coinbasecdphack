import { NextResponse } from 'next/server';
import axios from 'axios';
import PDFParser from 'pdf2json';
import { publicClient } from '@/utils/viem';
import { contractConfig } from '@/config/contractConfig';

// Validate Akash API key
function validateAkashKey() {
  const apiKey = process.env.NEXT_PUBLIC_AKASH_API_KEY;
  console.log('Validating Akash API key...');
  console.log('API Key exists:', !!apiKey);
  console.log('API Key format:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}` : 'none');
  
  if (!apiKey) {
    throw new Error('Akash API key is not configured. Please check your environment variables.');
  }
  return apiKey;
}

const akashClient = axios.create({
  baseURL: 'https://chatapi.akash.network/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${validateAkashKey()}`
  }
});

// Maximum content length in characters (approximately 100k tokens)
const MAX_CONTENT_LENGTH = 400000;

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Parsing PDF document...');
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log('PDF parsed successfully');
          const text = pdfData.Pages.map((page: any) => {
            return page.Texts.map((text: any) => {
              return decodeURIComponent(text.R[0].T);
            }).join('');
          }).join('\n\n');

          // Clean up the text
          const cleanedText = text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/([a-z])\s+([A-Z])/g, '$1 $2') // Fix spacing between words
            .replace(/([0-9])\s+([0-9])/g, '$1$2') // Fix spacing between numbers
            .replace(/([A-Z])\s+([A-Z])/g, '$1$2') // Fix spacing between capital letters
            .replace(/\s+([.,!?])/g, '$1') // Fix spacing before punctuation
            .trim();

          resolve(cleanedText || '[No text content found in PDF]');
        } catch (error) {
          console.error('Error processing PDF data:', error);
          reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      pdfParser.on('pdfParser_dataError', (error: any) => {
        console.error('Error parsing PDF:', error);
        reject(new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
      });

      // Parse the PDF buffer
      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      console.error('Error initializing PDF parser:', error);
      reject(new Error(`Failed to initialize PDF parser: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function POST(request: Request) {
  try {
    console.log('Starting review process...');
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { taskId, ipfsHash, account } = body;

    if (!taskId || !ipfsHash || !account) {
      console.error('Missing required fields:', { taskId, ipfsHash, account });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get task details from the contract
    console.log('Fetching task details from contract...');
    const taskDetails = await publicClient.readContract({
      ...contractConfig,
      functionName: 'getTask',
      args: [BigInt(taskId)],
    });

    const taskDescription = taskDetails[2]; // description is the third element in the returned array
    console.log('Task description:', taskDescription);

    // Get file content from IPFS
    console.log('Fetching file from IPFS:', ipfsHash);
    const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
    if (!ipfsResponse.ok) {
      console.error('IPFS fetch failed:', {
        status: ipfsResponse.status,
        statusText: ipfsResponse.statusText
      });
      throw new Error('Failed to fetch file from IPFS');
    }

    // Get the file as Buffer
    const fileBuffer = Buffer.from(await ipfsResponse.arrayBuffer());
    
    // Extract text from PDF
    console.log('Extracting text from PDF...');
    let fileContent = await extractTextFromPDF(fileBuffer);
    
    // Limit content size
    if (fileContent.length > MAX_CONTENT_LENGTH) {
      console.log(`Content too large (${fileContent.length} chars), truncating to ${MAX_CONTENT_LENGTH} chars`);
      fileContent = fileContent.substring(0, MAX_CONTENT_LENGTH) + '\n... (content truncated)';
    }

    console.log('File content length:', fileContent.length);
    console.log('First 100 characters of file:', fileContent.substring(0, 100));

    // Prepare Akash API request
    const reviewPrompt = `You are a task reviewer. Review the submitted work and determine if it meets the requirements. Respond with a JSON object containing 'approved' (boolean) and 'feedback' (string).

Task Description:
${taskDescription}

Submitted Work:
${fileContent}

Please review if the submitted work meets the requirements specified in the task description. Be lenient in your evaluation - if the work generally matches the requirements, even if there are minor differences in formatting or additional details, it should be approved. Only reject if there are significant mismatches with the core requirements.`;

    const requestBody = {
      model: "Meta-Llama-3-1-8B-Instruct-FP8",
      messages: [
        {
          role: "user",
          content: reviewPrompt
        }
      ]
    };
    
    console.log('Sending request to Akash API:', JSON.stringify(requestBody, null, 2));
    console.log('Request headers:', JSON.stringify(akashClient.defaults.headers, null, 2));

    // Get AI review from Akash
    const response = await akashClient.post('/chat/completions', requestBody);
    console.log('Akash API response status:', response.status);
    console.log('Akash API response headers:', JSON.stringify(response.headers, null, 2));
    console.log('Akash API response data:', JSON.stringify(response.data, null, 2));

    const review = response.data.choices[0].message.content;
    if (!review) {
      console.error('No review content in response');
      throw new Error('No review received from AI');
    }

    // Parse the review response
    console.log('Parsing review response:', review);
    let reviewData;
    try {
      // First try parsing as is
      reviewData = JSON.parse(review);
    } catch (error) {
      // If that fails, try to extract JSON from markdown code block
      const jsonMatch = review.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          reviewData = JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.error('Failed to parse JSON from markdown:', innerError);
          throw new Error('Invalid review format received from AI');
        }
      } else {
        console.error('No valid JSON found in response');
        throw new Error('Invalid review format received from AI');
      }
    }
    console.log('Parsed review data:', JSON.stringify(reviewData, null, 2));

    return NextResponse.json({
      approved: reviewData.approved,
      feedback: reviewData.feedback,
      taskId,
      ipfsHash,
      account
    });
  } catch (error) {
    console.error('Review error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });

      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Akash API credentials' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review failed' },
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