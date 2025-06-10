import axios from 'axios';
import { parsePDF } from './pdfUtils';

export async function fetchFileContent(ipfsHash: string, fileName: string): Promise<string> {
  try {
    console.log(`Fetching file from IPFS: ${ipfsHash}`);
    
    // Fetch the file from IPFS
    const response = await axios.get(
      `https://pink-fantastic-cod-307.mypinata.cloud/ipfs/${ipfsHash}`,
      { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 second timeout
      }
    );

    const buffer = Buffer.from(response.data);
    console.log(`File fetched successfully. Size: ${buffer.length} bytes`);

    // Handle different file types
    if (fileName.toLowerCase().endsWith('.pdf')) {
      try {
        console.log('Parsing PDF content...');
        const text = await parsePDF(buffer);
        console.log('PDF parsed successfully');
        return text;
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError);
        return `[Error parsing PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}]`;
      }
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      console.log('Reading text file...');
      return buffer.toString('utf-8');
    } else {
      console.log(`Unsupported file type: ${fileName}`);
      return `[File type not supported for content extraction: ${fileName}]`;
    }
  } catch (error) {
    console.error('Error fetching file content:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `[Error fetching file: ${error.response.status} ${error.response.statusText}]`;
      } else if (error.request) {
        return '[Error: No response received from IPFS gateway]';
      }
    }
    return `[Error fetching file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
} 