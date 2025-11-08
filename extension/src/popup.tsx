import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { isPDFPage, downloadPDFFromURL } from './lib/pdfUtils';
import './styles.css';

interface Memory {
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

function detectPlatform(url: string): string {
  if (!url) return 'Website';
  
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Remove 'www.' prefix
    hostname = hostname.replace(/^www\./, '');
    
    // Special cases for well-known platforms (keep their brand names)
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'YouTube';
    if (hostname.includes('twitter.com') || hostname === 'x.com') return 'Twitter';
    if (hostname === 'github.com') return 'GitHub';
    if (hostname === 'stackoverflow.com') return 'Stack Overflow';
    if (hostname === 'medium.com') return 'Medium';
    if (hostname === 'dev.to') return 'Dev.to';
    if (hostname === 'reddit.com') return 'Reddit';
    if (hostname === 'linkedin.com') return 'LinkedIn';
    
    // For all other sites, capitalize the domain nicely
    // e.g., "wikipedia.org" -> "Wikipedia", "notion.so" -> "Notion"
    const domainParts = hostname.split('.');
    const mainDomain = domainParts[0];
    
    // Capitalize first letter
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch (e) {
    return 'Website';
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const categories = [
  'Uncategorized',
  'Article',
  'Video',
  'Tutorial',
  'Documentation',
  'Inspiration',
  'Research',
  'Tool',
  'Other'
];

export default function Popup() {
  const [pageInfo, setPageInfo] = useState<{ title: string; url: string; favicon?: string } | null>(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [platform, setPlatform] = useState('Website');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [readerMode, setReaderMode] = useState(false);
  const [extractingContent, setExtractingContent] = useState(false);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        const detectedPlatform = detectPlatform(tab.url || '');
        setPlatform(detectedPlatform);
        
        // Check if current page is a PDF
        const isPDFPage = (tab.url || '').toLowerCase().includes('.pdf') || 
                         (tab.url || '').includes('type=pdf');
        setIsPDF(isPDFPage);
        
        // Auto-select category
        if (detectedPlatform === 'YouTube') {
          setCategory('Video');
        } else if (detectedPlatform === 'GitHub') {
          setCategory('Documentation');
        } else if (isPDFPage) {
          setCategory('Documentation');
        }
        
        setPageInfo({
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favicon: tab.favIconUrl
        });
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      let fullText: string | undefined;
      let excerpt: string | undefined;
      let wordCount: number | undefined;

      // Extract full content if Reader Mode is enabled
      if (readerMode) {
        setExtractingContent(true);
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab.id) {
            // Execute script to extract article content
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // Simple content extraction using DOM
                const article = document.querySelector('article') || document.querySelector('main') || document.body;
                const clone = article.cloneNode(true) as HTMLElement;
                
                // Remove script tags, style tags, nav, header, footer
                clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement').forEach(el => el.remove());
                
                const text = clone.innerText || clone.textContent || '';
                const cleaned = text.replace(/\s+/g, ' ').trim();
                const words = cleaned.split(/\s+/).length;
                const excerptText = cleaned.substring(0, 500);
                
                return {
                  fullText: cleaned,
                  excerpt: excerptText,
                  wordCount: words
                };
              }
            });
            
            if (results && results[0]?.result) {
              fullText = results[0].result.fullText;
              excerpt = results[0].result.excerpt;
              wordCount = results[0].result.wordCount;
              console.log(`📖 Extracted ${wordCount} words from article`);
            }
          }
        } catch (extractError) {
          console.error('Content extraction error:', extractError);
          // Continue saving even if extraction fails
        } finally {
          setExtractingContent(false);
        }
      }

      const memory: Memory = {
        id: generateId(),
        url: pageInfo?.url || '',
        title: pageInfo?.title || 'Untitled',
        note: note.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        category,
        platform,
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        favicon: pageInfo?.favicon,
        full_text: fullText,
        excerpt: excerpt,
        word_count: wordCount
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('memories')
        .insert([memory])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Saved to Supabase:', data);
      
      // Also save to local storage as backup
      const result = await chrome.storage.local.get(['memories']);
      const memories = result.memories || [];
      memories.unshift(memory);
      await chrome.storage.local.set({ memories });
      
      // Show success
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setNote('');
        setTags('');
        setCategory('Uncategorized');
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openDashboard = () => {
    // Open the dashboard from dist folder
    const dashboardPath = chrome.runtime.getURL('dist/dashboard.html');
    chrome.tabs.create({ url: dashboardPath });
  };

  const handleScreenshot = async () => {
    if (!pageInfo) return;
    
    setIsScreenshotting(true);
    setError('');
    
    try {
      console.log('📸 Capturing screenshot...');
      
      // Capture visible tab
      chrome.tabs.captureVisibleTab(null as any, {
        format: 'png',
        quality: 90
      }, (screenshot) => {
        if (chrome.runtime.lastError) {
          setError('Failed to capture: ' + chrome.runtime.lastError.message);
          setIsScreenshotting(false);
          return;
        }
        
        // Show preview
        setScreenshotPreview(screenshot);
        setIsScreenshotting(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screenshot failed');
      setIsScreenshotting(false);
    }
  };

  const handleConfirmScreenshot = async () => {
    if (!screenshotPreview || !pageInfo) return;
    
    setIsUploading(true);
    setError('');
    
    try {
      // Send to background for AI processing and upload
      chrome.runtime.sendMessage({
        action: 'captureScreenshot',
        data: {
          url: pageInfo.url,
          title: pageInfo.title,
          screenshot: screenshotPreview
        }
      }, (response) => {
        if (response?.success) {
          setSuccess(true);
          setScreenshotPreview(null);
          setTimeout(() => setSuccess(false), 2000);
        } else {
          setError(response?.error || 'Failed to upload screenshot');
        }
        setIsUploading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleCancelScreenshot = () => {
    setScreenshotPreview(null);
    setError('');
  };

  const handlePDFExport = async () => {
    if (!pageInfo) return;
    
    setIsExportingPDF(true);
    setError('');
    
    try {
      console.log('📄 Exporting PDF...');
      
      // Download PDF from current URL
      const pdfBlob = await downloadPDFFromURL(pageInfo.url);
      
      // Send to background script for processing
      chrome.runtime.sendMessage({
        action: 'exportPDF',
        data: {
          url: pageInfo.url,
          title: pageInfo.title,
          pdfBlob: pdfBlob
        }
      }, (response) => {
        if (response?.success) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 2000);
        } else {
          setError(response?.error || 'Failed to export PDF');
        }
        setIsExportingPDF(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-[420px] bg-gradient-to-br from-secondary-50 via-white to-primary-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-900 via-secondary-800 to-primary-900 text-white p-6 shadow-2xl">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <span className="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
            Second Memory
          </span>
        </h1>
        <p className="text-sm text-gray-300 mt-2 font-medium">Capture this moment forever</p>
      </div>

      <div className="p-6">
        {/* Page Info */}
        {pageInfo && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-5 mb-6">
            <div className="flex items-start gap-3">
              {pageInfo.favicon && (
                <img 
                  src={pageInfo.favicon} 
                  alt="" 
                  className="w-8 h-8 rounded-lg mt-0.5 shadow-md"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-secondary-900 truncate text-base">{pageInfo.title}</h3>
                <p className="text-xs text-secondary-500 truncate mt-1">{pageInfo.url}</p>
                <span className="inline-block mt-2 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold rounded-lg shadow-md">
                  {platform}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* Screenshot Button */}
          <button
            onClick={handleScreenshot}
            disabled={isScreenshotting}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="text-2xl mb-2">📸</span>
            <span className="text-sm font-bold">
              {isScreenshotting ? 'Capturing...' : 'Screenshot'}
            </span>
            <span className="text-xs opacity-80 mt-1">+ AI Text Extract</span>
          </button>

          {/* PDF Export Button - Only show if on PDF page */}
          {isPDF ? (
            <button
              onClick={handlePDFExport}
              disabled={isExportingPDF}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="text-2xl mb-2">📄</span>
              <span className="text-sm font-bold">
                {isExportingPDF ? 'Exporting...' : 'Export PDF'}
              </span>
              <span className="text-xs opacity-80 mt-1">+ AI Summary</span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 bg-secondary-100 text-secondary-600 rounded-xl border-2 border-dashed border-secondary-300">
              <span className="text-2xl mb-2 opacity-50">📄</span>
              <span className="text-xs font-medium text-center">PDF Export available on PDF pages</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-secondary-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-gradient-to-br from-secondary-50 via-white to-primary-50 text-sm font-bold text-secondary-600">
              Or Save Bookmark
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Note */}
          <div>
            <label className="block text-sm font-bold text-secondary-800 mb-2">
              📝 Personal Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you saving this? What's important?"
              rows={3}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 resize-none text-sm shadow-sm transition-all"
              autoFocus
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-secondary-800 mb-2">
              🏷️ Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="react, ai, tutorial (comma-separated)"
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 text-sm shadow-sm transition-all"
            />
            <p className="text-xs text-secondary-500 mt-2 font-medium">Separate tags with commas</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-secondary-800 mb-2">
              📁 Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 text-sm bg-white shadow-sm transition-all font-medium"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Reader Mode Toggle */}
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <div className="text-sm font-bold text-primary-900">Reader Mode</div>
                  <div className="text-xs text-primary-700">Extract & save full article text</div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={readerMode}
                  onChange={(e) => setReaderMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-all duration-300 ${
                  readerMode ? 'bg-primary-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 mt-1 ${
                    readerMode ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </div>
              </div>
            </label>
            {readerMode && (
              <div className="mt-3 text-xs text-primary-700 bg-white rounded-lg p-2">
                💡 Will extract and save complete article text for offline reading
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || success}
            className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold py-4 px-6 rounded-xl 
                     hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : success ? (
              <span className="flex items-center justify-center gap-2">
                ✅ Saved Successfully!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                💾 Save to Memory
              </span>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold shadow-sm">
              ❌ {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <button
          onClick={openDashboard}
          className="w-full mt-6 text-white font-bold text-sm py-3 bg-gradient-to-r from-secondary-800 to-primary-800
                   hover:from-secondary-900 hover:to-primary-900 rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          📊 View All Memories
        </button>

        {/* Keyboard Hint */}
        <p className="text-xs text-secondary-500 text-center mt-4 font-medium">
          Press <kbd className="px-2 py-1 bg-secondary-100 rounded-lg border border-secondary-200">Ctrl+Enter</kbd> to save quickly
        </p>
      </div>

      {/* Screenshot Preview Modal */}
      {screenshotPreview && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary-900 to-primary-900 p-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">📸 Screenshot Preview</h2>
            <button
              onClick={handleCancelScreenshot}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Preview Image */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <img
              src={screenshotPreview}
              alt="Screenshot preview"
              className="max-w-full max-h-full rounded-xl shadow-2xl border-2 border-white/20"
            />
          </div>

          {/* Actions */}
          <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex gap-3">
              <button
                onClick={handleCancelScreenshot}
                disabled={isUploading}
                className="flex-1 py-3 bg-secondary-700 hover:bg-secondary-800 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScreenshot}
                disabled={isUploading}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold rounded-xl shadow-xl transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing with AI...
                  </span>
                ) : (
                  '✓ Save & Extract Text'
                )}
              </button>
            </div>
            <p className="text-xs text-white/60 text-center mt-3">
              AI will extract all visible text from this screenshot
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

