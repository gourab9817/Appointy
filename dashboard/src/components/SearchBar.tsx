import { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  totalCount: number;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative w-full max-w-2xl lg:max-w-3xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full pl-10 sm:pl-12 lg:pl-14 pr-10 sm:pr-12 py-3 sm:py-3.5 lg:py-4 rounded-xl sm:rounded-2xl border-2 border-white/30 
                   bg-white/20 backdrop-blur-md text-white placeholder-white/60
                   focus:border-primary-400 focus:ring-2 sm:focus:ring-4 focus:ring-primary-400/30 focus:bg-white/30
                   transition-all duration-300 text-sm sm:text-base lg:text-lg font-medium
                   shadow-xl"
        />
        <div className="absolute left-3 sm:left-4 lg:left-5 top-1/2 -translate-y-1/2 text-white/80 text-lg sm:text-xl lg:text-2xl">
          🔍
        </div>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 sm:right-4 lg:right-5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white 
                     transition-colors font-bold text-base sm:text-lg bg-white/10 rounded-lg w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Search hint */}
      <p className="absolute -bottom-6 sm:-bottom-7 left-0 text-xs text-white/70 font-medium hidden sm:block">
        Press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/20 rounded border border-white/30">/</kbd> to focus
      </p>
    </div>
  );
}

