// PDF Utilities for text extraction

/**
 * Check if current page is a PDF
 */
export function isPDFPage(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf') || 
         url.includes('/pdf/') ||
         url.includes('type=pdf') ||
         document.contentType === 'application/pdf';
}

/**
 * Extract text from PDF blob using pdf.js (basic implementation)
 * For better extraction, consider using pdf.js library
 */
export async function extractTextFromPDFBlob(pdfBlob: Blob): Promise<{ text: string; pageCount: number }> {
  try {
    // For now, we'll use a simple approach
    // In production, you should use pdf.js library for better extraction
    
    // Convert blob to base64 for processing
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to extract text (basic approach)
    // This is a placeholder - in production use pdf.js
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(uint8Array);
    
    // Clean up the text (remove binary data)
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    
    // Estimate page count (very rough)
    const pageCount = Math.max(1, Math.floor(text.length / 2000));
    
    console.log(`📄 Extracted ${text.length} characters from PDF (${pageCount} estimated pages)`);
    
    return {
      text: text.substring(0, 50000), // Limit to 50k chars
      pageCount
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return {
      text: 'Unable to extract text from PDF',
      pageCount: 1
    };
  }
}

/**
 * Download PDF from URL
 */
export async function downloadPDFFromURL(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Get PDF metadata from blob
 */
export function getPDFMetadata(blob: Blob): { size: number; type: string } {
  return {
    size: blob.size,
    type: blob.type
  };
}

