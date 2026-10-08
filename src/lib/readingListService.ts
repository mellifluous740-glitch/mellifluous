import {
  db,
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  isFirestoreEnabled,
  checkIsFirestoreBlocked,
  flagFirestoreQuotaExceeded,
} from './firebase';
import { Story, Chapter, ReadingProgressItem } from '../types';

// Active in-memory subscribers keyed by userId
const activeSubscribers = new Map<string, Set<(items: ReadingProgressItem[]) => void>>();
const inMemoryCache = new Map<string, ReadingProgressItem[]>();

const getStorageKey = (userId: string) => `mel_reading_list_${userId || 'guest'}`;

/**
 * Get reading list from localStorage & runtime cache
 */
export const getLocalReadingList = (userId: string): ReadingProgressItem[] => {
  if (inMemoryCache.has(userId)) {
    return inMemoryCache.get(userId)!;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed: ReadingProgressItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        inMemoryCache.set(userId, parsed);
        return parsed;
      }
    }
  } catch {}
  return [];
};

/**
 * Save reading list into localStorage & runtime cache, then notify listeners
 */
const persistAndNotify = (userId: string, items: ReadingProgressItem[]) => {
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  inMemoryCache.set(userId, items);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
    } catch {}
  }
  const subs = activeSubscribers.get(userId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb(items);
      } catch (err) {
        console.warn('Reading list subscriber error:', err);
      }
    });
  }
};

/**
 * Check if a story is in the reader's reading list
 */
export const isStoryInReadingList = (userId: string, storyId: string): boolean => {
  if (!userId || !storyId) return false;
  const list = getLocalReadingList(userId);
  return list.some((item) => item.storyId === storyId);
};

/**
 * Get reading progress item for a story
 */
export const getStoryReadingProgress = (
  userId: string,
  storyId: string
): ReadingProgressItem | null => {
  if (!userId || !storyId) return null;
  const list = getLocalReadingList(userId);
  return list.find((item) => item.storyId === storyId) || null;
};

/**
 * Subscribe to realtime updates for a user's reading list
 */
export const subscribeToReadingList = (
  userId: string,
  callback: (items: ReadingProgressItem[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  // 1. Deliver current local items immediately (0ms lag)
  const initial = getLocalReadingList(userId);
  callback(initial);

  if (!activeSubscribers.has(userId)) {
    activeSubscribers.set(userId, new Set());
  }
  activeSubscribers.get(userId)!.add(callback);

  // 2. Connect to Firestore query for realtime multi-device sync
  let unsubFirestore: (() => void) | null = null;
  if (isFirestoreEnabled() && !checkIsFirestoreBlocked()) {
    try {
      const q = query(collection(db, 'reading_lists'), where('userId', '==', userId));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const remoteItems: ReadingProgressItem[] = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              remoteItems.push(docSnap.data() as ReadingProgressItem);
            }
          });

          // Merge local & remote items by latest updatedAt
          const currentLocal = getLocalReadingList(userId);
          const map = new Map<string, ReadingProgressItem>();

          currentLocal.forEach((item) => map.set(item.storyId, item));
          remoteItems.forEach((rem) => {
            const loc = map.get(rem.storyId);
            if (!loc) {
              map.set(rem.storyId, rem);
            } else {
              const remTime = new Date(rem.updatedAt).getTime();
              const locTime = new Date(loc.updatedAt).getTime();
              map.set(rem.storyId, remTime >= locTime ? rem : loc);
            }
          });

          const merged = Array.from(map.values());
          persistAndNotify(userId, merged);
        },
        (err) => {
          flagFirestoreQuotaExceeded(err);
        }
      );
    } catch (err) {
      flagFirestoreQuotaExceeded(err);
    }
  }

  return () => {
    const subs = activeSubscribers.get(userId);
    if (subs) {
      subs.delete(callback);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
};

/**
 * Add or toggle story in reader's reading list
 */
export const addToReadingList = async (
  userId: string,
  story: Story,
  initialChapter?: Chapter | null
): Promise<ReadingProgressItem> => {
  const nowIso = new Date().toISOString();
  const current = getLocalReadingList(userId);
  const existing = current.find((i) => i.storyId === story.id);

  const item: ReadingProgressItem = {
    id: `${userId}_${story.id}`,
    userId,
    storyId: story.id,
    storyTitle: story.title,
    storyCover: story.coverImage,
    storyAuthor: story.author || story.translator,
    totalChapters: story.completedChapters || story.totalChapters || 0,
    lastReadChapterId: initialChapter?.id || existing?.lastReadChapterId || '',
    lastReadChapterNumber: initialChapter?.chapterNumber || existing?.lastReadChapterNumber || 1,
    lastReadChapterTitle: initialChapter?.title || existing?.lastReadChapterTitle || '',
    scrollPercent: existing?.scrollPercent || 0,
    addedAt: existing?.addedAt || nowIso,
    updatedAt: nowIso,
  };

  const updatedList = [item, ...current.filter((i) => i.storyId !== story.id)];
  persistAndNotify(userId, updatedList);

  // Sync to Firestore
  if (isFirestoreEnabled() && !checkIsFirestoreBlocked()) {
    try {
      const docRef = doc(db, 'reading_lists', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (err) {
      flagFirestoreQuotaExceeded(err);
    }
  }

  return item;
};

/**
 * Update reading progress (chapter & scroll percentage)
 */
export const updateReadingProgress = async (
  userId: string,
  story: Story,
  chapter: Chapter,
  scrollPercent: number = 0
): Promise<void> => {
  if (!userId || !story || !chapter) return;

  const nowIso = new Date().toISOString();
  const current = getLocalReadingList(userId);
  const existing = current.find((i) => i.storyId === story.id);

  const item: ReadingProgressItem = {
    id: `${userId}_${story.id}`,
    userId,
    storyId: story.id,
    storyTitle: story.title,
    storyCover: story.coverImage,
    storyAuthor: story.author || story.translator,
    totalChapters: story.completedChapters || story.totalChapters || 0,
    lastReadChapterId: chapter.id,
    lastReadChapterNumber: Number(chapter.chapterNumber) || 1,
    lastReadChapterTitle: chapter.title || `Chương ${chapter.chapterNumber}`,
    scrollPercent: Math.min(100, Math.max(0, Math.round(scrollPercent))),
    addedAt: existing?.addedAt || nowIso,
    updatedAt: nowIso,
  };

  const updatedList = [item, ...current.filter((i) => i.storyId !== story.id)];
  persistAndNotify(userId, updatedList);

  // Sync to Firestore
  if (isFirestoreEnabled() && !checkIsFirestoreBlocked()) {
    try {
      const docRef = doc(db, 'reading_lists', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (err) {
      flagFirestoreQuotaExceeded(err);
    }
  }
};

/**
 * Remove a story from the reader's reading list
 */
export const removeFromReadingList = async (userId: string, storyId: string): Promise<void> => {
  if (!userId || !storyId) return;

  const current = getLocalReadingList(userId);
  const updatedList = current.filter((i) => i.storyId !== storyId);
  persistAndNotify(userId, updatedList);

  // Remove from Firestore
  if (isFirestoreEnabled() && !checkIsFirestoreBlocked()) {
    try {
      const docRef = doc(db, 'reading_lists', `${userId}_${storyId}`);
      await deleteDoc(docRef);
    } catch (err) {
      flagFirestoreQuotaExceeded(err);
    }
  }
};

/**
 * Toggle a story in the reader's reading list (add if not exists, remove if exists)
 */
export const toggleReadingListItem = async (
  userId: string,
  story: Story,
  initialChapter?: Chapter | null
): Promise<{ added: boolean; item?: ReadingProgressItem }> => {
  const effectiveUid = userId || 'guest';
  if (isStoryInReadingList(effectiveUid, story.id)) {
    await removeFromReadingList(effectiveUid, story.id);
    return { added: false };
  } else {
    const item = await addToReadingList(effectiveUid, story, initialChapter);
    return { added: true, item };
  }
};

/**
 * Automatically migrate guest reading list to authenticated user upon login
 */
export const migrateGuestReadingList = async (authenticatedUserId: string): Promise<void> => {
  if (!authenticatedUserId || authenticatedUserId === 'guest') return;
  const guestList = getLocalReadingList('guest');
  if (!guestList || guestList.length === 0) return;

  const currentAuthList = getLocalReadingList(authenticatedUserId);
  const authStoryIds = new Set(currentAuthList.map((i) => i.storyId));

  const itemsToMigrate = guestList.filter((g) => !authStoryIds.has(g.storyId));
  if (itemsToMigrate.length === 0) return;

  const migratedItems: ReadingProgressItem[] = itemsToMigrate.map((item) => ({
    ...item,
    id: `${authenticatedUserId}_${item.storyId}`,
    userId: authenticatedUserId,
  }));

  const merged = [...migratedItems, ...currentAuthList];
  persistAndNotify(authenticatedUserId, merged);

  // Clear guest list
  try {
    localStorage.removeItem(getStorageKey('guest'));
    inMemoryCache.delete('guest');
  } catch {}

  // Sync migrated items to Firestore
  if (isFirestoreEnabled() && !checkIsFirestoreBlocked()) {
    for (const item of migratedItems) {
      try {
        const docRef = doc(db, 'reading_lists', item.id);
        await setDoc(docRef, item, { merge: true });
      } catch (err) {
        flagFirestoreQuotaExceeded(err);
      }
    }
  }
};
