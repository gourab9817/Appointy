// Gemini AI Integration for Semantic Search

const GEMINI_API_KEY = 'AIzaSyDUnJL_puVm5inxF4sw_6Gm4BhaSB6AXAc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Universal Semantic Search using Gemini AI
 * Works for any content type (bookmarks, PDFs, screenshots)
 */
export async function geminiSemanticSearch<T extends { id: string; title: string; tags: string[] }>(
  items: T[],
  query: string,
  getContent: (item: T) => string, // Function to extract searchable content
  contentType: string = 'items'
): Promise<T[]> {
  try {
    if (items.length === 0) return [];
    
    // Prepare summaries with content
    const itemSummaries = items.map((item, idx) => {
      const content = getContent(item);
      return {
        index: idx,
        id: item.id,
        title: item.title,
        tags: item.tags.join(', '),
        content: content.substring(0, 2000) // Limit content for API
      };
    });
    
    const prompt = `You are an advanced universal semantic search engine that understands concepts, topics, and relationships across ANY domain.

Your task: Find ALL ${contentType} semantically related to the search query, understanding that related content may use:
- Different terminology for the same concept (e.g., "database" = "SQL", "DBMS", "data storage", "MySQL", "PostgreSQL")
- Related concepts (e.g., "machine learning" relates to "AI", "neural networks", "data science", "deep learning")
- Synonyms and alternative terms (e.g., "programming" = "coding", "development", "software engineering")
- Different languages (e.g., "election" = "निर्वाचन", "चुनाव")
- Broader/narrower terms (e.g., "Python" relates to "programming", "data science", "web development")
- Related topics in the same domain (e.g., "React" relates to "JavaScript", "frontend", "web development", "component library")
- Technical synonyms (e.g., "authentication" = "login", "auth", "security", "OAuth", "JWT")
- Domain-specific relationships (e.g., "election" = "voting", "polls", "campaign", "politics")

Search Query: "${query}"

${contentType.toUpperCase()} to search through:
${itemSummaries.map((item, idx) => `${idx}. ${item.title}
   Tags: ${item.tags || 'No tags'}
   ${item.content ? `Content: ${item.content.substring(0, 800)}...` : ''}`).join('\n\n')}

CRITICAL INSTRUCTIONS:
1. Understand the CORE CONCEPT behind the search query
2. Find items that discuss the same topic, even if they use different words
3. Consider related concepts, synonyms, and broader/narrower terms
4. Match on semantic meaning, not just exact word matches
5. Include items that are about the same topic from different angles
6. Order by relevance (most conceptually similar first)
7. Be inclusive - if there's ANY semantic connection to the query's core concept, include it
8. Think about relationships across all domains: technology, science, politics, business, arts, etc.

Examples of good semantic matches:
- Query: "database" → Matches: "SQL Tutorial", "MySQL Guide", "PostgreSQL Setup", "DBMS Concepts", "data storage"
- Query: "machine learning" → Matches: "AI Introduction", "Neural Networks", "Data Science Basics", "Deep Learning"
- Query: "election" → Matches: "voting guide", "political campaign", "polls analysis", "निर्वाचन"
- Query: "React" → Matches: "JavaScript framework", "frontend development", "component library", "web UI"
- Query: "authentication" → Matches: "login system", "OAuth implementation", "JWT tokens", "user security"

Return ONLY a JSON array of indices (numbers) of matching ${contentType}, ordered by relevance.
Example: [2, 5, 1, 8, 3]

IMPORTANT: Return ONLY the JSON array, nothing else. No explanation, no text before or after.`;

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
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2, // Lower for more consistent results
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`🤖 Gemini AI response for ${contentType}:`, content);
    
    // Parse the JSON array from Gemini's response
    const jsonMatch = content.match(/\[[\d,\s]+\]/);
    if (!jsonMatch) {
      console.warn(`Could not parse AI response for ${contentType}, using fallback`);
      return fallbackSearch(items, query, getContent);
    }
    
    const indices = JSON.parse(jsonMatch[0]);
    
    // Return items in the order suggested by Gemini
    const results = indices
      .filter((idx: number) => idx >= 0 && idx < items.length)
      .map((idx: number) => items[idx]);
    
    console.log(`🤖 Gemini found ${results.length} semantically related ${contentType}`);
    return results;
    
  } catch (error) {
    console.error(`Gemini search error for ${contentType}:`, error);
    return fallbackSearch(items, query, getContent);
  }
}

// Fallback search function
function fallbackSearch<T extends { id: string; title: string; tags: string[] }>(
  items: T[],
  query: string,
  getContent: (item: T) => string
): T[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  return items.filter(item => {
    const content = getContent(item).toLowerCase();
    const titleLower = item.title.toLowerCase();
    const tagsLower = item.tags.join(' ').toLowerCase();
    
    // Check if any query word matches
    return queryWords.some(word => 
      titleLower.includes(word) ||
      content.includes(word) ||
      tagsLower.includes(word)
    );
  });
}

