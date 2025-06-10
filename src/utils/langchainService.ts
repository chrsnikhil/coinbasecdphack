import axios from 'axios';
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { getPaymentService } from './paymentService';
import { X402PaymentHandler } from './x402PaymentHandler';

const reviewSchema = z.object({
  quality: z.number().min(1).max(10).describe("Quality score from 1-10"),
  meetsRequirements: z.boolean().describe("Whether the submission meets the task requirements"),
  feedback: z.string().describe("Detailed feedback about the submission"),
  recommendation: z.enum(["APPROVE", "REJECT"]).describe("Final recommendation"),
});

const parser = StructuredOutputParser.fromZodSchema(reviewSchema);

const reviewPrompt = PromptTemplate.fromTemplate(`
You are an expert task reviewer. Review the following task submission:

Task Description:
{taskDescription}

Submission Details:
- File Name: {fileName}
- File Type: {fileType}
- IPFS Hash: {ipfsHash}
- Additional Content: {content}

Please review the submission and provide:
1. A quality score (1-10)
2. Whether it meets the requirements
3. Detailed feedback
4. A final recommendation (APPROVE or REJECT)

{format_instructions}
`);

export async function reviewTaskSubmission({
  taskDescription,
  fileName,
  fileType,
  ipfsHash,
  content,
  payToAddress,
}: {
  taskDescription: string;
  fileName: string;
  fileType: string;
  ipfsHash: string;
  content: string;
  payToAddress?: string;
}) {
  try {
    console.log('Initializing Akash API client...');
    const client = axios.create({
      baseURL: 'https://chatapi.akash.network/api/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AKASH_API_KEY}`
      }
    });

    // Format the prompt
    const formattedPrompt = await reviewPrompt.format({
      taskDescription,
      fileName,
      fileType,
      ipfsHash,
      content,
      format_instructions: parser.getFormatInstructions(),
    });

    console.log('Sending review request to Akash API...');
    const response = await client.post('/chat/completions', {
      model: "Meta-Llama-3-1-8B-Instruct-FP8",
      messages: [
        {
          role: "user",
          content: formattedPrompt
        }
      ],
      temperature: 0.7
    });

    console.log('Parsing review response...');
    const result = await parser.parse(response.data.choices[0].message.content);

    console.log('Review completed successfully');
    
    // Process x402 payment if address is provided and review was successful
    let paymentResult = null;
    if (payToAddress && result.recommendation === 'APPROVE') {
      console.log('Processing x402 payment for successful review...');
      try {
        const paymentService = getPaymentService();
        const x402Handler = new X402PaymentHandler(paymentService);
        
        paymentResult = await x402Handler.createPayment({
          amount: '0.001', // 0.001 ETH reward for review
          recipient: payToAddress,
          description: `AI Agent reward for task review (${fileName})`
        });
        
        console.log('X402 payment completed:', paymentResult);
      } catch (paymentError) {
        console.error('Payment failed but review completed:', paymentError);
        // Don't fail the entire review if payment fails
        paymentResult = {
          success: false,
          error: paymentError instanceof Error ? paymentError.message : 'Payment failed'
        };
      }
    }
    
    return {
      success: true,
      review: result,
      payment: paymentResult,
    };
  } catch (error) {
    console.error("Error in AI review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review submission",
    };
  }
}