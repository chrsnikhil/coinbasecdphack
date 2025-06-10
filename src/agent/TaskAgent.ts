import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AgentConfig, initializeModel } from './config';

export class TaskAgent {
  private model: ChatOpenAI;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.model = initializeModel(config);
  }

  async reviewTaskSubmission(taskId: number, submission: {
    taskDescription: string;
    submission: {
      content: string;
      fileName: string;
      fileType: string;
      ipfsHash: string;
    };
  }) {
    try {
      console.log('Starting task review...');
      console.log('Task ID:', taskId);
      console.log('Task Description:', submission.taskDescription);
      console.log('File Name:', submission.submission.fileName);
      console.log('File Type:', submission.submission.fileType);
      console.log('IPFS Hash:', submission.submission.ipfsHash);

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

        Format your response as a JSON object with the following structure:
        {
          "codeQuality": {
            "score": number,
            "feedback": string
          },
          "functionality": {
            "score": number,
            "feedback": string
          },
          "bestPractices": {
            "score": number,
            "feedback": string
          },
          "security": {
            "score": number,
            "feedback": string
          },
          "performance": {
            "score": number,
            "feedback": string
          },
          "overallAssessment": {
            "score": number,
            "feedback": string
          }
        }
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
        review = JSON.parse(reviewResponse.content.toString());
      } catch (error) {
        console.error('Failed to parse review response:', error);
        review = {
          error: 'Failed to parse review response',
          rawResponse: reviewResponse.content
        };
      }

      return {
        review
      };
    } catch (error) {
      console.error('Error in reviewTaskSubmission:', error);
      throw new Error(`Failed to review task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 