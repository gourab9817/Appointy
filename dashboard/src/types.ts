export interface Memory {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  category: string;
  platform: string;
  timestamp: number;
  created_at: string;
  favicon?: string;
  full_text?: string;
  excerpt?: string;
  word_count?: number;
}

export interface Screenshot {
  id: string;
  url: string;
  title: string;
  image_url: string;
  extracted_text?: string;
  tags: string[];
  timestamp: number;
  created_at: string;
  metadata?: any;
}

export interface PDF {
  id: string;
  url: string;
  title: string;
  pdf_url: string;
  summary?: string;
  full_text?: string;
  tags: string[];
  page_count?: number;
  file_size?: number;
  timestamp: number;
  created_at: string;
  metadata?: any;
}

export type ViewMode = 'grid' | 'list' | 'masonry' | 'timeline';
export type SortBy = 'recent' | 'oldest' | 'title';
export type ContentType = 'article' | 'video' | 'image' | 'pdf' | 'link' | 'code' | 'other';

export function detectContentType(memory: Memory): ContentType {
  const { platform, url, full_text, word_count } = memory;
  
  // Check URL patterns
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return 'video';
  }
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return 'image';
  }
  if (url.match(/\.(pdf)$/i) || url.includes('/pdf/')) {
    return 'pdf';
  }
  if (platform === 'GitHub' || url.includes('github.com')) {
    return 'code';
  }
  
  // Check content
  if (full_text && word_count && word_count > 100) {
    return 'article';
  }
  
  return 'link';
}

