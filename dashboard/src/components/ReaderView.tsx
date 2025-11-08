import { Memory } from '../types';

interface ReaderViewProps {
  memory: Memory;
  onClose: () => void;
}

export default function ReaderView({ memory, onClose }: ReaderViewProps) {
  const { title, full_text, word_count, url, note, created_at } = memory;

  if (!full_text) {
    return null;
  }

  const readingTime = word_count ? Math.ceil(word_count / 200) : 0; // 200 words per minute

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{title}</h1>
              <div className="flex items-center gap-4 text-sm opacity-90">
                {word_count && (
                  <span>📊 {word_count.toLocaleString()} words</span>
                )}
                {readingTime > 0 && (
                  <span>⏱️ {readingTime} min read</span>
                )}
                <span>🗓️ {new Date(created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Personal Note */}
        {note && (
          <div className="bg-primary-50 border-l-4 border-primary-500 p-4 m-6 mb-0">
            <div className="text-xs font-bold text-primary-900 mb-1">📝 YOUR NOTE:</div>
            <div className="text-sm text-primary-800">{note}</div>
          </div>
        )}

        {/* Article Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <article className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
              {full_text}
            </div>
          </article>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-2"
          >
            🔗 View Original
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}

