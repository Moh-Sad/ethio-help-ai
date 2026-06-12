import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTRACTOR_PATH = path.join(__dirname, 'extractor.py');

/**
 * Extracts text from a document (PDF, DOCX, PPTX, DOC, PPT) using our Python utility.
 * 
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} Extracted text content
 */
export function extractTextFromFile(filePath) {
  return new Promise((resolve, reject) => {
    // Run the python script with the file path as an argument
    // Increased maxBuffer to 10MB to handle large document extractions
    execFile('python3', [EXTRACTOR_PATH, filePath], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Extractor execution error:', error);
        console.error('Extractor stderr:', stderr);
        return reject(new Error(stderr || error.message || 'Failed to extract text from file.'));
      }
      resolve(stdout.trim());
    });
  });
}
