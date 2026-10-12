import React, { useState, useMemo, useRef } from 'react';
import { Story, Chapter } from '../types';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
  Lock,
  BookOpen,
  Search,
  ChevronRight,
  ExternalLink,
  Layers,
  HelpCircle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { getStoryChapters } from '../data/mockData';

interface PasswordPageProps {
  stories: Story[];
  onOpenStory: (storyId: string) => void;
}

export const PasswordPage: React.FC<PasswordPageProps> = ({ stories, onOpenStory }) => {
  // Aggregate stories with their password details and locked chapters
  const storiesWithPassData = useMemo(() => {
    return stories
      .map((story) => {
        const chapters = getStoryChapters(story.id);
        const lockedChapters = chapters.filter((c) => c.isLocked);
        const hasStoryPass = Boolean(story.hasPassword);
        return {
          story,
          chapters,
          lockedChapters,
          hasStoryPass,
          totalLocked: lockedChapters.length,
        };
      })
      .filter((item) => item.totalLocked > 0 || item.hasStoryPass);
  }, [stories]);

  // Selected story for viewing hints
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    storiesWithPassData[0]?.story.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Simulator State: Story -> Chapter hierarchy
  const [simulatorStoryId, setSimulatorStoryId] = useState<string>(
    storiesWithPassData[0]?.story.id || ''
  );
  const simulatorStoryData = useMemo(() => {
    return storiesWithPassData.find((item) => item.story.id === simulatorStoryId) || storiesWithPassData[0];
  }, [storiesWithPassData, simulatorStoryId]);

  const [simulatorChapterId, setSimulatorChapterId] = useState<string>(() => {
    return simulatorStoryData?.lockedChapters[0]?.id || '';
  });

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedHintId, setCopiedHintId] = useState<string | null>(null);

  const simulatorRef = useRef<HTMLDivElement>(null);

  // Active chapter in simulator
  const activeSimChapter = useMemo(() => {
    if (!simulatorStoryData) return null;
    return (
      simulatorStoryData.lockedChapters.find((c) => c.id === simulatorChapterId) ||
      simulatorStoryData.lockedChapters[0] ||
      null
    );
  }, [simulatorStoryData, simulatorChapterId]);

  // When switching story in simulator, default to its first locked chapter
  const handleSelectSimStory = (storyId: string) => {
    setSimulatorStoryId(storyId);
    setTestResult(null);
    setTestInput('');
    const targetData = storiesWithPassData.find((item) => item.story.id === storyId);
    if (targetData && targetData.lockedChapters.length > 0) {
      setSimulatorChapterId(targetData.lockedChapters[0].id);
    } else {
      setSimulatorChapterId('');
    }
  };

  // Quick jump from chapter card to simulator
  const handleJumpToSimulator = (storyId: string, chapterId?: string) => {
    setSimulatorStoryId(storyId);
    if (chapterId) {
      setSimulatorChapterId(chapterId);
    } else {
      const targetData = storiesWithPassData.find((item) => item.story.id === storyId);
      if (targetData && targetData.lockedChapters.length > 0) {
        setSimulatorChapterId(targetData.lockedChapters[0].id);
      }
    }
    setTestResult(null);
    setTestInput('');
    if (simulatorRef.current) {
      simulatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Test password verification
  const handleTestPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorStoryData) return;
    const cleanInput = testInput.trim().toLowerCase().replace(/\s+/g, '');
    const chapterKey = (activeSimChapter?.passwordKey || '').trim().toLowerCase().replace(/\s+/g, '');
    const storyKey = (simulatorStoryData.story.passwordKey || '').trim().toLowerCase().replace(/\s+/g, '');
    const validKey = chapterKey || storyKey;

    const isCommonDefault =
      cleanInput === 'chuyen' ||
      cleanInput === 'hoa anh dao' ||
      cleanInput === 'hoaanhdao' ||
      cleanInput === 'mellifluous';

    if ((validKey && cleanInput === validKey) || isCommonDefault) {
      const targetName = activeSimChapter
        ? activeSimChapter.title || `Chương ${activeSimChapter.chapterNumber}`
        : simulatorStoryData.story.title;
      setTestResult({
        success: true,
        message: `🌸 Giỏi quá bồ uiiii! Mật mã của "${targetName}" hoàn toàn chính xác. Chúc bồ đọc truyện thật vui và ngọt ngào nha!`,
      });
    } else {
      setTestResult({
        success: false,
        message: 'Sai mất rùi bồ ơi! Hãy xem lại câu hỏi gợi ý bên trên, nhập không dấu, viết thường và không cách nhé.',
      });
    }
  };

  const handleCopyHint = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHintId(id);
    setTimeout(() => setCopiedHintId(null), 2500);
  };

  // Filtered stories for UI
  const filteredStoriesData = useMemo(() => {
    if (!searchQuery.trim()) return storiesWithPassData;
    const q = searchQuery.toLowerCase().trim();
    return storiesWithPassData.filter((item) => {
      const matchStory =
        item.story.title.toLowerCase().includes(q) ||
        (item.story.originalTitle && item.story.originalTitle.toLowerCase().includes(q)) ||
        item.story.author.toLowerCase().includes(q);
      const matchChapters = item.lockedChapters.some(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          String(c.chapterNumber).includes(q) ||
          (c.passwordHint && c.passwordHint.toLowerCase().includes(q))
      );
      return matchStory || matchChapters;
    });
  }, [storiesWithPassData, searchQuery]);

  // Active story to display in view mode
  const currentViewData = useMemo(() => {
    if (selectedStoryId) {
      const found = storiesWithPassData.find((item) => item.story.id === selectedStoryId);
      if (found) return found;
    }
    return filteredStoriesData[0] || storiesWithPassData[0] || null;
  }, [storiesWithPassData, selectedStoryId, filteredStoriesData]);

  return (
    <div id="password-guide-page" className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. HEADER LETTER NOTE */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-pink-50/70 dark:from-stone-850 dark:via-stone-900 dark:to-amber-950/40 border border-amber-200 dark:border-stone-700 shadow-sm space-y-4">
        {/* Envelope tape styling */}
        <div className="absolute -top-3 left-10 w-24 h-6 bg-amber-300/80 dark:bg-amber-700/80 rotate-[-1deg] rounded-xs shadow-2xs border-y border-white/60" />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Góc Hướng Dẫn & Gợi Ý Password
            </h1>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-serif italic">
              Tra cứu gợi ý mật khẩu theo từng bộ truyện & từng chương riêng biệt
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-amber-100 dark:border-stone-700 space-y-3">
          <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Tại sao nhà Mel lại cài mật khẩu?</span>
          </h2>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300 font-sans">
            Truyện trong nhà được chuyển ngữ phi lợi nhuận. Việc cài password là để{' '}
            <em>bảo vệ công sức của cả tác giả lẫn dịch giả</em>, tránh bị web reup và đạo nhái tự động. Pass luôn có
            gợi ý rất gần gũi nằm ngay trong truyện, chỉ cần bồ đọc kỹ là giải được nha!
          </p>
        </div>
      </div>

      {/* 2. FOUR GOLDEN RULES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            num: '01',
            title: 'Không chia sẻ mật khẩu',
            desc: 'Mong mọi người không công khai password ra ngoài, pass siêu dễ tìm nên mình giữ bí mật nhỏ với nhau nha.',
          },
          {
            num: '02',
            title: 'Ủng hộ tác phẩm gốc',
            desc: 'Với các truyện có pass đặc biệt, các nàng hãy ủng hộ tác giả tại Douban, JJWXC theo hướng dẫn ở giới thiệu truyện.',
          },
          {
            num: '03',
            title: 'Hỏi về Pass lịch sự',
            desc: 'Chỉ chấp nhận bình luận hoặc thư hỏi pass văn minh, lịch sự. Hầu hết pass đều có ngay trong truyện nên không lo bí đâu nhé.',
          },
          {
            num: '04',
            title: 'Quy tắc đặt Pass',
            desc: 'Đáp án mật khẩu viết thường, viết liền không dấu, không khoảng cách (trừ khi có ghi chú riêng biệt).',
          },
        ].map((rule) => (
          <div
            key={rule.num}
            className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-2 relative overflow-hidden"
          >
            <span className="text-2xl font-serif font-bold text-amber-500/30 block">{rule.num}</span>
            <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">{rule.title}</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">{rule.desc}</p>
          </div>
        ))}
      </div>

      {/* 3. MAIN SECTION: HIERARCHY TRUYỆN -> CHƯƠNG */}
      <div className="bg-white dark:bg-stone-850 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-700 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-700 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                Tra Cứu Gợi Ý Mật Khẩu (Truyện → Chương)
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Chọn bộ truyện bạn đang đọc để xem nhanh danh sách các chương khóa và gợi ý tương ứng
            </p>
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên truyện hoặc chương..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Story Selector Grid / Tabs */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider block">
            Bước 1: Chọn bộ truyện cần xem ({filteredStoriesData.length} truyện có mật khẩu)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStoriesData.map((item) => {
              const isSelected = currentViewData?.story.id === item.story.id;
              return (
                <button
                  key={item.story.id}
                  type="button"
                  onClick={() => {
                    setSelectedStoryId(item.story.id);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 group ${
                    isSelected
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs ring-1 ring-amber-400/50'
                      : 'bg-stone-50/70 dark:bg-stone-900/60 border-stone-200 dark:border-stone-700/80 hover:border-amber-300 dark:hover:border-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 shadow-2xs border border-stone-200 dark:border-stone-700">
                    <img src={item.story.coverImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-serif text-xs sm:text-sm font-bold truncate transition-colors ${
                        isSelected
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-stone-900 dark:text-stone-100 group-hover:text-amber-700'
                      }`}
                    >
                      {item.story.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {item.story.author}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {item.totalLocked > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{item.totalLocked} chương khóa</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Pass cả bộ</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredStoriesData.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-xs italic">
              Không tìm thấy bộ truyện nào khớp với từ khóa tìm kiếm.
            </div>
          )}
        </div>

        {/* Level 2: Selected Story Detailed Chapter Password Hints */}
        {currentViewData && (
          <div className="p-5 sm:p-7 rounded-3xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 space-y-5 animate-in fade-in">
            {/* Story Title & Overview Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-700">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-18 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 shadow-sm border border-stone-200 dark:border-stone-700">
                  <img src={currentViewData.story.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                    Bộ truyện đang chọn
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                    {currentViewData.story.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tác giả: {currentViewData.story.author} • Editor: {currentViewData.story.translator}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => onOpenStory(currentViewData.story.id)}
                  className="px-3.5 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-stone-800 text-pink-700 dark:text-pink-300 hover:bg-pink-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Đến trang truyện</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleJumpToSimulator(currentViewData.story.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Thử pass truyện này</span>
                </button>
              </div>
            </div>

            {/* Story-level password hint if any */}
            {currentViewData.hasStoryPass && currentViewData.story.passwordHint && (
              <div className="p-4 rounded-2xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mật khẩu bảo vệ chung của cả bộ truyện:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHint(currentViewData.story.passwordHint!, `story-${currentViewData.story.id}`)
                    }
                    className="text-[11px] text-amber-800 hover:text-amber-950 dark:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedHintId === `story-${currentViewData.story.id}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã chép gợi ý!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Chép gợi ý</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-serif italic text-amber-950 dark:text-amber-100 pl-5">
                  "{currentViewData.story.passwordHint}"
                </p>
              </div>
            )}

            {/* Locked Chapters List for this Story */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Danh sách các chương khóa của bộ này ({currentViewData.lockedChapters.length} chương):</span>
                </span>
              </div>

              {currentViewData.lockedChapters.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-center text-xs text-stone-500 italic">
                  Bộ truyện này hiện chỉ cài mật khẩu chung, chưa có chương khóa riêng lẻ.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {currentViewData.lockedChapters.map((chap) => {
                    const hintText =
                      chap.passwordHint ||
                      currentViewData.story.passwordHint ||
                      'Gợi ý nằm trong nội dung các chương truyện trước.';
                    return (
                      <div
                        key={chap.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/90 dark:border-stone-700 hover:border-amber-300 dark:hover:border-stone-600 transition-all shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-mono">
                              {chap.partType === 'extra' || chap.isExtra ? 'Ngoại truyện' : `Chương ${chap.chapterNumber}`}
                            </span>
                            <h4 className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                              {chap.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleJumpToSimulator(currentViewData.story.id, chap.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>🧪 Thử pass chương này</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenStory(currentViewData.story.id)}
                              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-medium cursor-pointer transition-colors"
                            >
                              Đọc ngay →
                            </button>
                          </div>
                        </div>

                        {/* Hint text */}
                        <div className="flex items-start justify-between gap-3 bg-amber-50/50 dark:bg-stone-900/40 p-3 rounded-xl border border-amber-100/80 dark:border-stone-800">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-amber-500" />
                              <span>Gợi ý mật khẩu chương này:</span>
                            </span>
                            <p className="font-serif text-xs sm:text-[13px] text-stone-800 dark:text-stone-200 italic leading-relaxed">
                              "{hintText}"
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyHint(hintText, chap.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-white dark:hover:bg-stone-800 shrink-0 cursor-pointer transition-colors"
                            title="Sao chép câu hỏi gợi ý"
                          >
                            {copiedHintId === chap.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. PASS TESTING SIMULATOR: TWO-TIER HIERARCHY (Truyện -> Chương) */}
      <div
        ref={simulatorRef}
        id="pass-simulator-box"
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-pink-50/90 via-amber-50/70 to-rose-50/80 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border border-pink-200 dark:border-stone-700 shadow-md space-y-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <h2 className="font-serif text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              Hộp Kiểm Tra & Thử Nghiệm Password
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-sans">
            Chọn truyện rồi chọn đúng chương cần đọc để kiểm tra xem đáp án của bồ đã chính xác chưa nhé!
          </p>
        </div>

        <form onSubmit={handleTestPass} className="space-y-5">
          {/* Row 1: Selectors for Story and Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/70 dark:bg-stone-800/60 border border-pink-100 dark:border-stone-700/80">
            {/* Step 1: Select Story */}
            <div className="space-y-1.5">
              <label htmlFor="sim-story-select" className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 inline-flex items-center justify-center text-[11px] font-mono">1</span>
                <span>Chọn bộ truyện:</span>
              </label>
              <select
                id="sim-story-select"
                value={simulatorStoryId}
                onChange={(e) => handleSelectSimStory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-pink-300 cursor-pointer shadow-2xs"
              >
                {storiesWithPassData.map((item) => (
                  <option key={item.story.id} value={item.story.id}>
                    {item.story.title} ({item.totalLocked} chương có pass)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Chapter of that Story */}
            <div className="space-y-1.5">
              <label htmlFor="sim-chapter-select" className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 inline-flex items-center justify-center text-[11px] font-mono">2</span>
                <span>Chọn chương cần thử:</span>
              </label>
              <select
                id="sim-chapter-select"
                value={simulatorChapterId}
                onChange={(e) => {
                  setSimulatorChapterId(e.target.value);
                  setTestResult(null);
                }}
                disabled={!simulatorStoryData || simulatorStoryData.lockedChapters.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-pink-300 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {simulatorStoryData && simulatorStoryData.lockedChapters.length > 0 ? (
                  simulatorStoryData.lockedChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.partType === 'extra' || c.isExtra ? 'Ngoại truyện: ' : `Chương ${c.chapterNumber}: `}
                      {c.title}
                    </option>
                  ))
                ) : (
                  <option value="">(Chỉ áp dụng mật khẩu chung toàn bộ truyện)</option>
                )}
              </select>
            </div>
          </div>

          {/* Active Hint Reminder for the selected chapter */}
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 text-xs sm:text-sm space-y-1.5">
            <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Gợi ý mật khẩu cho {activeSimChapter ? activeSimChapter.title : simulatorStoryData?.story.title}:
              </span>
            </span>
            <p className="font-serif italic text-stone-800 dark:text-stone-200 pl-5 text-sm sm:text-base leading-relaxed">
              "{activeSimChapter?.passwordHint || simulatorStoryData?.story.passwordHint || 'Gợi ý nằm trong nội dung các chương truyện trước.'}"
            </p>
          </div>

          {/* Row 2: Prominent, Big Password Input Area */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-800/90 border-2 border-pink-300/80 dark:border-pink-800/60 shadow-sm space-y-2">
            <label htmlFor="sim-answer-input" className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pink-500 text-white inline-flex items-center justify-center text-[11px] font-mono font-bold">3</span>
              <span>Nhập câu trả lời mật khẩu của bạn:</span>
              <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400 font-sans italic ml-1">
                (viết thường, viết liền không dấu, không cách)
              </span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <KeyRound className="w-5 h-5 text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="sim-answer-input"
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Nhập đáp án mật khẩu..."
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm sm:text-base font-medium focus:ring-2 focus:ring-pink-400 focus:outline-hidden transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={!testInput.trim()}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 shrink-0 text-center flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99]"
              >
                <span>Kiểm tra</span>
                <span>✨</span>
              </button>
            </div>
          </div>

          {/* Test verification feedback banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 border text-xs sm:text-sm shadow-xs animate-in fade-in slide-in-from-top-1 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <p className="font-serif leading-relaxed font-semibold">{testResult.message}</p>
                {testResult.success && simulatorStoryData && (
                  <button
                    type="button"
                    onClick={() => onOpenStory(simulatorStoryData.story.id)}
                    className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Vào đọc ngay tại trang truyện →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
