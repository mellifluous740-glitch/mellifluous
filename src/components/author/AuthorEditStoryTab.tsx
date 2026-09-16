import React, { useState, useEffect } from 'react';
import { Story } from '../../types';
import {
  Save,
  BookOpen,
  Lock,
  Key,
  Layers,
  Sparkles,
  Trash2,
  Check,
  FileEdit,
  ExternalLink,
} from 'lucide-react';
import { publishStory, deleteStory } from '../../lib/realtimeService';
import { getCustomGenres, subscribeToCustomGenres } from '../../utils/genreManager';

interface AuthorEditStoryTabProps {
  stories: Story[];
  initialSelectedStoryId?: string;
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onStoriesUpdated?: () => void;
  onJumpToChapters?: (storyId: string) => void;
}

const PRESET_COVERS = [
  { name: 'Hoa anh đào & Nắng', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=800&auto=format&fit=crop' },
  { name: 'Khu rừng mùa hè', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Góc phố bình yên', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bầu trời hoàng hôn', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ánh trăng huyền ảo', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=800&auto=format&fit=crop' },
];

export const AuthorEditStoryTab: React.FC<AuthorEditStoryTabProps> = ({
  stories,
  initialSelectedStoryId,
  onFeedback,
  onStoriesUpdated,
  onJumpToChapters,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialSelectedStoryId || stories[0]?.id || ''
  );

  const [availableGenres, setAvailableGenres] = useState<string[]>(() => getCustomGenres());

  useEffect(() => {
    const unsub = subscribeToCustomGenres((genres) => {
      setAvailableGenres(genres);
    });
    return unsub;
  }, []);

  const selectedStory = stories.find((s) => s.id === selectedStoryId) || stories[0];

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('Mellifluous');
  const [status, setStatus] = useState<'completed' | 'ongoing'>('ongoing');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [totalChapters, setTotalChapters] = useState(30);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordKey, setPasswordKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load selected story details into form
  useEffect(() => {
    if (selectedStory) {
      setTitle(selectedStory.title || '');
      setOriginalTitle(selectedStory.originalTitle || '');
      setAuthor(selectedStory.author || '');
      setTranslator(selectedStory.translator || 'Mellifluous');
      setStatus(selectedStory.status || 'ongoing');
      setSelectedGenres(Array.isArray(selectedStory.genre) ? selectedStory.genre : ['Ngôn tình']);
      setSummary(selectedStory.summary || '');
      setCoverImage(selectedStory.coverImage || PRESET_COVERS[0].url);
      setTotalChapters(selectedStory.totalChapters || 30);
      setHasPassword(Boolean(selectedStory.hasPassword));
      setPasswordHint(selectedStory.passwordHint || '');
      setPasswordKey(selectedStory.passwordKey || '');
      setConfirmDelete(false);
    }
  }, [selectedStoryId, selectedStory]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCustomGenre = () => {
    if (customGenre.trim() && !selectedGenres.includes(customGenre.trim())) {
      setSelectedGenres((prev) => [...prev, customGenre.trim()]);
      setCustomGenre('');
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) {
      onFeedback('error', 'Chưa chọn truyện để chỉnh sửa.');
      return;
    }
    if (!title.trim() || !author.trim()) {
      onFeedback('error', 'Tên truyện và tên tác giả không được để trống.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedStory: Story = {
        ...selectedStory,
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        author: author.trim(),
        translator: translator.trim() || 'Mellifluous',
        status,
        genre: selectedGenres.length > 0 ? selectedGenres : ['Ngôn tình'],
        summary: summary.trim(),
        totalChapters: Number(totalChapters) || selectedStory.totalChapters || 1,
        mainChaptersCount: Number(totalChapters) || selectedStory.mainChaptersCount || 1,
        coverImage: coverImage.trim() || PRESET_COVERS[0].url,
        hasPassword,
        passwordHint: hasPassword ? passwordHint.trim() : '',
        passwordKey: hasPassword ? passwordKey.trim().toLowerCase() : '',
        updatedAt: 'Vừa cập nhật',
      };

      await publishStory(updatedStory);
      onFeedback('success', `Đã cập nhật thành công tác phẩm "${updatedStory.title}"!`);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Không thể lưu thay đổi vào cơ sở dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!selectedStory) return;
    try {
      await deleteStory(selectedStory.id);
      onFeedback('success', `Đã xóa tác phẩm "${selectedStory.title}".`);
      setConfirmDelete(false);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Không thể xóa tác phẩm.');
    }
  };

  if (stories.length === 0) {
    return (
      <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700">
        <p className="text-sm font-serif text-stone-700 dark:text-stone-300">
          Chưa có tác phẩm nào để chỉnh sửa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Story Selector Card */}
      <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-stone-800 border border-pink-200/80 dark:border-stone-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-pink-500" />
              <span>Chọn bộ truyện cần chỉnh sửa:</span>
            </label>
            <p className="text-xs text-stone-500">
              Chỉnh sửa thông tin tác phẩm, văn án, bìa truyện, phân loại hoặc cài đặt password.
            </p>
          </div>

          {onJumpToChapters && selectedStory && (
            <button
              type="button"
              onClick={() => onJumpToChapters(selectedStory.id)}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs transition-colors"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Sửa các chương truyện này</span>
            </button>
          )}
        </div>

        <select
          value={selectedStoryId}
          onChange={(e) => setSelectedStoryId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm font-medium text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
        >
          {stories.map((s) => (
            <option key={s.id} value={s.id}>
              📖 {s.title} ({s.status === 'completed' ? 'Đã hoàn thành' : 'Đang ra'} • {s.author})
            </option>
          ))}
        </select>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveStory} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tên truyện tiếng Việt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tên gốc tiếng Trung / Hàn (nếu có)
            </label>
            <input
              type="text"
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tác giả gốc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Dịch giả / Editor
            </label>
            <input
              type="text"
              value={translator}
              onChange={(e) => setTranslator(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tình trạng truyện
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'completed' | 'ongoing')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            >
              <option value="ongoing">Đang tiến hành (Ongoing)</option>
              <option value="completed">Đã hoàn thành (Completed)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tổng số chương dự kiến
            </label>
            <input
              type="number"
              min={1}
              value={totalChapters}
              onChange={(e) => setTotalChapters(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Genres Selection */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
            Thể loại / Thẻ tag ({selectedGenres.length} đã chọn)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{genre}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Thêm thể loại tùy chỉnh..."
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomGenre();
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs w-64 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustomGenre}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-xs font-medium cursor-pointer"
            >
              + Thêm tag
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
            Ảnh bìa truyện (URL hoặc chọn mẫu có sẵn)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Dán link ảnh bìa trực tiếp..."
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono"
            />
            {coverImage && (
              <img
                src={coverImage}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg border border-pink-200 shrink-0"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COVERS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setCoverImage(preset.url)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  coverImage === preset.url
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 font-bold'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-pink-300 dark:hover:border-stone-500'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1 pt-1">
          <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
            Văn án / Giới thiệu tác phẩm
          </label>
          <textarea
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Nội dung tóm tắt cốt truyện..."
            className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-serif leading-relaxed focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
          />
        </div>

        {/* Password Settings */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-700 space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPassword}
              onChange={(e) => setHasPassword(e.target.checked)}
              className="rounded-sm text-amber-500 focus:ring-amber-400"
            />
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Kích hoạt khóa Mật khẩu / Password cho tác phẩm này</span>
          </label>

          {hasPassword && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                  Câu hỏi gợi ý mật khẩu (Hiển thị cho độc giả)
                </label>
                <input
                  type="text"
                  placeholder="VD: Tên con mèo đầu tiên của nam chính viết liền không dấu"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                  Đáp án giải mã chính xác
                </label>
                <input
                  type="text"
                  placeholder="VD: hoaanhdao"
                  value={passwordKey}
                  onChange={(e) => setPasswordKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                  Xác nhận xóa vĩnh viễn truyện này?
                </span>
                <button
                  type="button"
                  onClick={handleDeleteStory}
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
                <span>Xóa tác phẩm này</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu cập nhật...' : 'Lưu cập nhật tác phẩm'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
