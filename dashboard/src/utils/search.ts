import Fuse from 'fuse.js';
import { Memory } from '../types';

// Optimized search using Fuse.js for fuzzy matching
export function createSearchIndex(memories: Memory[]) {
  return new Fuse(memories, {
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'full_text', weight: 0.25 },
      { name: 'note', weight: 0.2 },
      { name: 'tags', weight: 0.15 },
      { name: 'excerpt', weight: 0.05 },
      { name: 'category', weight: 0.025 },
      { name: 'platform', weight: 0.025 },
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
}

export function searchMemories(
  memories: Memory[],
  query: string,
  filters: {
    platforms?: string[];
    categories?: string[];
    tags?: string[];
  } = {}
): Memory[] {
  let results = memories;

  // Apply filters first
  if (filters.platforms && filters.platforms.length > 0) {
    results = results.filter(m => filters.platforms!.includes(m.platform));
  }

  if (filters.categories && filters.categories.length > 0) {
    results = results.filter(m => filters.categories!.includes(m.category));
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(m =>
      m.tags.some(tag => filters.tags!.includes(tag))
    );
  }

  // Apply search query
  if (query.trim()) {
    const fuse = createSearchIndex(results);
    const searchResults = fuse.search(query);
    return searchResults.map(result => result.item);
  }

  return results;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

export function getAllTags(memories: Memory[]): string[] {
  const tagSet = new Set<string>();
  memories.forEach(m => m.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export function getAllPlatforms(memories: Memory[]): string[] {
  const platformSet = new Set(memories.map(m => m.platform));
  return Array.from(platformSet).sort();
}

export function getAllCategories(memories: Memory[]): string[] {
  const categorySet = new Set(memories.map(m => m.category));
  return Array.from(categorySet).sort();
}

