import PDFParser from 'pdf2json';

export async function parsePDF(buffer: Buffer): Promise<string> {
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
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('Error initializing PDF parser:', error);
      reject(new Error(`Failed to initialize PDF parser: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
} 