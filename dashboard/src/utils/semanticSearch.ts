import { Memory, Screenshot, PDF } from '../types';
import { geminiSemanticSearch } from '../lib/gemini';

// Enhanced keyword extraction
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'it', 'to', 'of', 'and', 'in', 'for', 'on', 'with',
    'as', 'at', 'by', 'from', 'this', 'that', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Calculate similarity between two sets of keywords
export function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Enhanced local search with semantic understanding
export function enhancedLocalSearch(memories: Memory[], query: string): Memory[] {
  const queryKeywords = extractKeywords(query);
  
  if (queryKeywords.length === 0) return memories;
  
  // Score each memory
  const scored = memories.map(memory => {
    // Extract keywords from memory
    const titleKeywords = extractKeywords(memory.title);
    const noteKeywords = extractKeywords(memory.note);
    const tagKeywords = memory.tags.flatMap(tag => extractKeywords(tag));
    const allKeywords = [...titleKeywords, ...noteKeywords, ...tagKeywords];
    
    // Calculate similarity
    const similarity = calculateSimilarity(queryKeywords, allKeywords);
    
    // Boost score for exact matches in title
    const titleBoost = memory.title.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
    
    // Boost score for tag matches
    const tagBoost = memory.tags.some(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
    ) ? 0.2 : 0;
    
    const score = similarity + titleBoost + tagBoost;
    
    return { memory, score };
  });
  
  // Filter and sort by score
  return scored
    .filter(item => item.score > 0.1) // Threshold
    .sort((a, b) => b.score - a.score)
    .map(item => item.memory);
}

// AI Semantic Search using Gemini for Memories (Bookmarks/Articles)
export async function aiSemanticSearch(
  memories: Memory[],
  query: string,
  _apiKey?: string // Not used anymore, kept for compatibility
): Promise<Memory[]> {
  if (!query.trim() || memories.length === 0) {
    return memories;
  }
  
  console.log('🤖 Using Gemini semantic search for bookmarks...');
  
  return geminiSemanticSearch(
    memories,
    query,
    (m) => `${m.title} ${m.note || ''} ${m.full_text?.substring(0, 1500) || ''} ${m.excerpt || ''} ${m.tags.join(' ')} ${m.category} ${m.platform}`,
    'bookmarks'
  );
}

// Semantic Search for PDFs using Gemini
export async function aiSemanticSearchPDFs(
  pdfs: PDF[],
  query: string
): Promise<PDF[]> {
  if (!query.trim() || pdfs.length === 0) {
    return pdfs;
  }
  
  console.log('🤖 Using Gemini semantic search for PDFs...');
  
  return geminiSemanticSearch(
    pdfs,
    query,
    (p) => `${p.title} ${p.summary || ''} ${p.full_text?.substring(0, 3000) || ''} ${p.tags.join(' ')}`,
    'PDFs'
  );
}

// Semantic Search for Screenshots using Gemini
export async function aiSemanticSearchScreenshots(
  screenshots: Screenshot[],
  query: string
): Promise<Screenshot[]> {
  if (!query.trim() || screenshots.length === 0) {
    return screenshots;
  }
  
  console.log('🤖 Using Gemini semantic search for screenshots...');
  
  return geminiSemanticSearch(
    screenshots,
    query,
    (s) => `${s.title} ${s.extracted_text?.substring(0, 3000) || ''} ${s.tags.join(' ')}`,
    'screenshots'
  );
}

// Main search function that decides which method to use
export async function intelligentSearch(
  memories: Memory[],
  query: string,
  _apiKey?: string // Not used anymore, kept for compatibility
): Promise<Memory[]> {
  if (!query.trim()) {
    return memories;
  }
  
  // Always use Gemini semantic search (no API key needed, it's built-in)
  console.log('🤖 Using Gemini AI semantic search...');
  return await aiSemanticSearch(memories, query);
}

