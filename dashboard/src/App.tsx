import { useState, useEffect, useCallback } from 'react';
import { Memory, ViewMode, Screenshot, PDF } from './types';
import { intelligentSearch, aiSemanticSearchPDFs, aiSemanticSearchScreenshots } from './utils/semanticSearch';
import { supabase } from './lib/supabase';
import ContentCard from './components/ContentCard';
import ScreenshotCard from './components/ScreenshotCard';
import PDFCard from './components/PDFCard';
import SearchBar from './components/SearchBar';
import ReaderView from './components/ReaderView';
import './styles.css';

export default function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [filteredPDFs, setFilteredPDFs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);
  const [readerMemory, setReaderMemory] = useState<Memory | null>(null);
  const [activeSection, setActiveSection] = useState<'all' | 'bookmarks' | 'screenshots' | 'pdfs'>('all');

  // Check if running in Chrome extension context
  const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // Load memories from chrome.storage
  useEffect(() => {
    loadMemories();

    // Listen for storage changes (only in extension context)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const listener = (changes: any, area: string) => {
        if (area === 'local' && changes.memories) {
          console.log('Storage changed, reloading...');
          const newMemories = changes.memories.newValue || [];
          setMemories(newMemories);
          setFilteredMemories(newMemories);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, []);

  // Update filtered content when search or filters change
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      
      // Filter memories (bookmarks/articles) with Gemini semantic search
      let memoryResults: Memory[];
      if (searchQuery.trim()) {
        memoryResults = await intelligentSearch(memories, searchQuery);
      } else {
        memoryResults = memories;
      }
      
      if (selectedCategory !== 'All') {
        memoryResults = memoryResults.filter(m => m.category === selectedCategory);
      }
      if (selectedPlatform !== 'All') {
        memoryResults = memoryResults.filter(m => m.platform === selectedPlatform);
      }
      setFilteredMemories(memoryResults);
      
      // Filter screenshots with Gemini semantic search
      let screenshotResults = screenshots;
      if (searchQuery.trim()) {
        screenshotResults = await aiSemanticSearchScreenshots(screenshots, searchQuery);
      }
      setFilteredScreenshots(screenshotResults);
      
      // Filter PDFs with Gemini semantic search
      let pdfResults = pdfs;
      if (searchQuery.trim()) {
        pdfResults = await aiSemanticSearchPDFs(pdfs, searchQuery);
      }
      setFilteredPDFs(pdfResults);
      
      setIsSearching(false);
    };
    
    performSearch();
  }, [memories, screenshots, pdfs, searchQuery, selectedCategory, selectedPlatform]);
  
  // Get unique categories and platforms with counts
  const getCategoriesWithCounts = () => {
    const categoryMap = new Map<string, number>();
    memories.forEach(m => {
      categoryMap.set(m.category, (categoryMap.get(m.category) || 0) + 1);
    });
    return Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  };
  
  const getPlatformsWithCounts = () => {
    const platformMap = new Map<string, number>();
    memories.forEach(m => {
      platformMap.set(m.platform, (platformMap.get(m.platform) || 0) + 1);
    });
    return Array.from(platformMap.entries()).sort((a, b) => b[1] - a[1]);
  };

  const loadMemories = async () => {
    try {
      console.log('🗄️ Loading all content from Supabase...');
      
      // Load all three types in parallel
      const [memoriesResult, screenshotsResult, pdfsResult] = await Promise.all([
        supabase.from('memories').select('*').order('timestamp', { ascending: false }),
        supabase.from('screenshots').select('*').order('timestamp', { ascending: false }),
        supabase.from('pdfs').select('*').order('timestamp', { ascending: false })
      ]);
      
      if (memoriesResult.error) {
        console.error('Memories error:', memoriesResult.error);
      } else {
        const loadedMemories = memoriesResult.data || [];
        console.log(`✅ Loaded ${loadedMemories.length} memories`);
        setMemories(loadedMemories);
        setFilteredMemories(loadedMemories);
      }
      
      if (screenshotsResult.error) {
        console.error('Screenshots error:', screenshotsResult.error);
      } else {
        const loadedScreenshots = screenshotsResult.data || [];
        console.log(`✅ Loaded ${loadedScreenshots.length} screenshots`);
        setScreenshots(loadedScreenshots);
        setFilteredScreenshots(loadedScreenshots);
      }
      
      if (pdfsResult.error) {
        console.error('PDFs error:', pdfsResult.error);
      } else {
        const loadedPDFs = pdfsResult.data || [];
        console.log(`✅ Loaded ${loadedPDFs.length} PDFs`);
        setPdfs(loadedPDFs);
        setFilteredPDFs(loadedPDFs);
      }
      
      // Set up real-time subscriptions
      supabase
        .channel('memories-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, () => {
          loadMemoriesQuick();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'screenshots' }, () => {
          loadMemoriesQuick();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pdfs' }, () => {
          loadMemoriesQuick();
        })
        .subscribe();
      
      console.log('📡 Real-time sync enabled');
      
    } catch (error) {
      console.error('Error loading from Supabase, trying fallback:', error);
      
      // Fallback to local storage
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get(['memories']);
          const localMemories = result.memories || [];
          console.log(`Loaded ${localMemories.length} from local storage (fallback)`);
          setMemories(localMemories);
          setFilteredMemories(localMemories);
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Quick reload without loading state
  const loadMemoriesQuick = async () => {
    try {
      const [memoriesResult, screenshotsResult, pdfsResult] = await Promise.all([
        supabase.from('memories').select('*').order('timestamp', { ascending: false }),
        supabase.from('screenshots').select('*').order('timestamp', { ascending: false }),
        supabase.from('pdfs').select('*').order('timestamp', { ascending: false })
      ]);
      
      if (memoriesResult.data) setMemories(memoriesResult.data);
      if (screenshotsResult.data) setScreenshots(screenshotsResult.data);
      if (pdfsResult.data) setPdfs(pdfsResult.data);
    } catch (error) {
      console.error('Quick reload error:', error);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleOpenMemory = (memory: Memory) => {
    if (memory.url) {
      window.open(memory.url, '_blank');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMemories(memories.filter(m => m.id !== id));
      setFilteredMemories(filteredMemories.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting memory:', error);
      alert('Failed to delete memory. Please try again.');
    }
  };

  const handleDeleteScreenshot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('screenshots')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setScreenshots(screenshots.filter(s => s.id !== id));
      setFilteredScreenshots(filteredScreenshots.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      alert('Failed to delete screenshot. Please try again.');
    }
  };

  const handleDeletePDF = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pdfs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPdfs(pdfs.filter(p => p.id !== id));
      setFilteredPDFs(filteredPDFs.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting PDF:', error);
      alert('Failed to delete PDF. Please try again.');
    }
  };

  const handleOpenPDF = (pdf: PDF) => {
    if (pdf.pdf_url) {
      window.open(pdf.pdf_url, '_blank');
    }
  };

  const handleOpenScreenshot = (screenshot: Screenshot) => {
    if (screenshot.image_url) {
      window.open(screenshot.image_url, '_blank');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(memories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `second-memory-export-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    
    alert('✅ Memories exported successfully!');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with '/'
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🧠</div>
          <p className="text-2xl font-semibold text-white mb-2">Loading your memories...</p>
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Add sample data for testing
  const addSampleData = () => {
    const sampleMemories: Memory[] = [
      {
        id: 'sample1',
        url: 'https://react.dev',
        title: 'React - The library for web and native user interfaces',
        note: 'Official React documentation - great resource for learning hooks',
        tags: ['react', 'documentation', 'frontend'],
        category: 'Documentation',
        platform: 'Article',
        timestamp: Date.now() - 3600000,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        favicon: 'https://react.dev/favicon.ico'
      },
      {
        id: 'sample2',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Amazing React Tutorial',
        note: 'This video explains React hooks in detail. Must watch!',
        tags: ['react', 'tutorial', 'video'],
        category: 'Video',
        platform: 'YouTube',
        timestamp: Date.now() - 7200000,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'sample3',
        url: 'https://github.com/facebook/react',
        title: 'facebook/react: React repository',
        note: 'React source code - interesting to see how it works',
        tags: ['react', 'open-source', 'github'],
        category: 'Research',
        platform: 'GitHub',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'sample4',
        url: 'https://tailwindcss.com',
        title: 'Tailwind CSS - Rapidly build modern websites',
        note: 'Best CSS framework for rapid prototyping',
        tags: ['css', 'tailwind', 'design'],
        category: 'Tool',
        platform: 'Article',
        timestamp: Date.now() - 172800000,
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    if (isExtension) {
      chrome.storage.local.set({ memories: sampleMemories }, () => {
        setMemories(sampleMemories);
        setFilteredMemories(sampleMemories);
      });
    } else {
      localStorage.setItem('memories', JSON.stringify(sampleMemories));
      setMemories(sampleMemories);
      setFilteredMemories(sampleMemories);
    }
  };

  if (memories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900">
        {/* Header */}
        <header className="bg-secondary-900/50 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                <span className="text-4xl">🧠</span>
                <span className="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
                  Second Memory
                </span>
              </h1>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-16 animate-slide-up">
            <div className="text-8xl mb-8">🧠</div>
            <h2 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
              Your Memory is Empty
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Start capturing your thoughts, articles, videos, and ideas with the Chrome extension.
              Every great journey starts with a single save.
            </p>
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={addSampleData}
                className="px-10 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white 
                         rounded-2xl font-bold text-lg shadow-xl hover:shadow-primary-500/50 hover:scale-105 
                         transition-all duration-300"
              >
                ✨ Add Sample Memories (for testing)
              </button>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md backdrop-blur-lg">
                <p className="text-sm text-gray-200 mb-3 font-medium">
                  💡 <strong className="text-primary-400">Pro Tip:</strong> Click the extension icon in your browser toolbar to save your first memory!
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Alt</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">M</kbd>
                  <span className="ml-2">for quick access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-secondary-900 via-secondary-800 to-primary-900 text-white shadow-2xl sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-5 lg:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl lg:text-5xl">🧠</span>
              <span className="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
                <span className="hidden sm:inline">Second Memory</span>
                <span className="sm:hidden">Memory</span>
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto">
              <div className="text-center sm:text-right bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 py-2 border border-white/20">
                <div className="text-xs opacity-80 text-primary-200">Total</div>
                <div className="text-xl sm:text-2xl font-bold text-white">{memories.length + screenshots.length + pdfs.length}</div>
              </div>
              
              {/* AI Search Indicator */}
              <div className="text-xs bg-gradient-to-r from-accent-500 to-primary-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-white/30 font-semibold shadow-lg">
                <span className="hidden sm:inline">🤖 Gemini AI Search</span>
                <span className="sm:hidden">🤖 AI</span>
              </div>
              
              <button
                onClick={handleExport}
                className="px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                         rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 
                         hover:shadow-xl border border-white/20 hover:scale-105"
              >
                <span className="hidden sm:inline">📥 Export</span>
                <span className="sm:hidden">📥</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-center w-full">
            <SearchBar onSearch={handleSearch} totalCount={memories.length} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          {/* Sidebar Filters */}
          <aside className="w-full xl:w-80 flex-shrink-0 order-2 xl:order-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 xl:sticky xl:top-32 border border-gray-200 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {/* Platforms */}
              <div className="mb-6">
                <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2 text-lg">
                  <span>🌐</span>
                  <span>Platforms</span>
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedPlatform('All')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                      selectedPlatform === 'All'
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-lg'
                        : 'hover:bg-secondary-50 text-secondary-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Platforms</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedPlatform === 'All' ? 'bg-white/20' : 'bg-secondary-200'
                      }`}>{memories.length}</span>
                    </div>
                  </button>
                  {getPlatformsWithCounts().map(([platform, count]) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                        selectedPlatform === platform
                          ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-lg'
                          : 'hover:bg-secondary-50 text-secondary-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{platform}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedPlatform === platform ? 'bg-white/20' : 'bg-secondary-200'
                        }`}>{count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2 text-lg">
                  <span>📁</span>
                  <span>Categories</span>
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                      selectedCategory === 'All'
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-lg'
                        : 'hover:bg-secondary-50 text-secondary-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Categories</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === 'All' ? 'bg-white/20' : 'bg-secondary-200'
                      }`}>{memories.length}</span>
                    </div>
                  </button>
                  {getCategoriesWithCounts().map(([category, count]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-lg'
                          : 'hover:bg-secondary-50 text-secondary-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedCategory === category ? 'bg-white/20' : 'bg-secondary-200'
                        }`}>{count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedCategory !== 'All' || selectedPlatform !== 'All') && (
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedPlatform('All');
                  }}
                  className="w-full mt-6 px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 
                           rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  ✕ Clear Filters
                </button>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 order-1 xl:order-2">
        {/* Section Tabs */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-2 sm:p-3 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeSection === 'all'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              🏠 All ({memories.length + screenshots.length + pdfs.length})
            </button>
            <button
              onClick={() => setActiveSection('bookmarks')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeSection === 'bookmarks'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              🔗 Bookmarks ({memories.length})
            </button>
            <button
              onClick={() => setActiveSection('screenshots')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeSection === 'screenshots'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              📸 Screenshots ({screenshots.length})
            </button>
            <button
              onClick={() => setActiveSection('pdfs')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeSection === 'pdfs'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              📕 PDFs ({pdfs.length})
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-5 border border-gray-200">
          <div className="text-secondary-700 flex items-center gap-3">
            {isSearching && (
              <div className="flex items-center gap-2 text-primary-600">
                <div className="animate-spin">⏳</div>
                <span className="text-sm font-medium">Searching...</span>
              </div>
            )}
            {!isSearching && (searchQuery || selectedCategory !== 'All' || selectedPlatform !== 'All') ? (
              <span className="text-sm">
                {searchQuery && <span className="text-accent-600 font-semibold">🤖 AI Semantic: </span>}
                Found <strong className="text-primary-600 text-lg">
                  {activeSection === 'all' 
                    ? filteredMemories.length + filteredScreenshots.length + filteredPDFs.length
                    : activeSection === 'bookmarks' 
                    ? filteredMemories.length
                    : activeSection === 'screenshots'
                    ? filteredScreenshots.length
                    : filteredPDFs.length}
                </strong> 
                {searchQuery && ` results for "${searchQuery}"`}
                {selectedPlatform !== 'All' && ` in ${selectedPlatform}`}
                {selectedCategory !== 'All' && ` • ${selectedCategory}`}
              </span>
            ) : (
              <span className="text-sm font-medium">
                Showing <strong className="text-primary-600 text-lg">
                  {activeSection === 'all' 
                    ? memories.length + screenshots.length + pdfs.length
                    : activeSection === 'bookmarks' 
                    ? memories.length
                    : activeSection === 'screenshots'
                    ? screenshots.length
                    : pdfs.length}
                </strong> items
              </span>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-1.5 sm:gap-2 bg-secondary-50 p-1 rounded-lg sm:rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setViewMode('masonry')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                viewMode === 'masonry'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
              title="Masonry Layout"
            >
              🧱 <span className="hidden sm:inline">Masonry</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
              title="Grid Layout"
            >
              ⊞ <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
              title="List Layout"
            >
              ☰ <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Content Sections */}
        {(() => {
          const showAll = activeSection === 'all';
          const showBookmarks = activeSection === 'all' || activeSection === 'bookmarks';
          const showScreenshots = activeSection === 'all' || activeSection === 'screenshots';
          const showPDFs = activeSection === 'all' || activeSection === 'pdfs';

          const totalCount = (showBookmarks ? filteredMemories.length : 0) +
                            (showScreenshots ? filteredScreenshots.length : 0) +
                            (showPDFs ? filteredPDFs.length : 0);

          if (totalCount === 0) {
            return (
              <div className="text-center py-20 bg-white rounded-2xl shadow-xl border border-gray-200">
                <div className="text-6xl mb-6">🔍</div>
                <h3 className="text-3xl font-bold text-secondary-900 mb-3">No results found</h3>
                <p className="text-secondary-600 text-lg">Try adjusting your search terms or filters</p>
              </div>
            );
          }

          return (
            <div className="space-y-8">
              {/* Bookmarks Section */}
              {showBookmarks && filteredMemories.length > 0 && (
                <div>
                  {showAll && (
                    <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center gap-2">
                      <span>🔗</span>
                      <span>Bookmarks & Articles</span>
                      <span className="text-sm font-normal text-gray-500">({filteredMemories.length})</span>
                    </h2>
                  )}
                  <div
                    className={
                      viewMode === 'masonry'
                        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 lg:gap-5'
                        : viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5'
                        : 'space-y-3 sm:space-y-4'
                    }
                  >
                    {filteredMemories.map((memory) => (
                      <div 
                        key={memory.id} 
                        className={
                          viewMode === 'masonry' 
                            ? 'break-inside-avoid mb-3 sm:mb-4 lg:mb-5' 
                            : ''
                        }
                      >
                        <ContentCard 
                          memory={memory} 
                          onClick={() => handleOpenMemory(memory)} 
                          onDelete={handleDeleteMemory}
                          onOpenReader={memory.full_text ? (m) => setReaderMemory(m) : undefined}
                          viewMode={viewMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screenshots Section */}
              {showScreenshots && filteredScreenshots.length > 0 && (
                <div>
                  {showAll && (
                    <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center gap-2">
                      <span>📸</span>
                      <span>Screenshots</span>
                      <span className="text-sm font-normal text-gray-500">({filteredScreenshots.length})</span>
                    </h2>
                  )}
                  <div
                    className={
                      viewMode === 'masonry'
                        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 lg:gap-5'
                        : viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5'
                        : 'space-y-3 sm:space-y-4'
                    }
                  >
                    {filteredScreenshots.map((screenshot) => (
                      <div 
                        key={screenshot.id} 
                        className={
                          viewMode === 'masonry' 
                            ? 'break-inside-avoid mb-3 sm:mb-4 lg:mb-5' 
                            : ''
                        }
                      >
                        <ScreenshotCard 
                          screenshot={screenshot} 
                          onClick={() => handleOpenScreenshot(screenshot)} 
                          onDelete={handleDeleteScreenshot}
                          viewMode={viewMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDFs Section */}
              {showPDFs && filteredPDFs.length > 0 && (
                <div>
                  {showAll && (
                    <h2 className="text-2xl font-bold text-secondary-900 mb-4 flex items-center gap-2">
                      <span>📕</span>
                      <span>PDF Documents</span>
                      <span className="text-sm font-normal text-gray-500">({filteredPDFs.length})</span>
                    </h2>
                  )}
                  <div
                    className={
                      viewMode === 'masonry'
                        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 lg:gap-5'
                        : viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5'
                        : 'space-y-3 sm:space-y-4'
                    }
                  >
                    {filteredPDFs.map((pdf) => (
                      <div 
                        key={pdf.id} 
                        className={
                          viewMode === 'masonry' 
                            ? 'break-inside-avoid mb-3 sm:mb-4 lg:mb-5' 
                            : ''
                        }
                      >
                        <PDFCard 
                          pdf={pdf} 
                          onClick={() => handleOpenPDF(pdf)} 
                          onDelete={handleDeletePDF}
                          viewMode={viewMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center">
        <div className="bg-gradient-to-r from-secondary-900 via-secondary-800 to-primary-900 rounded-2xl p-8 text-white shadow-2xl">
          <p className="text-lg font-medium mb-2">
            Made by Gourab for peace of mind
          </p>
          <p className="text-sm text-gray-300">
            Your data stays local and private
          </p>
        </div>
      </footer>
      
      {/* Reader View Modal */}
      {readerMemory && (
        <ReaderView 
          memory={readerMemory} 
          onClose={() => setReaderMemory(null)} 
        />
      )}
    </div>
  );
}

