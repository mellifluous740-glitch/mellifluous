import React, { useState, useEffect } from 'react';
import {
  Library,
  BookOpen,
  Bookmark,
  Trash2,
  X,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  LogIn,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import {
  subscribeToReadingList,
  removeFromReadingList,
  getLocalReadingList,
} from '../lib/readingListService';
import { ReadingProgressItem, Story } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface ReadingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  onSelectStoryChapter: (story: Story, chapterNumber?: number) => void;
  onOpenStoryDetail?: (story: Story) => void;
}

export const ReadingListModal: React.FC<ReadingListModalProps> = ({
  isOpen,
  onClose,
  stories,
  onSelectStoryChapter,
  onOpenStoryDetail,
}) => {
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState<ReadingProgressItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Subscribe to reading list updates
  useEffect(() => {
    if (!isOpen) return;

    const currentUserId = user?.uid || 'guest';
    const initialList = getLocalReadingList(currentUserId);
    setItems(initialList);

    const unsubscribe = subscribeToReadingList(currentUserId, (updatedItems) => {
      setItems(updatedItems);
    });

    return () => unsubscribe();
  }, [isOpen, user?.uid]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentUserId = user?.uid || 'guest';

  // Filter items
  const filteredItems = items.filter((item) => {
    const story = stories.find((s) => s.id === item.storyId);
    const totalChapters = story?.completedChapters || story?.totalChapters || item.totalChapters || 1;
    const currentChapter = item.lastReadChapterNumber || 1;
    const isCompleted = currentChapter >= totalChapters && totalChapters > 0;

    if (filterType === 'in_progress' && isCompleted) return false;
    if (filterType === 'completed' && !isCompleted) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      item.storyTitle.toLowerCase().includes(query) ||
      (item.storyAuthor && item.storyAuthor.toLowerCase().includes(query)) ||
      (item.lastReadChapterTitle && item.lastReadChapterTitle.toLowerCase().includes(query))
    );
  });

  const handleRemove = async (storyId: string) => {
    await removeFromReadingList(currentUserId, storyId);
    setConfirmDeleteId(null);
  };

  const handleContinueReading = (item: ReadingProgressItem) => {
    const targetStory = stories.find((s) => s.id === item.storyId);
    if (targetStory) {
      onClose();
      onSelectStoryChapter(targetStory, item.lastReadChapterNumber || 1);
    }
  };

  const handleViewStory = (item: ReadingProgressItem) => {
    const targetStory = stories.find((s) => s.id === item.storyId);
    if (targetStory && onOpenStoryDetail) {
      onClose();
      onOpenStoryDetail(targetStory);
    }
  };

  return (
    <div
      id="reading-list-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="reading-list-modal-container"
        className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl border border-pink-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-pink-100 dark:border-stone-800 bg-gradient-to-r from-pink-50/80 via-white to-amber-50/50 dark:from-stone-900 dark:to-stone-850 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-850 dark:text-stone-100">
                  Danh sách đọc của tôi
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-mono text-xs font-bold">
                  {items.length}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {user ? (
                  <span>
                    Đang lưu trữ & đồng bộ tự động theo tài khoản{' '}
                    <strong className="text-pink-600 dark:text-pink-400">
                      {user.displayName || user.email}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Tiến trình đọc lưu trên trình duyệt này.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openAuthModal();
                      }}
                      className="text-pink-600 dark:text-pink-400 underline font-medium hover:text-pink-700 cursor-pointer"
                    >
                      Đăng nhập để đồng bộ qua thiết bị khác
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng danh sách đọc"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Not Logged In Banner (Gentle Callout) */}
        {!user && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-950/40 dark:to-pink-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Đăng nhập giúp lưu vĩnh viễn sách và tiến trình chương đọc của bạn lên máy chủ mây.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="px-3 py-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 dark:bg-stone-800 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-850 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-850'
              }`}
            >
              Tất cả ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('in_progress')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filterType === 'in_progress'
                  ? 'bg-white dark:bg-stone-700 text-stone-850 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-850'
              }`}
            >
              Đang đọc dở
            </button>
            <button
              type="button"
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filterType === 'completed'
                  ? 'bg-white dark:bg-stone-700 text-stone-850 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-850'
              }`}
            >
              Đã đọc xong
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm trong danh sách đọc..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-850 dark:text-stone-100 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Story List Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-950/60 text-pink-400 flex items-center justify-center mx-auto border border-pink-100 dark:border-pink-900/60">
                <Bookmark className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-serif text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100">
                  {searchQuery ? 'Không tìm thấy tác phẩm phù hợp' : 'Danh sách đọc đang trống'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  {searchQuery
                    ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                    : 'Khi xem truyện hoặc đọc chương, bạn có thể bấm "Lưu vào Danh sách đọc" để dễ dàng theo dõi tiến trình đọc bất cứ lúc nào.'}
                </p>
              </div>

              {!searchQuery && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-md shadow-pink-500/20 transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Khám phá các bộ truyện ngay</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const matchedStory = stories.find((s) => s.id === item.storyId);
              const totalChapters =
                matchedStory?.completedChapters ||
                matchedStory?.totalChapters ||
                item.totalChapters ||
                1;
              const currentChapterNum = item.lastReadChapterNumber || 1;
              const progressPct = Math.min(
                100,
                Math.round((currentChapterNum / Math.max(1, totalChapters)) * 100)
              );
              const isFinished = currentChapterNum >= totalChapters && totalChapters > 0;

              return (
                <div
                  key={item.storyId}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-750 hover:border-pink-300 dark:hover:border-pink-800/80 transition-all shadow-2xs hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  {/* Left: Story Cover & Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className="w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 shadow-xs cursor-pointer group-hover:scale-102 transition-transform relative"
                      onClick={() => handleViewStory(item)}
                    >
                      {item.storyCover ? (
                        <img
                          src={item.storyCover}
                          alt={item.storyTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-pink-100 dark:bg-pink-950 text-pink-500 text-xs font-serif p-1 text-center">
                          {item.storyTitle}
                        </div>
                      )}
                      {isFinished && (
                        <div className="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => handleViewStory(item)}
                          className="font-serif text-sm sm:text-base font-bold text-stone-850 dark:text-stone-100 truncate hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                        >
                          {item.storyTitle}
                        </h4>
                        {matchedStory?.status === 'completed' ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium shrink-0">
                            Đã hoàn
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-medium shrink-0">
                            Đang ra
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <span>{item.storyAuthor || 'Mellifluous'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{formatRelativeTime(item.updatedAt)}</span>
                        </span>
                      </div>

                      {/* Reading Progress Banner */}
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-pink-700 dark:text-pink-300 font-medium truncate max-w-[240px]">
                            📖 Đang đọc đến:{' '}
                            <strong className="font-semibold">
                              Chương {currentChapterNum}
                              {item.lastReadChapterTitle ? ` - ${item.lastReadChapterTitle}` : ''}
                            </strong>
                          </span>
                          <span className="font-mono text-[11px] text-stone-400 shrink-0 ml-2">
                            {currentChapterNum}/{totalChapters} ({progressPct}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFinished
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-pink-400 to-rose-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    {confirmDeleteId === item.storyId ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          Xóa khỏi ds?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.storyId)}
                          className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.storyId)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Bỏ khỏi danh sách đọc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleContinueReading(item)}
                      className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-pink-500/20 transition-all cursor-pointer hover:gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isFinished ? 'Đọc lại' : 'Đọc tiếp'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span className="font-serif italic">Mellifluous Reader Library</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition-colors cursor-pointer font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
