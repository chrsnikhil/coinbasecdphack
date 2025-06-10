import axios from 'axios';
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

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
}: {
  taskDescription: string;
  fileName: string;
  fileType: string;
  ipfsHash: string;
  content: string;
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
    return {
      success: true,
      review: result,
    };
  } catch (error) {
    console.error("Error in AI review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review submission",
    };
  }
} 