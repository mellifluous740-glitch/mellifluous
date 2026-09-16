import React, { useState, useEffect } from 'react';
import { Story, Chapter } from '../../types';
import {
  Save,
  BookOpen,
  FileText,
  Lock,
  Trash2,
  PlusCircle,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { getStoryChapters } from '../../data/mockData';
import { publishChapter, deleteChapter, subscribeToStoryChapters } from '../../lib/realtimeService';

interface AuthorEditChapterTabProps {
  stories: Story[];
  initialStoryId?: string;
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onStoriesUpdated?: () => void;
  onJumpToNewChapter?: (storyId: string) => void;
}

export const AuthorEditChapterTab: React.FC<AuthorEditChapterTabProps> = ({
  stories,
  initialStoryId,
  onFeedback,
  onStoriesUpdated,
  onJumpToNewChapter,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialStoryId || stories[0]?.id || ''
  );
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Form states
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [partType, setPartType] = useState<'main' | 'extra'>('main');
  const [chapterContent, setChapterContent] = useState('');
  const [translatorNote, setTranslatorNote] = useState('');
  const [isChapterLocked, setIsChapterLocked] = useState(false);
  const [chapterPasswordHint, setChapterPasswordHint] = useState('');
  const [chapterPasswordKey, setChapterPasswordKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load chapters when selected story changes with realtime subscription
  useEffect(() => {
    if (!selectedStoryId) return;
    const list = getStoryChapters(selectedStoryId);
    setChapters(list);
    if (list.length > 0) {
      setSelectedChapterId((prev) => (list.some((c) => c.id === prev) ? prev : list[0].id));
    } else {
      setSelectedChapterId('');
    }

    const unsub = subscribeToStoryChapters(selectedStoryId, (liveList) => {
      setChapters(liveList);
      if (liveList.length > 0) {
        setSelectedChapterId((prev) => (liveList.some((c) => c.id === prev) ? prev : liveList[0].id));
      } else {
        setSelectedChapterId('');
      }
    });

    return () => unsub();
  }, [selectedStoryId]);

  // Load chapter form data when selected chapter changes
  useEffect(() => {
    if (!selectedChapterId) {
      setChapterTitle('');
      setChapterContent('');
      setTranslatorNote('');
      setChapterPasswordHint('');
      setChapterPasswordKey('');
      return;
    }
    const ch = chapters.find((c) => c.id === selectedChapterId);
    if (ch) {
      setChapterTitle(ch.title || '');
      setChapterNumber(ch.chapterNumber || 1);
      setPartType((ch.partType as 'main' | 'extra') || (ch.isExtra ? 'extra' : 'main'));
      setChapterContent(ch.content || '');
      setTranslatorNote(ch.translatorNote || '');
      setIsChapterLocked(Boolean(ch.isLocked));
      setChapterPasswordHint(ch.passwordHint || '');
      setChapterPasswordKey(ch.passwordKey || '');
      setConfirmDelete(false);
    }
  }, [selectedChapterId, chapters]);

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoryId || !selectedChapterId) {
      onFeedback('error', 'Vui lòng chọn chương cần chỉnh sửa.');
      return;
    }
    if (!chapterTitle.trim() || !chapterContent.trim()) {
      onFeedback('error', 'Tiêu đề và nội dung chương không được để trống.');
      return;
    }

    setIsSaving(true);
    try {
      const existingCh = chapters.find((c) => c.id === selectedChapterId);
      const updatedChapter: Chapter = {
        id: selectedChapterId,
        storyId: selectedStoryId,
        chapterNumber: Number(chapterNumber) || 1,
        title: chapterTitle.trim(),
        publishedAt: existingCh?.publishedAt || new Date().toISOString(),
        isLocked: isChapterLocked,
        passwordHint: isChapterLocked ? chapterPasswordHint.trim() : '',
        passwordKey: isChapterLocked ? chapterPasswordKey.trim().toLowerCase() : '',
        content: chapterContent.trim(),
        translatorNote: translatorNote.trim(),
        wordCount: chapterContent.trim().split(/\s+/).length,
        isExtra: partType === 'extra',
        extraNumber: partType === 'extra' ? Number(chapterNumber) : 0,
        partType,
      };

      await publishChapter(updatedChapter);
      onFeedback('success', `Đã lưu cập nhật "${updatedChapter.title}" thành công!`);

      // Refresh list
      const refreshed = getStoryChapters(selectedStoryId);
      setChapters(refreshed);

      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Lỗi khi lưu thay đổi chương truyện.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!selectedStoryId || !selectedChapterId) return;
    try {
      await deleteChapter(selectedStoryId, selectedChapterId);
      onFeedback('success', 'Đã xóa chương truyện thành công.');
      setConfirmDelete(false);

      const refreshed = getStoryChapters(selectedStoryId);
      setChapters(refreshed);
      if (refreshed.length > 0) {
        setSelectedChapterId(refreshed[0].id);
      } else {
        setSelectedChapterId('');
      }

      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Không thể xóa chương truyện.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector Card */}
      <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-stone-800 border border-pink-200/80 dark:border-stone-700 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-pink-500" />
              <span>1. Chọn bộ truyện:</span>
            </label>
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium"
            >
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-pink-500" />
              <span>2. Chọn chương cần sửa ({chapters.length} chương):</span>
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              disabled={chapters.length === 0}
              className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium disabled:opacity-50"
            >
              {chapters.length === 0 ? (
                <option value="">Chưa có chương nào trong truyện này</option>
              ) : (
                chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.partType === 'extra' ? '[Phiên ngoại] ' : ''}
                    {ch.title || `Chương ${ch.chapterNumber}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {chapters.length === 0 && onJumpToNewChapter && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>Truyện này chưa có chương nào được đăng.</span>
            <button
              type="button"
              onClick={() => onJumpToNewChapter(selectedStoryId)}
              className="font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer"
            >
              + Đăng chương đầu tiên ngay
            </button>
          </div>
        )}
      </div>

      {/* Edit Chapter Form */}
      {selectedChapterId && (
        <form onSubmit={handleSaveChapter} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Phân loại
              </label>
              <select
                value={partType}
                onChange={(e) => setPartType(e.target.value as 'main' | 'extra')}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
              >
                <option value="main">Chính truyện</option>
                <option value="extra">Phiên ngoại (Ngoại truyện)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Số thứ tự chương
              </label>
              <input
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Khóa bảo vệ mật khẩu
              </label>
              <label className="h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800 dark:text-stone-100">
                <input
                  type="checkbox"
                  checked={isChapterLocked}
                  onChange={(e) => setIsChapterLocked(e.target.checked)}
                  className="rounded-sm text-pink-500 w-4 h-4 cursor-pointer"
                />
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Khóa pass chương</span>
              </label>
            </div>
          </div>

          {/* Conditional Chapter Password Box */}
          {isChapterLocked && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Thiết lập Mật khẩu riêng cho chương này:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Gợi ý giải pass cho độc giả:
                  </label>
                  <input
                    type="text"
                    value={chapterPasswordHint}
                    onChange={(e) => setChapterPasswordHint(e.target.value)}
                    placeholder="Ví dụ: Ngày sinh nhật của Cố Diễn (ddmm)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/80 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Đáp án mở pass (viết thường, không dấu):
                  </label>
                  <input
                    type="text"
                    value={chapterPasswordKey}
                    onChange={(e) => setChapterPasswordKey(e.target.value)}
                    placeholder="Ví dụ: 1208 hoặc codien..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/80 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300 font-sans">
                * Chỉ những độc giả giải đúng đáp án trên mới mở khóa và đọc được nội dung của chương này.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tiêu đề chương <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Lời nhắn gửi của Mellifluous (Translator Note)
            </label>
            <input
              type="text"
              value={translatorNote}
              onChange={(e) => setTranslatorNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Nội dung chương truyện <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                {chapterContent.trim() ? chapterContent.trim().split(/\s+/).length : 0} từ
              </span>
            </div>
            <textarea
              rows={12}
              required
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm leading-relaxed focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-serif"
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                  <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                    Xác nhận xóa chương này?
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteChapter}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
                  >
                    Xóa ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa chương này</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu cập nhật...' : 'Lưu cập nhật chương'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
