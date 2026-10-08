import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen,
  PlusCircle,
  Edit2,
  Trash2,
  Sparkles,
  Lock,
  Key,
  Layers,
  Tag,
  Eye,
  Check,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  MessageSquare,
  Music,
  Bell,
  Users,
  RefreshCw,
  Upload,
  LogIn,
  X,
  Plus,
  Send,
  Reply,
  Mail,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { Story, Chapter, Announcement, ReaderLetter } from '../types';
import {
  publishStory,
  deleteStory,
  publishChapter,
  deleteChapter,
  subscribeToStoryChapters,
  subscribeToReaderLetters,
  replyToReaderLetter,
  deleteReaderLetter,
} from '../lib/realtimeService';
import { getNextChapterNumber, findDuplicateChapter, getStoryChapters } from '../data/mockData';
import { getCustomGenres, subscribeToCustomGenres, getStoryGenres, addCustomGenre } from '../utils/genreManager';
import { isoToDateTimeLocal, dateTimeLocalToIso, formatDateTime, formatRelativeTime } from '../utils/dateUtils';
import { RichTextEditor } from './common/RichTextEditor';
import { AuthorMusicTab } from './author/AuthorMusicTab';
import { AuthorAnnouncementsTab } from './author/AuthorAnnouncementsTab';
import { AuthorGenresTab } from './author/AuthorGenresTab';
import { AuthorCollaboratorsTab } from './author/AuthorCollaboratorsTab';
import { AuthorSyncTab } from './author/AuthorSyncTab';
import { AuthorCommentsTab } from './author/AuthorCommentsTab';
import { useAuth } from '../lib/authContext';

export interface AuthorStudioPageProps {
  stories: Story[];
  announcements: Announcement[];
  onStoriesUpdated?: () => void;
}

const PRESET_COVERS = [
  { name: 'Hoa anh đào & Nắng', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=800&auto=format&fit=crop' },
  { name: 'Khu rừng mùa hè', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Góc phố bình yên', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bầu trời hoàng hôn', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ánh trăng huyền ảo', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=800&auto=format&fit=crop' },
];

export const AuthorStudioPage: React.FC<AuthorStudioPageProps> = ({
  stories,
  announcements,
  onStoriesUpdated,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthor, isCollaborator, openAuthModal } = useAuth();

  // Top-level tabs for Studio
  type StudioMainTab =
    | 'stories'
    | 'genres'
    | 'announcements'
    | 'music'
    | 'letters'
    | 'comments'
    | 'collaborators'
    | 'sync';

  const tabParam = searchParams.get('tab') as StudioMainTab | null;
  const [activeMainTab, setActiveMainTab] = useState<StudioMainTab>(() => {
    if (tabParam && ['stories', 'genres', 'announcements', 'music', 'letters', 'comments', 'collaborators', 'sync'].includes(tabParam)) {
      return tabParam;
    }
    return 'stories';
  });

  useEffect(() => {
    if (tabParam && tabParam !== activeMainTab) {
      setActiveMainTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectMainTab = (tab: StudioMainTab) => {
    setActiveMainTab(tab);
    setSearchParams({ tab });
  };

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // =========================================================================
  // INTEGRATED STORY WORKSPACE STATE
  // Mode: 'newStory' OR 'storyWorkspace' (which contains newChapter, chapters, editStory)
  // =========================================================================
  const [storySearch, setStorySearch] = useState('');
  const [isCreatingNewStory, setIsCreatingNewStory] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string>(() => {
    return stories[0]?.id || '';
  });

  // Sync selectedStoryId if stories update
  useEffect(() => {
    if (stories.length > 0 && !selectedStoryId) {
      setSelectedStoryId(stories[0].id);
    }
  }, [stories, selectedStoryId]);

  // Integrated sub-tab for the currently selected story:
  // 'newChapter' (Đăng chương mới), 'chapters' (Danh sách & Sửa chương), 'editStory' (Chỉnh sửa thông tin truyện)
  type StoryWorkspaceSubTab = 'newChapter' | 'chapters' | 'editStory';
  const [storySubTab, setStorySubTab] = useState<StoryWorkspaceSubTab>('newChapter');

  // Currently selected story
  const selectedStory = useMemo(() => {
    return stories.find((s) => s.id === selectedStoryId) || stories[0] || null;
  }, [stories, selectedStoryId]);

  // Filtered stories in sidebar
  const filteredStories = useMemo(() => {
    if (!storySearch.trim()) return stories;
    const q = storySearch.toLowerCase().trim();
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.originalTitle && s.originalTitle.toLowerCase().includes(q)) ||
        s.author.toLowerCase().includes(q)
    );
  }, [stories, storySearch]);

  // Dynamic Genres
  const [availableGenres, setAvailableGenres] = useState<string[]>(() => getCustomGenres());
  useEffect(() => {
    const unsub = subscribeToCustomGenres((genres) => {
      setAvailableGenres(genres);
    });
    return unsub;
  }, []);

  // =========================================================================
  // 1. NEW STORY FORM STATE
  // =========================================================================
  const [newTitle, setNewTitle] = useState('');
  const [newOriginalTitle, setNewOriginalTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTranslator, setNewTranslator] = useState('Mellifluous');
  const [newStatus, setNewStatus] = useState<'completed' | 'ongoing'>('ongoing');
  const [newGenres, setNewGenres] = useState<string[]>(['Ngôn tình', 'Ngọt sủng']);
  const [newCustomGenreInput, setNewCustomGenreInput] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCover, setNewCover] = useState(PRESET_COVERS[0].url);
  const [newHasPassword, setNewHasPassword] = useState(false);
  const [newPasswordHint, setNewPasswordHint] = useState('');
  const [newPasswordKey, setNewPasswordKey] = useState('');
  const [newTotalChapters, setNewTotalChapters] = useState(30);
  const [newPublishDateInput, setNewPublishDateInput] = useState(() => isoToDateTimeLocal(new Date().toISOString()));
  const [isPublishingNewStory, setIsPublishingNewStory] = useState(false);

  // =========================================================================
  // 2. EDIT STORY FORM STATE (bound to selectedStory)
  // =========================================================================
  const [editTitle, setEditTitle] = useState('');
  const [editOriginalTitle, setEditOriginalTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editTranslator, setEditTranslator] = useState('Mellifluous');
  const [editStatus, setEditStatus] = useState<'completed' | 'ongoing'>('ongoing');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editSummary, setEditSummary] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editHasPassword, setEditHasPassword] = useState(false);
  const [editPasswordHint, setEditPasswordHint] = useState('');
  const [editPasswordKey, setEditPasswordKey] = useState('');
  const [editTotalChapters, setEditTotalChapters] = useState(30);
  const [editPublishDateInput, setEditPublishDateInput] = useState('');
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<{ id: string; title: string } | null>(null);

  // Sync edit story state whenever selectedStory changes
  useEffect(() => {
    if (!selectedStory) return;
    setEditTitle(selectedStory.title || '');
    setEditOriginalTitle(selectedStory.originalTitle || '');
    setEditAuthor(selectedStory.author || '');
    setEditTranslator(selectedStory.translator || 'Mellifluous');
    setEditStatus(selectedStory.status || 'ongoing');
    setEditGenres(selectedStory.genre || []);
    setEditSummary(selectedStory.summary || '');
    setEditCover(selectedStory.coverImage || PRESET_COVERS[0].url);
    setEditHasPassword(!!selectedStory.hasPassword);
    setEditPasswordHint(selectedStory.passwordHint || '');
    setEditPasswordKey(selectedStory.passwordKey || '');
    setEditTotalChapters(selectedStory.totalChapters || 30);
    setEditPublishDateInput(isoToDateTimeLocal(selectedStory.publishedAt || new Date().toISOString()));
  }, [selectedStory]);

  // =========================================================================
  // 3. NEW CHAPTER FORM STATE (Tied to selectedStory)
  // =========================================================================
  const [newChapterPartType, setNewChapterPartType] = useState<'main' | 'extra'>('main');
  const [newChapterNumber, setNewChapterNumber] = useState<number>(1);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [newChapterTranslatorNote, setNewChapterTranslatorNote] = useState('');
  const [newChapterIsLocked, setNewChapterIsLocked] = useState(false);
  const [newChapterPasswordHint, setNewChapterPasswordHint] = useState('');
  const [newChapterPasswordKey, setNewChapterPasswordKey] = useState('');
  const [newChapterPublishDateInput, setNewChapterPublishDateInput] = useState(() => isoToDateTimeLocal(new Date().toISOString()));
  const [isPublishingNewChapter, setIsPublishingNewChapter] = useState(false);
  const [overwriteWarningChapter, setOverwriteWarningChapter] = useState<Chapter | null>(null);

  // Auto-calculate recommended next chapter number when selected story or partType changes
  useEffect(() => {
    if (selectedStoryId) {
      const nextNum = getNextChapterNumber(selectedStoryId, newChapterPartType);
      setNewChapterNumber(nextNum);
    }
  }, [selectedStoryId, newChapterPartType]);

  // Duplicate chapter check
  const duplicateChapter = useMemo(() => {
    if (!selectedStoryId || !newChapterNumber) return null;
    return findDuplicateChapter(selectedStoryId, newChapterNumber, newChapterPartType) || null;
  }, [selectedStoryId, newChapterNumber, newChapterPartType]);

  // =========================================================================
  // 4. CHAPTERS LIST & EDIT EXISTING CHAPTER STATE (Tied to selectedStory)
  // =========================================================================
  const [storyChapters, setStoryChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [chapterFilterQuery, setChapterFilterQuery] = useState('');

  // Form states for editing selected chapter
  const [editChapTitle, setEditChapTitle] = useState('');
  const [editChapNumber, setEditChapNumber] = useState(1);
  const [editChapPartType, setEditChapPartType] = useState<'main' | 'extra'>('main');
  const [editChapContent, setEditChapContent] = useState('');
  const [editChapTranslatorNote, setEditChapTranslatorNote] = useState('');
  const [editChapIsLocked, setEditChapIsLocked] = useState(false);
  const [editChapPasswordHint, setEditChapPasswordHint] = useState('');
  const [editChapPasswordKey, setEditChapPasswordKey] = useState('');
  const [editChapPublishDateInput, setEditChapPublishDateInput] = useState('');
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; title: string } | null>(null);

  // Subscribe to chapters of the selected story
  useEffect(() => {
    if (!selectedStoryId) return;
    const initialList = getStoryChapters(selectedStoryId);
    setStoryChapters(initialList);
    if (initialList.length > 0) {
      setSelectedChapterId((prev) => (initialList.some((c) => c.id === prev) ? prev : initialList[0].id));
    } else {
      setSelectedChapterId('');
    }

    const unsub = subscribeToStoryChapters(selectedStoryId, (liveList) => {
      setStoryChapters(liveList);
      if (liveList.length > 0 && !selectedChapterId) {
        setSelectedChapterId(liveList[0].id);
      }
    });
    return unsub;
  }, [selectedStoryId]);

  // Sync edit chapter form when selectedChapterId changes
  useEffect(() => {
    if (!selectedChapterId) return;
    const chap = storyChapters.find((c) => c.id === selectedChapterId);
    if (chap) {
      setEditChapTitle(chap.title || '');
      setEditChapNumber(Number(chap.chapterNumber) || 1);
      setEditChapPartType(chap.partType || (chap.isExtra ? 'extra' : 'main'));
      setEditChapContent(chap.content || '');
      setEditChapTranslatorNote(chap.translatorNote || '');
      setEditChapIsLocked(!!chap.isLocked);
      setEditChapPasswordHint(chap.passwordHint || '');
      setEditChapPasswordKey(chap.passwordKey || '');
      setEditChapPublishDateInput(isoToDateTimeLocal(chap.publishedAt || new Date().toISOString()));
    }
  }, [selectedChapterId, storyChapters]);

  const filteredStoryChapters = useMemo(() => {
    if (!chapterFilterQuery.trim()) return storyChapters;
    const q = chapterFilterQuery.toLowerCase().trim();
    return storyChapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        String(c.chapterNumber).includes(q)
    );
  }, [storyChapters, chapterFilterQuery]);

  // Reader Letters state for Studio tab
  const [letters, setLetters] = useState<ReaderLetter[]>([]);
  const [replyingLetterId, setReplyingLetterId] = useState<string | null>(null);
  const [authorReplyInput, setAuthorReplyInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (activeMainTab === 'letters' && isAuthor) {
      const unsub = subscribeToReaderLetters((list) => {
        setLetters(list);
      });
      return unsub;
    }
  }, [activeMainTab, isAuthor]);

  // =========================================================================
  // ACTIONS: 1. CREATE STORY
  // =========================================================================
  const handlePublishNewStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) {
      showFeedback('error', 'Vui lòng nhập tên truyện và tên tác giả.');
      return;
    }

    setIsPublishingNewStory(true);
    try {
      const generatedId =
        newTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `truyen-${Date.now()}`;

      const finalStoryPub = newPublishDateInput
        ? dateTimeLocalToIso(newPublishDateInput)
        : new Date().toISOString();

      const newStoryItem: Story = {
        id: generatedId,
        title: newTitle.trim(),
        originalTitle: newOriginalTitle.trim(),
        author: newAuthor.trim(),
        translator: newTranslator.trim() || 'Mellifluous',
        status: newStatus,
        genre: newGenres.length > 0 ? newGenres : ['Ngôn tình', 'Ngọt sủng'],
        summary: newSummary.trim() || 'Chưa có văn án tác phẩm.',
        totalChapters: Number(newTotalChapters) || 1,
        completedChapters: 0,
        mainChaptersCount: Number(newTotalChapters) || 1,
        extraChaptersCount: 0,
        coverImage: newCover || PRESET_COVERS[0].url,
        colorTheme: 'from-pink-100 to-rose-200 dark:from-pink-950/40 dark:to-rose-900/40',
        hasPassword: newHasPassword,
        passwordHint: newHasPassword ? newPasswordHint.trim() : '',
        passwordKey: newHasPassword ? newPasswordKey.trim().toLowerCase() : '',
        publishedAt: finalStoryPub,
        updatedAt: finalStoryPub,
        views: 0,
        likes: 0,
        featured: true,
      };

      const result = await publishStory(newStoryItem);
      showFeedback('success', `Đã xuất bản thành công tác phẩm "${newStoryItem.title}"!`);

      // Reset form
      setNewTitle('');
      setNewOriginalTitle('');
      setNewAuthor('');
      setNewSummary('');
      setNewHasPassword(false);
      setNewPasswordHint('');
      setNewPasswordKey('');

      // Auto-select this newly created story and switch to publishing chapter 1!
      setSelectedStoryId(newStoryItem.id);
      setIsCreatingNewStory(false);
      setStorySubTab('newChapter');

      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Không thể tạo truyện: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsPublishingNewStory(false);
    }
  };

  // =========================================================================
  // ACTIONS: 2. SAVE EDITED STORY
  // =========================================================================
  const handleSaveEditedStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) return;
    if (!editTitle.trim() || !editAuthor.trim()) {
      showFeedback('error', 'Vui lòng nhập tên truyện và tên tác giả.');
      return;
    }

    setIsSavingStory(true);
    try {
      const updatedStory: Story = {
        ...selectedStory,
        title: editTitle.trim(),
        originalTitle: editOriginalTitle.trim(),
        author: editAuthor.trim(),
        translator: editTranslator.trim() || 'Mellifluous',
        status: editStatus,
        genre: editGenres.length > 0 ? editGenres : ['Ngôn tình'],
        summary: editSummary.trim() || 'Chưa có văn án.',
        coverImage: editCover || selectedStory.coverImage,
        totalChapters: Number(editTotalChapters) || selectedStory.totalChapters || 30,
        hasPassword: editHasPassword,
        passwordHint: editHasPassword ? editPasswordHint.trim() : '',
        passwordKey: editHasPassword ? editPasswordKey.trim().toLowerCase() : '',
        updatedAt: new Date().toISOString(),
      };

      await publishStory(updatedStory);
      showFeedback('success', `Đã lưu thay đổi thông tin truyện "${updatedStory.title}"!`);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Lỗi khi lưu thông tin truyện: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsSavingStory(false);
    }
  };

  const handleDeleteStoryConfirm = async () => {
    if (!storyToDelete) return;
    try {
      await deleteStory(storyToDelete.id);
      showFeedback('success', `Đã xóa truyện "${storyToDelete.title}".`);
      setStoryToDelete(null);
      // Switch selected story
      const remaining = stories.filter((s) => s.id !== storyToDelete.id);
      if (remaining.length > 0) {
        setSelectedStoryId(remaining[0].id);
      }
      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      showFeedback('error', `Lỗi khi xóa truyện: ${err?.message}`);
    }
  };

  // =========================================================================
  // ACTIONS: 3. PUBLISH NEW CHAPTER
  // =========================================================================
  const handlePublishNewChapter = async (forceOverwrite = false) => {
    if (!selectedStoryId || !newChapterContent.trim()) {
      showFeedback('error', 'Vui lòng nhập nội dung chương.');
      return;
    }

    if (!forceOverwrite && duplicateChapter) {
      setOverwriteWarningChapter(duplicateChapter);
      return;
    }

    setIsPublishingNewChapter(true);
    try {
      const chapterId = `${selectedStoryId}-${newChapterPartType === 'extra' ? 'extra' : 'c'}${newChapterNumber}`;
      const finalChapterPub = newChapterPublishDateInput
        ? dateTimeLocalToIso(newChapterPublishDateInput)
        : new Date().toISOString();
      const effectiveTitle =
        newChapterTitle.trim() ||
        (newChapterPartType === 'extra'
          ? `Ngoại truyện ${newChapterNumber}`
          : `Chương ${newChapterNumber}`);

      const newChapterItem: Chapter = {
        id: chapterId,
        storyId: selectedStoryId,
        chapterNumber: Number(newChapterNumber) || 1,
        title: effectiveTitle,
        publishedAt: finalChapterPub,
        updatedAt: finalChapterPub,
        isLocked: newChapterIsLocked,
        passwordHint: newChapterIsLocked ? newChapterPasswordHint.trim() : '',
        passwordKey: newChapterIsLocked ? newChapterPasswordKey.trim().toLowerCase() : '',
        content: newChapterContent.trim(),
        translatorNote: newChapterTranslatorNote.trim(),
        wordCount: newChapterContent.trim().split(/\s+/).length,
        isExtra: newChapterPartType === 'extra',
        extraNumber: newChapterPartType === 'extra' ? Number(newChapterNumber) : 0,
        partType: newChapterPartType,
      };

      await publishChapter(newChapterItem);
      showFeedback('success', `Đã đăng thành công "${newChapterItem.title}"!`);

      // Reset form
      setNewChapterTitle('');
      setNewChapterContent('');
      setNewChapterTranslatorNote('');
      setNewChapterIsLocked(false);
      setNewChapterPasswordHint('');
      setNewChapterPasswordKey('');
      setOverwriteWarningChapter(null);

      // Increment chapter number automatically for next post
      setNewChapterNumber((prev) => prev + 1);

      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Không thể đăng chương: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsPublishingNewChapter(false);
    }
  };

  // =========================================================================
  // ACTIONS: 4. SAVE EDITED CHAPTER & DELETE CHAPTER
  // =========================================================================
  const handleSaveEditedChapter = async () => {
    if (!selectedStoryId || !selectedChapterId || !editChapContent.trim()) {
      showFeedback('error', 'Vui lòng nhập nội dung chương.');
      return;
    }

    setIsSavingChapter(true);
    try {
      const originalChap = storyChapters.find((c) => c.id === selectedChapterId);
      const effectiveTitle =
        editChapTitle.trim() ||
        (editChapPartType === 'extra'
          ? `Ngoại truyện ${editChapNumber}`
          : `Chương ${editChapNumber}`);

      const updatedChapterItem: Chapter = {
        id: selectedChapterId,
        storyId: selectedStoryId,
        chapterNumber: Number(editChapNumber) || 1,
        title: effectiveTitle,
        publishedAt: editChapPublishDateInput
          ? dateTimeLocalToIso(editChapPublishDateInput)
          : originalChap?.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocked: editChapIsLocked,
        passwordHint: editChapIsLocked ? editChapPasswordHint.trim() : '',
        passwordKey: editChapIsLocked ? editChapPasswordKey.trim().toLowerCase() : '',
        content: editChapContent.trim(),
        translatorNote: editChapTranslatorNote.trim(),
        wordCount: editChapContent.trim().split(/\s+/).length,
        isExtra: editChapPartType === 'extra',
        extraNumber: editChapPartType === 'extra' ? Number(editChapNumber) : 0,
        partType: editChapPartType,
      };

      await publishChapter(updatedChapterItem);
      showFeedback('success', `Đã lưu cập nhật cho "${updatedChapterItem.title}"!`);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Lỗi khi lưu chương: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsSavingChapter(false);
    }
  };

  const handleDeleteChapterConfirm = async () => {
    if (!chapterToDelete || !selectedStoryId) return;
    try {
      await deleteChapter(selectedStoryId, chapterToDelete.id);
      showFeedback('success', `Đã xóa "${chapterToDelete.title}".`);
      setChapterToDelete(null);
      // Select another chapter
      const remaining = storyChapters.filter((c) => c.id !== chapterToDelete.id);
      if (remaining.length > 0) {
        setSelectedChapterId(remaining[0].id);
      } else {
        setSelectedChapterId('');
      }
      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      showFeedback('error', `Lỗi khi xóa chương: ${err?.message}`);
    }
  };

  // Reply to Reader Letter
  const handleReplyLetter = async (letterId: string) => {
    if (!authorReplyInput.trim()) return;
    setIsSendingReply(true);
    try {
      await replyToReaderLetter(letterId, authorReplyInput.trim());
      showFeedback('success', 'Đã gửi hồi âm thư bạn đọc!');
      setReplyingLetterId(null);
      setAuthorReplyInput('');
    } catch (err: any) {
      showFeedback('error', `Lỗi gửi hồi âm: ${err?.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Security gatekeeper for non-authors
  if (!isAuthor && !isCollaborator) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 animate-in fade-in">
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-pink-200 dark:border-stone-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Khu vực Studio Tác giả & Quản trị
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {user ? (
                <>
                  Tài khoản <strong className="text-pink-600 font-mono">{user.email}</strong> hiện chưa được cấp quyền quản trị Studio.
                </>
              ) : (
                <>
                  Trang quản lý truyện chỉ dành riêng cho Tác giả <strong>Mellifluous</strong> và các cộng sự biên tập. Vui lòng đăng nhập với tài khoản Google tác giả để tiếp tục.
                </>
              )}
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={openAuthModal}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{user ? 'Đổi tài khoản tác giả khác' : 'Đăng nhập Tài khoản Tác giả'}</span>
            </button>
            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trở về Trang chủ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-medium animate-in slide-in-from-bottom-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-600 text-white border border-emerald-500'
              : 'bg-rose-600 text-white border border-rose-500'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Live Site Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <span className="text-pink-600 dark:text-pink-400 font-semibold">
            Studio Tác giả & Quản lý Truyện
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-pink-300 dark:hover:border-pink-800 text-stone-700 dark:text-stone-300 hover:text-pink-600 transition-colors flex items-center gap-1.5"
            title="Xem giao diện bạn đọc bên ngoài"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Xem blog ngoài web</span>
          </Link>
        </div>
      </div>

      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Không gian Sáng tác & Quản lý Truyện Mellifluous</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Trung tâm Tác giả Studio
            </h1>
            <p className="text-xs sm:text-sm text-pink-100 max-w-2xl leading-relaxed">
              Tích hợp đồng bộ: Đăng truyện mới, sửa truyện, thêm chương mới và chỉnh sửa chương của từng tác phẩm tại một nơi duy nhất.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('stories');
                setIsCreatingNewStory(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white text-pink-700 hover:bg-pink-50 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-pink-600" />
              <span>Đăng truyện mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-pink-100 dark:border-stone-800 scrollbar-none">
        <button
          type="button"
          onClick={() => handleSelectMainTab('stories')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'stories'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tác phẩm & Chương</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeMainTab === 'stories' ? 'bg-white/25 text-white' : 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300'
          }`}>
            {stories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('genres')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'genres'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Thể loại truyện</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'announcements'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Thông báo bạn đọc</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('music')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'music'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Nhạc nền blog</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('letters')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'letters'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Hòm thư bạn đọc</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('comments')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'comments'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Bình luận toàn trang</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('collaborators')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'collaborators'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cộng tác viên</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMainTab('sync')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeMainTab === 'sync'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800 hover:text-pink-600'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sao lưu & GitHub</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INTEGRATED STORY & CHAPTER WORKSPACE (PRIMARY USER REQUEST)     */}
      {/* ===================================================================== */}
      {activeMainTab === 'stories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Story Selector Pane */}
          <div className="lg:col-span-4 bg-white dark:bg-stone-900 rounded-3xl p-5 border border-pink-100 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-pink-500" />
                <span>Tủ truyện sáng tác</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCreatingNewStory(true)}
                className="px-2.5 py-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Đăng truyện mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Đăng truyện</span>
              </button>
            </div>

            {/* Story Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm truyện theo tên, tác giả..."
                value={storySearch}
                onChange={(e) => setStorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 transition-colors text-stone-800 dark:text-stone-200"
              />
            </div>

            {/* List of Stories */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredStories.map((s) => {
                const isSelected = !isCreatingNewStory && s.id === selectedStoryId;
                const chapCount = getStoryChapters(s.id).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStoryId(s.id);
                      setIsCreatingNewStory(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-pink-50/90 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 shadow-xs'
                        : 'border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 hover:border-pink-200'
                    }`}
                  >
                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 shadow-2xs">
                      <img
                        src={s.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PRESET_COVERS[0].url;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {s.title}
                      </div>
                      {s.originalTitle && (
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                          {s.originalTitle}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {s.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {chapCount} chương
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredStories.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-xs">
                  Không tìm thấy truyện phù hợp
                </div>
              )}
            </div>
          </div>

          {/* Right Column (8 cols): Integrated Workspace */}
          <div className="lg:col-span-8">
            {/* VIEW A: CREATE NEW STORY FORM */}
            {isCreatingNewStory ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-pink-100 dark:border-stone-800 shadow-sm space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-pink-100 dark:border-stone-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 text-[10px] font-bold">
                        Tác phẩm mới
                      </span>
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                      Đăng tác phẩm truyện mới
                    </h2>
                  </div>
                  {selectedStory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewStory(false)}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                  )}
                </div>

                <form onSubmit={handlePublishNewStory} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        Tên truyện (Tiếng Việt) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ví dụ: Chanh Xanh Cuồng Tưởng"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        Tên gốc (Hán Việt / Tiếng Trung)
                      </label>
                      <input
                        type="text"
                        value={newOriginalTitle}
                        onChange={(e) => setNewOriginalTitle(e.target.value)}
                        placeholder="Ví dụ: 青柠狂想"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        Tác giả gốc <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAuthor}
                        onChange={(e) => setNewAuthor(e.target.value)}
                        placeholder="Tác giả"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        Người chuyển ngữ / Editor
                      </label>
                      <input
                        type="text"
                        value={newTranslator}
                        onChange={(e) => setNewTranslator(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        Tình trạng sáng tác
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100 cursor-pointer"
                      >
                        <option value="ongoing">Đang tiến hành (Đang ra)</option>
                        <option value="completed">Đã hoàn thành</option>
                      </select>
                    </div>
                  </div>

                  {/* Cover Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Ảnh bìa tác phẩm (Chọn ảnh mẫu hoặc dán link ảnh tùy chọn)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRESET_COVERS.map((cov) => (
                        <button
                          key={cov.url}
                          type="button"
                          onClick={() => setNewCover(cov.url)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            newCover === cov.url
                              ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-400 font-semibold'
                              : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {cov.name}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Hoặc dán URL ảnh bìa tùy chỉnh (https://...)"
                      value={newCover}
                      onChange={(e) => setNewCover(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Genres Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Thể loại & Gắn thẻ truyện
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850">
                      {availableGenres.map((g) => {
                        const isChecked = newGenres.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setNewGenres(newGenres.filter((item) => item !== g));
                              } else {
                                setNewGenres([...newGenres, g]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-pink-500 text-white shadow-2xs'
                                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-pink-300'
                            }`}
                          >
                            {isChecked && '✓ '}
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Rich Text */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Văn án & Giới thiệu tác phẩm
                    </label>
                    <RichTextEditor
                      value={newSummary}
                      onChange={setNewSummary}
                      placeholder="Nhập văn án tác phẩm, lời dẫn dắt bạn đọc..."
                      minHeight="140px"
                    />
                  </div>

                  {/* Password Option */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200 dark:border-stone-700 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHasPassword}
                        onChange={(e) => setNewHasPassword(e.target.checked)}
                        className="rounded text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>Đặt mật khẩu (Password) bảo vệ truyện</span>
                      </span>
                    </label>

                    {newHasPassword && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                            Gợi ý Password
                          </label>
                          <input
                            type="text"
                            value={newPasswordHint}
                            onChange={(e) => setNewPasswordHint(e.target.value)}
                            placeholder="Gợi ý câu hỏi..."
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                            Đáp án mật khẩu (không dấu, viết thường)
                          </label>
                          <input
                            type="text"
                            value={newPasswordKey}
                            onChange={(e) => setNewPasswordKey(e.target.value)}
                            placeholder="Đáp án password"
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-pink-100 dark:border-stone-800">
                    {selectedStory && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewStory(false)}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
                      >
                        Quay lại
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isPublishingNewStory}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isPublishingNewStory ? 'Đang xuất bản...' : 'Xuất bản tác phẩm mới'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedStory ? (
              /* VIEW B: INTEGRATED STORY WORKSPACE (Selected Story) */
              <div className="space-y-6">
                {/* Active Story Banner Card */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-pink-100 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-22 rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 shadow-sm border border-stone-200 dark:border-stone-700">
                      <img
                        src={selectedStory.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PRESET_COVERS[0].url;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            selectedStory.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {selectedStory.status === 'completed' ? 'Đã hoàn thành' : 'Đang tiến hành'}
                        </span>
                        {selectedStory.hasPassword && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 font-semibold">
                            <Key className="w-2.5 h-2.5" />
                            <span>Có Pass</span>
                          </span>
                        )}
                      </div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 truncate mt-1">
                        {selectedStory.title}
                      </h2>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Tác giả: <strong>{selectedStory.author}</strong> • Editor: {selectedStory.translator} • Hiện có: <strong>{storyChapters.length}</strong> chương
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      to={`/bai-viet/${selectedStory.id}`}
                      className="px-3 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Xem trang tác phẩm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem trên web</span>
                    </Link>
                  </div>
                </div>

                {/* Sub-Tabs for this Story (Integrated 3 Modes) */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => setStorySubTab('newChapter')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      storySubTab === 'newChapter'
                        ? 'bg-white dark:bg-stone-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-pink-600'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Đăng chương mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStorySubTab('chapters')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      storySubTab === 'chapters'
                        ? 'bg-white dark:bg-stone-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-pink-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Danh sách & Sửa chương ({storyChapters.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStorySubTab('editStory')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      storySubTab === 'editStory'
                        ? 'bg-white dark:bg-stone-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-pink-600'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Chỉnh sửa thông tin truyện</span>
                  </button>
                </div>

                {/* ============================================================= */}
                {/* SUB-TAB 1: PUBLISH NEW CHAPTER FOR THIS STORY                 */}
                {/* ============================================================= */}
                {storySubTab === 'newChapter' && (
                  <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-pink-100 dark:border-stone-800 shadow-sm space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-stone-800">
                      <div>
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                          Đăng chương mới cho "{selectedStory.title}"
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Hệ thống tự động đề xuất số chương tiếp theo. Bạn có thể thay đổi tùy ý.
                        </p>
                      </div>
                    </div>

                    {/* Duplicate chapter warning modal/banner */}
                    {overwriteWarningChapter && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Chương {newChapterNumber} ({newChapterPartType === 'extra' ? 'Ngoại truyện' : 'Chính'}) đã tồn tại!</span>
                        </div>
                        <p>
                          Nếu tiếp tục lưu, nội dung chương "{overwriteWarningChapter.title}" trước đây sẽ được ghi đè và cập nhật mới.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handlePublishNewChapter(true)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
                          >
                            Xác nhận ghi đè cập nhật chương
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverwriteWarningChapter(null)}
                            className="px-3 py-1.5 rounded-lg border border-amber-300 text-stone-700 dark:text-stone-300 text-xs cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Loại phần
                          </label>
                          <select
                            value={newChapterPartType}
                            onChange={(e) => setNewChapterPartType(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer"
                          >
                            <option value="main">Chương chính</option>
                            <option value="extra">Ngoại truyện (Phiên ngoại)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Số thứ tự chương
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={newChapterNumber}
                            onChange={(e) => setNewChapterNumber(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Tiêu đề chương (Tùy chọn)
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Gặp gỡ dưới tán anh đào"
                            value={newChapterTitle}
                            onChange={(e) => setNewChapterTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                      </div>

                      {/* Content editor */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Nội dung chương truyện <span className="text-rose-500">*</span>
                        </label>
                        <RichTextEditor
                          value={newChapterContent}
                          onChange={setNewChapterContent}
                          placeholder="Viết hoặc dán nội dung chương truyện tại đây..."
                          minHeight="320px"
                        />
                      </div>

                      {/* Translator note */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Lời nhắn của Tác giả / Editor (Hiển thị đầu chương)
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Chúc mọi người đọc truyện vui vẻ! Hãy để lại bình luận nhé..."
                          value={newChapterTranslatorNote}
                          onChange={(e) => setNewChapterTranslatorNote(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                        />
                      </div>

                      {/* Chapter Password */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-stone-800/50 border border-amber-200 dark:border-stone-700 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newChapterIsLocked}
                            onChange={(e) => setNewChapterIsLocked(e.target.checked)}
                            className="rounded text-pink-600 focus:ring-pink-500"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Khóa chương này bằng Mật khẩu riêng</span>
                          </span>
                        </label>

                        {newChapterIsLocked && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                Gợi ý mật khẩu cho chương này
                              </label>
                              <input
                                type="text"
                                value={newChapterPasswordHint}
                                onChange={(e) => setNewChapterPasswordHint(e.target.value)}
                                placeholder="Gợi ý câu hỏi..."
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                Đáp án mật khẩu chương
                              </label>
                              <input
                                type="text"
                                value={newChapterPasswordKey}
                                onChange={(e) => setNewChapterPasswordKey(e.target.value)}
                                placeholder="Đáp án mật khẩu..."
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => handlePublishNewChapter(false)}
                          disabled={isPublishingNewChapter || !newChapterContent.trim()}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isPublishingNewChapter ? 'Đang đăng chương...' : 'Đăng chương này ngay'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================= */}
                {/* SUB-TAB 2: CHAPTER LIST & CHAPTER EDITOR FOR THIS STORY       */}
                {/* ============================================================= */}
                {storySubTab === 'chapters' && (
                  <div className="space-y-6">
                    {/* Chapter selector & filter */}
                    <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-pink-100 dark:border-stone-800 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-pink-500" />
                          <span>Danh sách tất cả các chương ({storyChapters.length})</span>
                        </h3>
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Lọc theo số chương hoặc tên..."
                            value={chapterFilterQuery}
                            onChange={(e) => setChapterFilterQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                      </div>

                      {/* Chapter pills list */}
                      <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                        {filteredStoryChapters.map((chap) => {
                          const isSelected = chap.id === selectedChapterId;
                          return (
                            <button
                              key={chap.id}
                              type="button"
                              onClick={() => setSelectedChapterId(chap.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-pink-500 text-white shadow-2xs'
                                  : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-pink-300'
                              }`}
                            >
                              <span>
                                {chap.partType === 'extra' || chap.isExtra ? 'Ngoại' : 'C'}
                                {chap.chapterNumber}
                              </span>
                              {chap.isLocked && <Lock className="w-2.5 h-2.5" />}
                            </button>
                          );
                        })}

                        {filteredStoryChapters.length === 0 && (
                          <div className="text-center py-6 text-stone-400 text-xs w-full">
                            Chưa có chương nào trong danh sách. Hãy bấm "Đăng chương mới" để bắt đầu!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Selected Chapter Editor */}
                    {selectedChapterId && (
                      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-pink-100 dark:border-stone-800 shadow-sm space-y-6 animate-in fade-in">
                        <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-stone-800">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-pink-600 dark:text-pink-400">
                              Chỉnh sửa chương truyện
                            </span>
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                              {editChapTitle || `Chương ${editChapNumber}`}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const chap = storyChapters.find((c) => c.id === selectedChapterId);
                              if (chap) setChapterToDelete({ id: chap.id, title: chap.title });
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa chương</span>
                          </button>
                        </div>

                        {/* Chapter delete confirm modal */}
                        {chapterToDelete && (
                          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                            <div className="font-bold flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>Bạn có chắc chắn muốn xóa chương "{chapterToDelete.title}"?</span>
                            </div>
                            <p>Hành động này sẽ xóa vĩnh viễn nội dung chương này khỏi blog.</p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleDeleteChapterConfirm}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
                              >
                                Xác nhận xóa vĩnh viễn
                              </button>
                              <button
                                type="button"
                                onClick={() => setChapterToDelete(null)}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 text-stone-700 dark:text-stone-300 text-xs cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                                Loại phần
                              </label>
                              <select
                                value={editChapPartType}
                                onChange={(e) => setEditChapPartType(e.target.value as any)}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer"
                              >
                                <option value="main">Chương chính</option>
                                <option value="extra">Ngoại truyện (Phiên ngoại)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                                Số thứ tự chương
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editChapNumber}
                                onChange={(e) => setEditChapNumber(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                                Tiêu đề chương
                              </label>
                              <input
                                type="text"
                                value={editChapTitle}
                                onChange={(e) => setEditChapTitle(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Nội dung chương
                            </label>
                            <RichTextEditor
                              value={editChapContent}
                              onChange={setEditChapContent}
                              minHeight="340px"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Lời nhắn của Editor / Tác giả
                            </label>
                            <input
                              type="text"
                              value={editChapTranslatorNote}
                              onChange={(e) => setEditChapTranslatorNote(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                            />
                          </div>

                          {/* Chapter Password */}
                          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-stone-800/50 border border-amber-200 dark:border-stone-700 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editChapIsLocked}
                                onChange={(e) => setEditChapIsLocked(e.target.checked)}
                                className="rounded text-pink-600 focus:ring-pink-500"
                              />
                              <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Khóa chương này bằng Mật khẩu riêng</span>
                              </span>
                            </label>

                            {editChapIsLocked && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                    Gợi ý mật khẩu cho chương này
                                  </label>
                                  <input
                                    type="text"
                                    value={editChapPasswordHint}
                                    onChange={(e) => setEditChapPasswordHint(e.target.value)}
                                    placeholder="Gợi ý câu hỏi..."
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                    Đáp án mật khẩu chương
                                  </label>
                                  <input
                                    type="text"
                                    value={editChapPasswordKey}
                                    onChange={(e) => setEditChapPasswordKey(e.target.value)}
                                    placeholder="Đáp án mật khẩu..."
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-3">
                            <button
                              type="button"
                              onClick={handleSaveEditedChapter}
                              disabled={isSavingChapter || !editChapContent.trim()}
                              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>{isSavingChapter ? 'Đang lưu...' : 'Lưu cập nhật chương'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================= */}
                {/* SUB-TAB 3: EDIT STORY INFO                                   */}
                {/* ============================================================= */}
                {storySubTab === 'editStory' && (
                  <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-pink-100 dark:border-stone-800 shadow-sm space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-stone-800">
                      <div>
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                          Chỉnh sửa thông tin tác phẩm "{selectedStory.title}"
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Cập nhật tiêu đề, ảnh bìa, thể loại, văn án và mật khẩu toàn truyện.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStoryToDelete({ id: selectedStory.id, title: selectedStory.title })}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa truyện này</span>
                      </button>
                    </div>

                    {/* Story delete confirm modal */}
                    {storyToDelete && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                        <div className="font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Bạn có chắc chắn muốn xóa toàn bộ tác phẩm "{storyToDelete.title}"?</span>
                        </div>
                        <p>Hành động này sẽ xóa truyện và toàn bộ các chương liên quan khỏi blog.</p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleDeleteStoryConfirm}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
                          >
                            Xác nhận xóa truyện
                          </button>
                          <button
                            type="button"
                            onClick={() => setStoryToDelete(null)}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-stone-700 dark:text-stone-300 text-xs cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSaveEditedStory} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Tên truyện (Tiếng Việt) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Tên gốc (Hán Việt / Tiếng Trung)
                          </label>
                          <input
                            type="text"
                            value={editOriginalTitle}
                            onChange={(e) => setEditOriginalTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-pink-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Tác giả gốc
                          </label>
                          <input
                            type="text"
                            required
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Người chuyển ngữ / Editor
                          </label>
                          <input
                            type="text"
                            value={editTranslator}
                            onChange={(e) => setEditTranslator(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                            Tình trạng sáng tác
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer"
                          >
                            <option value="ongoing">Đang tiến hành (Đang ra)</option>
                            <option value="completed">Đã hoàn thành</option>
                          </select>
                        </div>
                      </div>

                      {/* Cover Selection */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Ảnh bìa truyện
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {PRESET_COVERS.map((cov) => (
                            <button
                              key={cov.url}
                              type="button"
                              onClick={() => setEditCover(cov.url)}
                              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                editCover === cov.url
                                  ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-400 font-semibold'
                                  : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {cov.name}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={editCover}
                          onChange={(e) => setEditCover(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                        />
                      </div>

                      {/* Genres Selection */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Thể loại truyện
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850">
                          {availableGenres.map((g) => {
                            const isChecked = editGenres.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  if (isChecked) {
                                    setEditGenres(editGenres.filter((item) => item !== g));
                                  } else {
                                    setEditGenres([...editGenres, g]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-pink-500 text-white shadow-2xs'
                                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-pink-300'
                                }`}
                              >
                                {isChecked && '✓ '}
                                {g}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Văn án tác phẩm
                        </label>
                        <RichTextEditor
                          value={editSummary}
                          onChange={setEditSummary}
                          minHeight="140px"
                        />
                      </div>

                      {/* Password Protection */}
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200 dark:border-stone-700 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHasPassword}
                            onChange={(e) => setEditHasPassword(e.target.checked)}
                            className="rounded text-pink-600 focus:ring-pink-500"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>Đặt mật khẩu (Password) bảo vệ truyện</span>
                          </span>
                        </label>

                        {editHasPassword && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                Gợi ý Password
                              </label>
                              <input
                                type="text"
                                value={editPasswordHint}
                                onChange={(e) => setEditPasswordHint(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                                Đáp án mật khẩu
                              </label>
                              <input
                                type="text"
                                value={editPasswordKey}
                                onChange={(e) => setEditPasswordKey(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="submit"
                          disabled={isSavingStory}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSavingStory ? 'Đang lưu...' : 'Lưu thay đổi thông tin truyện'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: GENRES MANAGEMENT                                               */}
      {/* ===================================================================== */}
      {activeMainTab === 'genres' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorGenresTab
            onFeedback={showFeedback}
            onGenreChanged={() => {
              setAvailableGenres(getCustomGenres());
            }}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ANNOUNCEMENTS MANAGEMENT                                        */}
      {/* ===================================================================== */}
      {activeMainTab === 'announcements' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorAnnouncementsTab
            announcements={announcements}
            onFeedback={showFeedback}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: MUSIC MANAGEMENT                                                */}
      {/* ===================================================================== */}
      {activeMainTab === 'music' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorMusicTab onFeedback={showFeedback} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: READER LETTERS                                                  */}
      {/* ===================================================================== */}
      {activeMainTab === 'letters' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-stone-800">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Hòm thư bạn đọc gửi về blog ({letters.length})
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Đọc tâm tư độc giả gửi tới Mellifluous và hồi đáp trực tiếp.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-pink-700 dark:text-pink-300">
                    {letter.senderName || 'Bạn đọc ẩn danh'} ({letter.senderEmail || 'Không để lại email'})
                  </div>
                  <div className="text-stone-400 text-[10px]">
                    {formatDateTime(letter.createdAt)}
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                  {letter.content}
                </div>

                {letter.authorReply ? (
                  <div className="p-3 rounded-xl bg-pink-50/80 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900 text-xs text-pink-900 dark:text-pink-200">
                    <span className="font-bold">🌸 Hồi đáp của Mellifluous: </span>
                    <span>{letter.authorReply}</span>
                  </div>
                ) : (
                  <div>
                    {replyingLetterId === letter.id ? (
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={3}
                          value={authorReplyInput}
                          onChange={(e) => setAuthorReplyInput(e.target.value)}
                          placeholder="Viết lời hồi đáp gửi bạn đọc..."
                          className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-pink-300 dark:border-pink-700 focus:outline-hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReplyLetter(letter.id)}
                            disabled={isSendingReply || !authorReplyInput.trim()}
                            className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            <span>Gửi hồi đáp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyingLetterId(null)}
                            className="px-3 py-1.5 rounded-xl border text-xs text-stone-600 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingLetterId(letter.id);
                          setAuthorReplyInput('');
                        }}
                        className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Hồi đáp thư này</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {letters.length === 0 && (
              <div className="text-center py-10 text-stone-400 text-xs">
                Chưa có thư bạn đọc nào gửi về hòm thư.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: ALL SITE COMMENTS                                               */}
      {/* ===================================================================== */}
      {activeMainTab === 'comments' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorCommentsTab
            stories={stories}
            onFeedback={showFeedback}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: COLLABORATORS                                                   */}
      {/* ===================================================================== */}
      {activeMainTab === 'collaborators' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorCollaboratorsTab onFeedback={showFeedback} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 8: CLOUD SYNC & GITHUB                                             */}
      {/* ===================================================================== */}
      {activeMainTab === 'sync' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-pink-100 dark:border-stone-800 shadow-sm">
          <AuthorSyncTab onFeedback={showFeedback} />
        </div>
      )}
    </div>
  );
};
