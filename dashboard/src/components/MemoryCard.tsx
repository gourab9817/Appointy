import { Memory } from '../types';
import { formatRelativeTime } from '../utils/search';

interface MemoryCardProps {
  memory: Memory;
  onClick: () => void;
  onDelete: (id: string) => void;
  onOpenReader?: (memory: Memory) => void;
}

const platformEmojis: Record<string, string> = {
  YouTube: '📺',
  Twitter: '🐦',
  GitHub: '💻',
  StackOverflow: '📚',
  Medium: '📝',
  'Dev.to': '👨‍💻',
  Reddit: '🤖',
  LinkedIn: '💼',
  Article: '📄',
  Website: '🌐',
};

export default function MemoryCard({ memory, onClick, onDelete, onOpenReader }: MemoryCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (confirm('Are you sure you want to delete this memory?')) {
      onDelete(memory.id);
    }
  };
  
  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onOpenReader) {
      onOpenReader(memory);
    }
  };
  
  const { title, note, tags, category, platform, timestamp, favicon, full_text, word_count } = memory;
  const platformEmoji = platformEmojis[platform] || '🌐';
  const firstLetter = title.charAt(0).toUpperCase() || '📄';

  return (
    <div className="group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden 
               hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 
               animate-fade-in relative">
      {/* Action Buttons */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          onClick={handleDelete}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                   text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-all"
          title="Delete this memory"
        >
          🗑️ Delete
        </button>
        {full_text && (
          <button
            onClick={handleOpenReader}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                     text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-all"
            title="Open in Reader Mode"
          >
            📖 Read
          </button>
        )}
      </div>
      
      {/* Thumbnail */}
      <div 
        onClick={onClick}
        className="relative h-48 bg-gradient-to-br from-secondary-800 via-primary-600 to-accent-500 
                    flex items-center justify-center overflow-hidden cursor-pointer group-hover:scale-105 transition-transform duration-300">
        {favicon ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <img
              src={favicon}
              alt={title}
              className="w-24 h-24 object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = `
                    <span class="text-7xl font-bold text-white drop-shadow-lg">${firstLetter}</span>
                  `;
                }
              }}
            />
          </div>
        ) : (
          <span className="text-7xl font-bold text-white drop-shadow-lg">{firstLetter}</span>
        )}
        
        {/* Platform Badge */}
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white border border-white/30
                      px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl">
          <span>{platformEmoji}</span>
          <span>{platform}</span>
        </div>
      </div>

      {/* Content */}
      <div onClick={onClick} className="p-6 cursor-pointer">
        <h3 className="font-bold text-xl text-secondary-900 mb-3 line-clamp-2 
                     group-hover:text-primary-600 transition-colors leading-tight">
          {title}
        </h3>

        {note && (
          <p className="text-sm text-secondary-600 mb-4 line-clamp-2 leading-relaxed">
            {note}
          </p>
        )}
        
        {/* Reader Mode Indicator */}
        {full_text && (
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit font-bold border border-blue-200">
            <span>📖</span>
            <span>Full Text Saved</span>
            {word_count && <span className="opacity-75">• {word_count.toLocaleString()} words</span>}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-gradient-to-r from-primary-50 to-accent-50 text-primary-700 text-xs font-semibold 
                         rounded-lg border border-primary-200 shadow-sm"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-3 py-1.5 bg-secondary-100 text-secondary-700 text-xs font-semibold rounded-lg shadow-sm">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-secondary-500 pt-4 border-t-2 border-secondary-100">
          <div className="flex items-center gap-2 bg-secondary-50 px-3 py-1.5 rounded-lg">
            <span>📁</span>
            <span className="font-semibold text-secondary-700">{category}</span>
          </div>
          <div className="font-semibold text-secondary-600">
            {formatRelativeTime(new Date(timestamp))}
          </div>
        </div>
      </div>
    </div>
  );
}

