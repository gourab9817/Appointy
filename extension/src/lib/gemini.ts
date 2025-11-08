// Gemini AI Integration for Screenshot OCR and PDF Summarization

const GEMINI_API_KEY = 'AIzaSyDUnJL_puVm5inxF4sw_6Gm4BhaSB6AXAc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Extract text from screenshot using Gemini Vision API
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-1.5-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Extract all visible text from this image. Return only the extracted text, without any additional commentary or formatting. If there is no text, return "No text found".'
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text extracted';
    
    console.log('✅ Text extracted from image:', extractedText.substring(0, 100) + '...');
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return 'Error extracting text';
  }
}

/**
 * Generate summary of PDF content using Gemini
 */
export async function generatePDFSummary(pdfText: string, title: string): Promise<string> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a professional document summarizer. Create a concise, informative summary (2-3 paragraphs) of the following PDF document titled "${title}". Focus on key points, main ideas, and important takeaways.\n\nDocument content:\n${pdfText.substring(0, 30000)}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary';
    
    console.log('✅ PDF summary generated:', summary.substring(0, 100) + '...');
    return summary;
  } catch (error) {
    console.error('Error generating PDF summary:', error);
    return 'Error generating summary. Please check the PDF content.';
  }
}

/**
 * Generate smart tags based on content using Gemini
 */
export async function generateSmartTags(content: string, contentType: 'screenshot' | 'pdf' | 'bookmark'): Promise<string[]> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate 3-5 relevant tags (keywords) for this ${contentType} content. Return ONLY comma-separated tags, nothing else.\n\nContent:\n${content.substring(0, 2000)}`
            }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 100,
          }
        })
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const tagsText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse comma-separated tags
    const tags = tagsText
      .toLowerCase()
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0 && tag.length < 30)
      .slice(0, 5);
    
    console.log('✅ Smart tags generated:', tags);
    return tags;
  } catch (error) {
    console.error('Error generating smart tags:', error);
    return [];
  }
}

