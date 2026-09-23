import { Story, Chapter, Announcement, RecentUpdate } from '../types';
import defaultStoriesJson from '../../data/stories.json';
import defaultChaptersJson from '../../data/chapters.json';
import defaultAnnouncementsJson from '../../data/announcements.json';

export const CANONICAL_PROTECTED_STORY_IDS = new Set([
  'chanh-xanh-cuong-tuong',
  'nang-luc-cua-man-em',
  'vu-ly-thanh',
  'tung-thanh',
  'toi-co-khach-quy',
  'huong-dan-lang-phi-tinh-yeu',
  'khac-ten-anh-len-bia-mo-cua-em',
]);

export const DELETED_OR_LEGACY_STORY_IDS = new Set([
  'anh-dao-nam-centimet',
  'anh-dao-5cm',
  'mua-he-nam-ay',
  'buc-thu-tinh-gui-may-troi',
  'chiec-o-thang-bay',
  'duoi-tan-cay-mua-ha',
]);

export const DELETED_OR_LEGACY_ANNOUNCEMENT_IDS = new Set([
  'tb-1',
  'tb-2',
  'tb-3',
  'tb-4',
  'tb-5',
]);

export const isAnnouncementDeleted = (annId?: string): boolean => {
  if (!annId) return true;
  const cleanId = annId.trim();
  if (DELETED_OR_LEGACY_ANNOUNCEMENT_IDS.has(cleanId)) return true;
  try {
    const raw = localStorage.getItem('mel_deleted_announcement_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list) && list.includes(cleanId)) return true;
    }
  } catch {}
  return false;
};

export const recordAnnouncementDeleted = (annId: string): void => {
  if (!annId) return;
  const cleanId = annId.trim();
  DELETED_OR_LEGACY_ANNOUNCEMENT_IDS.add(cleanId);
  try {
    const raw = localStorage.getItem('mel_deleted_announcement_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(cleanId)) {
      list.push(cleanId);
      localStorage.setItem('mel_deleted_announcement_ids', JSON.stringify(list));
    }
  } catch {}
};

export const isChapterDeleted = (chapterId?: string): boolean => {
  if (!chapterId) return false;
  const cleanId = chapterId.trim();
  try {
    const raw = localStorage.getItem('mel_deleted_chapter_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list) && list.includes(cleanId)) return true;
    }
  } catch {}
  return false;
};

export const recordChapterDeleted = (chapterId: string): void => {
  if (!chapterId) return;
  const cleanId = chapterId.trim();
  try {
    const raw = localStorage.getItem('mel_deleted_chapter_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(cleanId)) {
      list.push(cleanId);
      localStorage.setItem('mel_deleted_chapter_ids', JSON.stringify(list));
    }
  } catch {}
};

export const unmarkAnnouncementDeleted = (annId: string): void => {
  if (!annId) return;
  const cleanId = annId.trim();
  DELETED_OR_LEGACY_ANNOUNCEMENT_IDS.delete(cleanId);
  try {
    const raw = localStorage.getItem('mel_deleted_announcement_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const filtered = list.filter((id) => id !== cleanId);
      localStorage.setItem('mel_deleted_announcement_ids', JSON.stringify(filtered));
    }
  } catch {}
};

export const unmarkStoryDeleted = (storyId: string): void => {
  if (!storyId) return;
  const cleanId = storyId.trim().toLowerCase();
  DELETED_OR_LEGACY_STORY_IDS.delete(cleanId);
  DELETED_OR_LEGACY_STORY_IDS.delete(storyId);
  try {
    const raw = localStorage.getItem('mel_deleted_story_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const filtered = list.filter((id) => id !== storyId && id !== cleanId);
      localStorage.setItem('mel_deleted_story_ids', JSON.stringify(filtered));
    }
  } catch {}
};

// Auto-cleanse localStorage on module initialization so canonical stories are never hidden
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('mel_deleted_story_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        const filtered = list.filter((id) => !CANONICAL_PROTECTED_STORY_IDS.has(id.trim().toLowerCase()));
        if (filtered.length !== list.length) {
          localStorage.setItem('mel_deleted_story_ids', JSON.stringify(filtered));
        }
      }
    }
  } catch {}
}

export const isStoryDeleted = (storyId?: string): boolean => {
  if (!storyId) return true;
  const cleanId = storyId.trim().toLowerCase();
  // Canonical stories must never be marked as deleted
  if (CANONICAL_PROTECTED_STORY_IDS.has(cleanId)) return false;
  if (DELETED_OR_LEGACY_STORY_IDS.has(cleanId) || DELETED_OR_LEGACY_STORY_IDS.has(storyId)) return true;
  try {
    const raw = localStorage.getItem('mel_deleted_story_ids');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list) && (list.includes(storyId) || list.includes(cleanId))) return true;
    }
  } catch {}
  return false;
};

export const recordStoryDeleted = (storyId: string): void => {
  if (!storyId) return;
  const cleanId = storyId.trim().toLowerCase();
  // Never delete canonical user stories
  if (CANONICAL_PROTECTED_STORY_IDS.has(cleanId)) return;
  DELETED_OR_LEGACY_STORY_IDS.add(cleanId);
  DELETED_OR_LEGACY_STORY_IDS.add(storyId);
  if (cleanId === 'anh-dao-5cm' || cleanId === 'anh-dao-nam-centimet') {
    DELETED_OR_LEGACY_STORY_IDS.add('anh-dao-5cm');
    DELETED_OR_LEGACY_STORY_IDS.add('anh-dao-nam-centimet');
  }
  try {
    const raw = localStorage.getItem('mel_deleted_story_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(storyId)) list.push(storyId);
    if (!list.includes(cleanId)) list.push(cleanId);
    localStorage.setItem('mel_deleted_story_ids', JSON.stringify(list));

    localStorage.removeItem(`mel_chapters_${storyId}`);
    localStorage.removeItem(`mel_chapters_${cleanId}`);

    const rawStories = localStorage.getItem('mel_published_stories');
    if (rawStories) {
      const parsed: Story[] = JSON.parse(rawStories);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((s) => s.id !== storyId && s.id !== cleanId);
        localStorage.setItem('mel_published_stories', JSON.stringify(filtered));
      }
    }
  } catch {}

  delete liveChaptersRuntimeCache[storyId];
  delete liveChaptersRuntimeCache[cleanId];
};

const parseDefaultStories = (): Story[] => {
  if (Array.isArray(defaultStoriesJson) && defaultStoriesJson.length > 0) {
    return (defaultStoriesJson as unknown as Story[]).filter(
      (s) => s && s.id && !DELETED_OR_LEGACY_STORY_IDS.has(s.id)
    );
  }
  return [];
};

const parseDefaultChapters = (): Record<string, Chapter[]> => {
  if (defaultChaptersJson && typeof defaultChaptersJson === 'object') {
    return defaultChaptersJson as unknown as Record<string, Chapter[]>;
  }
  return {};
};

export const STORIES: Story[] = parseDefaultStories();

export const SAMPLE_CHAPTERS: Record<string, Chapter[]> = parseDefaultChapters();

/**
 * Get stored custom chapters from localStorage for a specific story.
 */
export const getStoredCustomChapters = (storyId: string): Chapter[] => {
  try {
    const raw = localStorage.getItem(`mel_chapters_${storyId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const aliasId = storyId === 'anh-dao-nam-centimet' ? 'anh-dao-5cm' : storyId === 'anh-dao-5cm' ? 'anh-dao-nam-centimet' : null;
    if (aliasId) {
      const rawAlias = localStorage.getItem(`mel_chapters_${aliasId}`);
      if (rawAlias) {
        const parsedAlias = JSON.parse(rawAlias);
        if (Array.isArray(parsedAlias) && parsedAlias.length > 0) return parsedAlias;
      }
    }
  } catch {}
  return [];
};

/**
 * Save a custom chapter into localStorage without losing existing chapters.
 */
export const saveCustomChapterToStorage = (chapter: Chapter): void => {
  try {
    const existingChapters = getStoryChapters(chapter.storyId);
    const list = existingChapters.length > 0 ? [...existingChapters] : getStoredCustomChapters(chapter.storyId);
    const targetPartType = chapter.partType || (chapter.isExtra ? 'extra' : 'main');
    const existingIndex = list.findIndex(
      (c) => c.id === chapter.id || (c.chapterNumber === chapter.chapterNumber && (c.partType || (c.isExtra ? 'extra' : 'main')) === targetPartType)
    );
    if (existingIndex >= 0) {
      list[existingIndex] = chapter;
    } else {
      list.push(chapter);
    }
    // Sort by chapterNumber ascending
    list.sort((a, b) => {
      const numA = Number(a.chapterNumber) || 0;
      const numB = Number(b.chapterNumber) || 0;
      if (numA !== numB) return numA - numB;
      const isExtraA = a.isExtra || a.partType === 'extra' ? 1 : 0;
      const isExtraB = b.isExtra || b.partType === 'extra' ? 1 : 0;
      return isExtraA - isExtraB;
    });
    localStorage.setItem(`mel_chapters_${chapter.storyId}`, JSON.stringify(list));
    setLiveStoryChapters(chapter.storyId, list);
    const aliasId = chapter.storyId === 'anh-dao-nam-centimet' ? 'anh-dao-5cm' : chapter.storyId === 'anh-dao-5cm' ? 'anh-dao-nam-centimet' : null;
    if (aliasId) {
      localStorage.setItem(`mel_chapters_${aliasId}`, JSON.stringify(list));
      setLiveStoryChapters(aliasId, list);
    }
  } catch {}
};

/**
 * Delete a custom chapter from localStorage.
 */
export const deleteCustomChapterFromStorage = (storyId: string, chapterId: string): void => {
  try {
    recordChapterDeleted(chapterId);
    const list = getStoryChapters(storyId).filter((c) => c.id !== chapterId);
    localStorage.setItem(`mel_chapters_${storyId}`, JSON.stringify(list));
    setLiveStoryChapters(storyId, list);
    const aliasId = storyId === 'anh-dao-nam-centimet' ? 'anh-dao-5cm' : storyId === 'anh-dao-5cm' ? 'anh-dao-nam-centimet' : null;
    if (aliasId) {
      localStorage.setItem(`mel_chapters_${aliasId}`, JSON.stringify(list));
      setLiveStoryChapters(aliasId, list);
    }
  } catch {}
};

// Live synchronized chapters cache from Firestore across all devices and clients
const liveChaptersRuntimeCache: Record<string, Chapter[]> = { ...SAMPLE_CHAPTERS };

export const setLiveChaptersRuntimeCache = (cache: Record<string, Chapter[]>): void => {
  for (const [storyId, list] of Object.entries(cache)) {
    liveChaptersRuntimeCache[storyId] = list;
  }
};

export const setLiveStoryChapters = (storyId: string, chapters: Chapter[]): void => {
  liveChaptersRuntimeCache[storyId] = chapters;
  const aliasId = storyId === 'anh-dao-nam-centimet' ? 'anh-dao-5cm' : storyId === 'anh-dao-5cm' ? 'anh-dao-nam-centimet' : null;
  if (aliasId) {
    liveChaptersRuntimeCache[aliasId] = chapters;
  }
};

export const getLiveChaptersRuntimeCache = (): Record<string, Chapter[]> => {
  return { ...liveChaptersRuntimeCache };
};

export const getStoryChapters = (storyId: string): Chapter[] => {
  if (!storyId || isStoryDeleted(storyId)) {
    return [];
  }
  const aliasId = storyId === 'anh-dao-nam-centimet' ? 'anh-dao-5cm' : storyId === 'anh-dao-5cm' ? 'anh-dao-nam-centimet' : null;
  if (aliasId && isStoryDeleted(aliasId)) {
    return [];
  }

  // Base seed chapters from static chapters.json
  const seedList = SAMPLE_CHAPTERS[storyId] || (aliasId ? SAMPLE_CHAPTERS[aliasId] : []) || [];

  // Local custom chapters from localStorage
  let storedList: Chapter[] = [];
  try {
    const raw = localStorage.getItem(`mel_chapters_${storyId}`) || (aliasId ? localStorage.getItem(`mel_chapters_${aliasId}`) : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) storedList = parsed;
    }
  } catch {}

  // Runtime synchronized cache
  const runtimeList = liveChaptersRuntimeCache[storyId] || (aliasId ? liveChaptersRuntimeCache[aliasId] : []) || [];

  // Build a union map: seedList + storedList + runtimeList
  const map = new Map<string, Chapter>();
  const addChapterToMap = (ch: Chapter) => {
    if (!ch || (ch as any).deleted || isChapterDeleted(ch.id)) return;
    const key = ch.id || `${ch.storyId || storyId}-${ch.partType || (ch.isExtra ? 'extra' : 'main')}-${ch.chapterNumber}`;
    if (!map.has(key)) {
      map.set(key, ch);
    } else {
      const existing = map.get(key)!;
      const exLen = (existing.content || '').length;
      const curLen = (ch.content || '').length;
      const exTime = new Date(existing.updatedAt || existing.publishedAt || 0).getTime();
      const curTime = new Date(ch.updatedAt || ch.publishedAt || 0).getTime();
      if (curTime > exTime || (curTime === exTime && curLen >= exLen)) {
        map.set(key, { ...existing, ...ch });
      } else if (curLen > exLen) {
        map.set(key, { ...existing, ...ch, content: ch.content });
      }
    }
  };

  seedList.forEach(addChapterToMap);
  storedList.forEach(addChapterToMap);
  runtimeList.forEach(addChapterToMap);

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const numA = Number(a.chapterNumber) || 0;
    const numB = Number(b.chapterNumber) || 0;
    if (numA !== numB) return numA - numB;
    const isExtraA = a.isExtra || a.partType === 'extra' ? 1 : 0;
    const isExtraB = b.isExtra || b.partType === 'extra' ? 1 : 0;
    return isExtraA - isExtraB;
  });

  return merged;
};

/**
 * Automatically computes the next sequential chapter number for a given story and partType.
 * Never defaults to 1 if the story already has chapters.
 */
export const getNextChapterNumber = (storyId: string, partType: 'main' | 'extra' = 'main'): number => {
  if (!storyId) return 1;
  const list = getStoryChapters(storyId);
  if (!list || list.length === 0) return 1;

  if (partType === 'extra') {
    const extraList = list.filter((c) => c.isExtra || c.partType === 'extra');
    if (extraList.length === 0) return 1;
    const max = Math.max(0, ...extraList.map((c) => Number(c.extraNumber || c.chapterNumber) || 0));
    return max + 1;
  } else {
    const mainList = list.filter((c) => !c.isExtra && c.partType !== 'extra');
    if (mainList.length === 0) return 1;
    const max = Math.max(0, ...mainList.map((c) => Number(c.chapterNumber) || 0));
    return max + 1;
  }
};

/**
 * Checks if a chapter with the specified number and partType already exists in the story.
 */
export const findDuplicateChapter = (
  storyId: string,
  chapterNumber: number,
  partType: 'main' | 'extra' = 'main',
  excludeChapterId?: string
): Chapter | undefined => {
  if (!storyId || !chapterNumber) return undefined;
  const list = getStoryChapters(storyId);
  return list.find((c) => {
    if (excludeChapterId && c.id === excludeChapterId) return false;
    const cPart = c.partType || (c.isExtra ? 'extra' : 'main');
    return cPart === partType && Number(c.chapterNumber) === Number(chapterNumber);
  });
};

const parseDefaultAnnouncements = (): Announcement[] => {
  if (Array.isArray(defaultAnnouncementsJson) && defaultAnnouncementsJson.length > 0) {
    return (defaultAnnouncementsJson as unknown as Announcement[]).filter(
      (a) => a && a.id && !isAnnouncementDeleted(a.id)
    );
  }
  return [];
};

export const ANNOUNCEMENTS: Announcement[] = parseDefaultAnnouncements();

export const RECENT_UPDATES: RecentUpdate[] = [];

export const SUMMER_QUOTES = [
  {
    text: 'Tốc độ cánh hoa anh đào rơi là năm centimet một giây. Vậy phải mất bao lâu để hai trái tim đến được bên nhau?',
    book: 'Mellifluous 🌸 Tủ sách mùa hạ',
  },
  {
    text: 'Cậu là cơn mưa rào bất chợt của tuổi mười bảy, dù bị ướt sũng nhưng tớ vẫn muốn một lần nữa đắm chìm.',
    book: 'Thanh xuân không hối tiếc',
  },
  {
    text: 'Dưới tán cây râm mát mùa hạ, mọi bức thư chưa gửi đều đã tìm thấy người nhận của nó.',
    book: 'Gửi người mùa hạ',
  },
  {
    text: 'Gió mùa hè rất ngọt, nhưng không ngọt bằng khoảnh khắc cậu khẽ mỉm cười và gọi tên tớ giữa sân trường.',
    book: 'Mellifluous 🌸 Tủ sách mùa hạ',
  },
];

export const PLAYLIST = [
  { title: 'Gió Thổi Mùa Hạ (夏天的风)', artist: 'Ôn Lam', duration: '03:45' },
  { title: 'Mùa Hè Năm Ấy (那年夏天)', artist: 'Hứa Phi', duration: '04:12' },
  { title: 'Tớ Thích Cậu (我喜欢你)', artist: 'Cúc Tịnh Y', duration: '03:30' },
  { title: 'Cánh Hoa Anh Đào Rơi', artist: 'Lofi Chill Mel', duration: '02:58' },
];
