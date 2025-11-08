// Content extraction using Readability.js
import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  siteName: string | null;
}

export async function extractPageContent(tabId: number): Promise<ExtractedContent | null> {
  try {
    // Inject script to get page HTML
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Clone the document for Readability
        const documentClone = document.cloneNode(true) as Document;
        
        // Use Readability to parse
        const article = new (window as any).Readability(documentClone).parse();
        
        return article;
      }
    });

    if (results && results[0]?.result) {
      return results[0].result as ExtractedContent;
    }

    return null;
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
}

// Inject Readability library into the page
export async function injectReadability(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['readability.min.js']
    });
    return true;
  } catch (error) {
    console.error('Error injecting Readability:', error);
    return false;
  }
}

