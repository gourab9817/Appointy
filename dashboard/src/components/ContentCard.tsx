import { Memory, detectContentType, ContentType, ViewMode } from '../types';
import { formatRelativeTime } from '../utils/search';

interface ContentCardProps {
  memory: Memory;
  onClick: () => void;
  onDelete: (id: string) => void;
  onOpenReader?: (memory: Memory) => void;
  viewMode: ViewMode;
}

const platformEmojis: Record<string, string> = {
  YouTube: '📺',
  Twitter: '🐦',
  GitHub: '💻',
  'Stack Overflow': '📚',
  Medium: '📝',
  'Dev.to': '👨‍💻',
  Reddit: '🤖',
  LinkedIn: '💼',
  Wikipedia: '📖',
  Notion: '📓',
};

const contentTypeConfig: Record<ContentType, { emoji: string; color: string; label: string }> = {
  article: { emoji: '📄', color: 'from-blue-500 to-blue-600', label: 'Article' },
  video: { emoji: '📺', color: 'from-red-500 to-red-600', label: 'Video' },
  image: { emoji: '🖼️', color: 'from-purple-500 to-purple-600', label: 'Image' },
  pdf: { emoji: '📕', color: 'from-orange-500 to-orange-600', label: 'PDF' },
  code: { emoji: '💻', color: 'from-green-500 to-green-600', label: 'Code' },
  link: { emoji: '🔗', color: 'from-gray-500 to-gray-600', label: 'Link' },
  other: { emoji: '📌', color: 'from-indigo-500 to-indigo-600', label: 'Other' },
};

export default function ContentCard({ memory, onClick, onDelete, onOpenReader, viewMode }: ContentCardProps) {
  const { title, note, tags, category, platform, timestamp, favicon, full_text, word_count } = memory;
  
  const contentType = detectContentType(memory);
  const typeConfig = contentTypeConfig[contentType];
  const platformEmoji = platformEmojis[platform] || '🌐';
  const readingTime = word_count ? Math.ceil(word_count / 200) : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this memory?')) {
      onDelete(memory.id);
    }
  };
  
  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenReader) {
      onOpenReader(memory);
    }
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div className="group bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl sm:hover:shadow-2xl border border-gray-200 sm:border-2 sm:border-gray-100 
                    transition-all duration-300 flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6 relative hover:-translate-y-0.5 sm:hover:-translate-y-1">
        {/* Quick Actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
            🗑️
          </button>
          {full_text && (
            <button onClick={handleOpenReader} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
              📖
            </button>
          )}
        </div>

        {/* Icon/Thumbnail */}
        <div onClick={onClick} className={`w-full sm:w-24 lg:w-28 h-24 sm:h-24 lg:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white text-4xl sm:text-5xl flex-shrink-0 cursor-pointer shadow-lg`}>
          {favicon ? (
            <img src={favicon} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl" 
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            typeConfig.emoji
          )}
        </div>

        {/* Content */}
        <div onClick={onClick} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h3 className="font-bold text-base sm:text-lg lg:text-xl text-gray-900 line-clamp-2 flex-1 leading-tight">{title}</h3>
            <span className={`text-xs bg-gradient-to-r ${typeConfig.color} text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold shadow-md whitespace-nowrap self-start`}>
              {typeConfig.emoji} <span className="hidden sm:inline">{typeConfig.label}</span>
            </span>
          </div>
          {note && <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 leading-relaxed">{note}</p>}
          {full_text && (
            <div className="text-xs bg-blue-50 border-l-2 sm:border-l-4 border-blue-500 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg mb-2 sm:mb-3">
              <span className="font-bold text-blue-700">📖 Full Article: {word_count?.toLocaleString()} words • {readingTime} min</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-2">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-xs bg-primary-50 text-primary-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold border border-primary-200">
                #{tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 sm:py-1 rounded-full font-bold">
                +{tags.length - 4}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 font-medium pt-2 border-t border-gray-100">
            <span className="flex items-center gap-1">
              {platformEmoji} <span className="hidden sm:inline">{platform}</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              📁 {category}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>{formatRelativeTime(new Date(timestamp))}</span>
          </div>
        </div>
      </div>
    );
  }

  // Grid/Masonry view layout (content-aware)
  return (
    <div className={`group bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-200 sm:border-2 sm:border-gray-100 overflow-hidden 
               hover:shadow-xl sm:hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-primary-300 transition-all duration-300 
               animate-fade-in relative w-full`}>
      
      {/* Action Buttons */}
      <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4 z-20 flex gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          onClick={handleDelete}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                   text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold shadow-lg sm:shadow-xl hover:scale-110 transition-all"
          title="Delete"
        >
          <span className="hidden sm:inline">🗑️ Delete</span>
          <span className="sm:hidden">🗑️</span>
        </button>
        {full_text && (
          <button
            onClick={handleOpenReader}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                     text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold shadow-lg sm:shadow-xl hover:scale-110 transition-all"
            title="Read Article"
          >
            <span className="hidden sm:inline">📖 Read</span>
            <span className="sm:hidden">📖</span>
          </button>
        )}
      </div>

      {/* Content Type Badge */}
      <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4 z-20">
        <div className={`bg-gradient-to-r ${typeConfig.color} text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold shadow-md sm:shadow-lg border border-white/30 sm:border-2`}>
          {typeConfig.emoji} <span className="hidden sm:inline">{typeConfig.label}</span>
        </div>
      </div>
      
      {/* Thumbnail/Header */}
      <div 
        onClick={onClick}
        className={`relative h-32 sm:h-40 md:h-44 lg:h-48 xl:h-52 bg-gradient-to-br ${typeConfig.color} flex items-center justify-center overflow-hidden cursor-pointer group-hover:scale-[1.02] sm:group-hover:scale-105 transition-transform duration-300 shadow-inner`}>
        {favicon ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black/10 backdrop-blur-sm">
            <img
              src={favicon}
              alt={title}
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = `
                    <span class="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">${typeConfig.emoji}</span>
                  `;
                }
              }}
            />
          </div>
        ) : (
          <span className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl drop-shadow-lg">{typeConfig.emoji}</span>
        )}
        
        {/* Platform Badge */}
        <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 left-2 sm:left-3 lg:left-4 bg-white/20 backdrop-blur-md text-white border border-white/30
                      px-2 sm:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-2 shadow-lg sm:shadow-xl">
          <span className="text-sm sm:text-base">{platformEmoji}</span>
          <span className="hidden sm:inline">{platform}</span>
        </div>
      </div>

      {/* Content */}
      <div onClick={onClick} className="p-3 sm:p-4 lg:p-5 xl:p-6 cursor-pointer">
        <h3 className="font-bold text-base sm:text-lg lg:text-xl text-gray-900 mb-2 sm:mb-3 line-clamp-2 
                     group-hover:text-primary-600 transition-colors leading-tight">
          {title}
        </h3>

        {note && (
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
            {note}
          </p>
        )}
        
        {/* Reader Mode Indicator */}
        {full_text && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-2 sm:border-l-4 border-blue-500 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 text-xs">
              <span className="font-bold text-blue-700">📖 Full Article Saved</span>
              <span className="text-blue-600">{word_count?.toLocaleString()} words • {readingTime} min</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 text-xs font-bold 
                         rounded-full border border-primary-200 hover:scale-105 transition-transform"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 text-xs text-gray-500 pt-3 sm:pt-4 border-t border-gray-100 sm:border-t-2 font-medium">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span>📁</span>
            <span className="font-bold text-gray-700 truncate max-w-[120px] sm:max-w-none">{category}</span>
          </div>
          <div className="font-bold text-gray-600 whitespace-nowrap">
            {formatRelativeTime(new Date(timestamp))}
          </div>
        </div>
      </div>
    </div>
  );
}

