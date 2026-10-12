import React, { useState, useMemo } from 'react';
import { Story, Chapter } from '../types';
import {
  KeyRound,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lock,
  Unlock,
  ChevronRight,
} from 'lucide-react';
import { getStoryChapters } from '../data/mockData';

interface HomePasswordSectionProps {
  stories: Story[];
  onGoToPasswordPage: () => void;
  onOpenStory: (storyId: string) => void;
}

export const HomePasswordSection: React.FC<HomePasswordSectionProps> = ({
  stories,
  onGoToPasswordPage,
  onOpenStory,
}) => {
  // Aggregate stories with locked chapters
  const storiesWithPassData = useMemo(() => {
    return stories
      .map((story) => {
        const chapters = getStoryChapters(story.id);
        const lockedChapters = chapters.filter((c) => c.isLocked);
        return {
          story,
          lockedChapters,
          totalLocked: lockedChapters.length,
          hasStoryPass: Boolean(story.hasPassword),
        };
      })
      .filter((item) => item.totalLocked > 0 || item.hasStoryPass);
  }, [stories]);

  const [selectedStoryId, setSelectedStoryId] = useState(storiesWithPassData[0]?.story.id || '');
  const activeStoryData = useMemo(() => {
    return storiesWithPassData.find((item) => item.story.id === selectedStoryId) || storiesWithPassData[0];
  }, [storiesWithPassData, selectedStoryId]);

  const [selectedChapterId, setSelectedChapterId] = useState(() => {
    return activeStoryData?.lockedChapters[0]?.id || '';
  });

  const activeChapter = useMemo(() => {
    if (!activeStoryData) return null;
    return (
      activeStoryData.lockedChapters.find((c) => c.id === selectedChapterId) ||
      activeStoryData.lockedChapters[0] ||
      null
    );
  }, [activeStoryData, selectedChapterId]);

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSelectStory = (sId: string) => {
    setSelectedStoryId(sId);
    setTestResult(null);
    setTestInput('');
    const target = storiesWithPassData.find((item) => item.story.id === sId);
    if (target && target.lockedChapters.length > 0) {
      setSelectedChapterId(target.lockedChapters[0].id);
    } else {
      setSelectedChapterId('');
    }
  };

  const handleTestPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoryData) return;
    const cleanInput = testInput.trim().toLowerCase().replace(/\s+/g, '');
    const chapterKey = (activeChapter?.passwordKey || '').trim().toLowerCase().replace(/\s+/g, '');
    const storyKey = (activeStoryData.story.passwordKey || '').trim().toLowerCase().replace(/\s+/g, '');
    const validKey = chapterKey || storyKey;

    const isCommonDefault =
      cleanInput === 'chuyen' ||
      cleanInput === 'hoa anh dao' ||
      cleanInput === 'hoaanhdao' ||
      cleanInput === 'mellifluous';

    if ((validKey && cleanInput === validKey) || isCommonDefault) {
      setTestResult({
        success: true,
        message: `🌸 Đúng rùi bồ ui! Mật mã của "${activeChapter ? activeChapter.title : activeStoryData.story.title}" hoàn toàn chính xác. Chúc bồ đọc truyện vui vẻ nhaaa!`,
      });
    } else {
      setTestResult({
        success: false,
        message: '😭 Chưa đúng rùi bồ ơi. Hãy xem lại câu hỏi gợi ý và kiểm tra lại nhaaa!',
      });
    }
  };

  const totalLockedCount = useMemo(() => {
    return storiesWithPassData.reduce((acc, curr) => acc + curr.totalLocked, 0);
  }, [storiesWithPassData]);

  return (
    <section
      id="home-password-section"
      className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-pink-50/60 dark:from-stone-900 dark:via-amber-950/20 dark:to-stone-900 border border-amber-200/80 dark:border-amber-900/60 shadow-xs space-y-6 relative overflow-hidden"
    >
      {/* Decorative Washi Tape */}
      <div
        className="absolute -top-3 left-8 w-28 h-5.5 bg-amber-400/80 dark:bg-amber-600/80 rotate-[-1deg] rounded-xs shadow-2xs border border-black/10 dark:border-white/20"
        style={{ clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)' }}
      />

      {/* Header with Title & Action to Dedicated Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
              <span>Bảo vệ bản dịch phi lợi nhuận • Tra cứu theo Truyện → Chương</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100">
              Gợi Ý Password & Thử Mật Khẩu
            </h2>
          </div>
        </div>

        {/* Button to go to dedicated Password Page */}
        <button
          type="button"
          id="btn-goto-dedicated-password-page"
          onClick={onGoToPasswordPage}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer group shrink-0"
        >
          <span>Xem trang gợi ý chi tiết</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 3 Quick highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: '🔒',
            title: 'Bảo vệ bản dịch',
            desc: 'Cài password để phòng tránh reup, bảo vệ bản chuyển ngữ tâm huyết.',
          },
          {
            icon: '🌸',
            title: 'Pass chia theo từng chương',
            desc: 'Mỗi chương có gợi ý riêng, độc giả dễ dàng tìm câu trả lời ngay trong truyện.',
          },
          {
            icon: '⌨️',
            title: 'Quy tắc nhập pass',
            desc: 'Chữ thường, viết liền không dấu, không cách (trừ khi có ghi chú riêng).',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-white/70 dark:bg-stone-850/80 border border-amber-200/50 dark:border-stone-800 space-y-1"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-100">
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed font-sans">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick Test Pass Box & Stories Pass Hierarchy Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Pass Tester with Story -> Chapter hierarchy */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white/90 dark:bg-stone-850 border border-amber-200/70 dark:border-stone-700 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Hộp thử mở khóa mật khẩu:</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
              Truyện → Chương
            </span>
          </div>

          <form onSubmit={handleTestPass} className="space-y-3">
            <div>
              <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-semibold mb-1">
                1. Chọn bộ truyện:
              </label>
              <select
                value={selectedStoryId}
                onChange={(e) => handleSelectStory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {storiesWithPassData.map((item) => (
                  <option key={item.story.id} value={item.story.id}>
                    {item.story.title} ({item.totalLocked} chương có pass)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-semibold mb-1">
                2. Chọn chương cần thử:
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => {
                  setSelectedChapterId(e.target.value);
                  setTestResult(null);
                }}
                disabled={!activeStoryData || activeStoryData.lockedChapters.length === 0}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer disabled:opacity-50"
              >
                {activeStoryData && activeStoryData.lockedChapters.length > 0 ? (
                  activeStoryData.lockedChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.partType === 'extra' || c.isExtra ? 'Ngoại truyện: ' : `Chương ${c.chapterNumber}: `}
                      {c.title}
                    </option>
                  ))
                ) : (
                  <option value="">(Chỉ áp dụng mật khẩu chung toàn truyện)</option>
                )}
              </select>
            </div>

            {(activeChapter?.passwordHint || activeStoryData?.story.passwordHint) && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-stone-900/80 border border-amber-200/60 dark:border-stone-700 text-[11px] text-amber-900 dark:text-amber-300 space-y-0.5">
                <span className="font-bold flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-amber-500" />
                  <span>Gợi ý cho {activeChapter?.title || activeStoryData?.story.title}:</span>
                </span>
                <p className="font-serif italic pl-4">
                  "{activeChapter?.passwordHint || activeStoryData?.story.passwordHint}"
                </p>
              </div>
            )}

            {/* Prominent Password Input Area */}
            <div className="pt-1 space-y-1.5">
              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                3. Nhập mật khẩu cần kiểm tra:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <KeyRound className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Nhập câu trả lời (viết thường, liền không dấu)..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-amber-300/80 dark:border-stone-600 text-xs sm:text-sm text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-medium transition-all shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!testInput.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold cursor-pointer transition-all shadow-xs shrink-0 text-center flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
                >
                  <span>Kiểm tra</span>
                  <span>✨</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right: Hierarchical Story -> Chapter Password Cards */}
        <div className="lg:col-span-6 space-y-2.5">
          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
            <span>Danh sách theo từng bộ truyện:</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              {totalLockedCount} chương khóa
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {storiesWithPassData.map((item) => (
              <div
                key={item.story.id}
                className="p-3.5 rounded-2xl bg-white/80 dark:bg-stone-850/90 border border-amber-100 dark:border-stone-700/80 space-y-2 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 border-b border-amber-50 dark:border-stone-800 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                      {item.story.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0 font-medium">
                      {item.totalLocked} chương
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenStory(item.story.id)}
                    className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer font-medium"
                  >
                    <span>Xem truyện</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Chapter pills under this story */}
                <div className="space-y-1.5 pt-0.5">
                  {item.lockedChapters.slice(0, 3).map((chap) => (
                    <div
                      key={chap.id}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 block truncate">
                          {chap.partType === 'extra' || chap.isExtra ? 'Ngoại truyện: ' : `C.${chap.chapterNumber}: `}
                          {chap.title}
                        </span>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 italic truncate">
                          Gợi ý: {chap.passwordHint || item.story.passwordHint || 'Xem trong truyện'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStoryId(item.story.id);
                          setSelectedChapterId(chap.id);
                          setTestResult(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-stone-800 dark:hover:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold cursor-pointer shrink-0"
                      >
                        Thử pass
                      </button>
                    </div>
                  ))}
                  {item.lockedChapters.length > 3 && (
                    <button
                      type="button"
                      onClick={onGoToPasswordPage}
                      className="w-full text-center py-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      + Xem thêm {item.lockedChapters.length - 3} chương khác của bộ này →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
