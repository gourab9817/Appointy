import { PDF, ViewMode } from '../types';
import { formatRelativeTime } from '../utils/search';

interface PDFCardProps {
  pdf: PDF;
  onClick: () => void;
  onDelete: (id: string) => void;
  viewMode: ViewMode;
}

export default function PDFCard({ pdf, onClick, onDelete, viewMode }: PDFCardProps) {
  const { title, summary, tags, page_count, file_size, timestamp } = pdf;
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this PDF?')) {
      onDelete(pdf.id);
    }
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="group bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl sm:hover:shadow-2xl border border-gray-200 sm:border-2 sm:border-gray-100 
                    transition-all duration-300 flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6 relative hover:-translate-y-0.5 sm:hover:-translate-y-1">
        {/* Actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
            🗑️
          </button>
        </div>

        {/* PDF Icon */}
        <div onClick={onClick} className="w-full sm:w-32 lg:w-40 h-32 lg:h-40 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-5xl sm:text-6xl cursor-pointer flex-shrink-0 shadow-lg">
          📕
        </div>

        {/* Content */}
        <div onClick={onClick} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold shadow-md">
              📕 PDF
            </span>
            {page_count && (
              <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-semibold border border-orange-200">
                {page_count} pages
              </span>
            )}
            {file_size && (
              <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-semibold border border-orange-200">
                {formatFileSize(file_size)}
              </span>
            )}
          </div>
          <h3 className="font-bold text-base sm:text-lg lg:text-xl text-gray-900 line-clamp-2 mb-2 leading-tight">{title}</h3>
          {summary && (
            <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{summary}</p>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-2">
              {tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-xs bg-orange-50 text-orange-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold border border-orange-200">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500 font-medium pt-2 border-t border-gray-100">
            {formatRelativeTime(new Date(timestamp))}
          </div>
        </div>
      </div>
    );
  }

  // Grid/Masonry view
  return (
    <div className={`group bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-200 sm:border-2 sm:border-gray-100 overflow-hidden 
               hover:shadow-xl sm:hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-orange-300 transition-all duration-300 
               animate-fade-in relative w-full ${viewMode === 'masonry' ? 'mb-3 sm:mb-4 lg:mb-5 break-inside-avoid' : ''}`}>
      
      {/* Actions */}
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
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4 z-20">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold shadow-md sm:shadow-lg border border-white/30 sm:border-2">
          📕 <span className="hidden sm:inline">PDF</span>
        </div>
      </div>
      
      {/* PDF Header */}
      <div 
        onClick={onClick}
        className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-orange-500 via-red-500 to-red-600 flex items-center justify-center cursor-pointer group-hover:scale-[1.02] sm:group-hover:scale-105 transition-transform duration-300 shadow-inner"
      >
        <div className="text-center text-white">
          <div className="text-7xl sm:text-8xl lg:text-9xl mb-3 drop-shadow-2xl">📕</div>
          {(page_count || file_size) && (
            <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold">
              {page_count && <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">
                {page_count} pages
              </span>}
              {file_size && <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">
                {formatFileSize(file_size)}
              </span>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div onClick={onClick} className="p-3 sm:p-4 lg:p-5 xl:p-6 cursor-pointer">
        <h3 className="font-bold text-base sm:text-lg lg:text-xl text-gray-900 mb-2 sm:mb-3 line-clamp-2 
                     group-hover:text-orange-600 transition-colors leading-tight">
          {title}
        </h3>

        {summary && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-orange-50 border-l-2 sm:border-l-4 border-orange-500 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-700 line-clamp-3 leading-relaxed">
              {summary}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-50 text-orange-700 text-xs font-bold 
                         rounded-full border border-orange-200 hover:scale-105 transition-transform"
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
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 sm:pt-4 border-t border-gray-100 sm:border-t-2 font-medium">
          <span className="text-orange-600 font-bold">📕 PDF Document</span>
          <div className="font-bold text-gray-600">
            {formatRelativeTime(new Date(timestamp))}
          </div>
        </div>
      </div>
    </div>
  );
}

