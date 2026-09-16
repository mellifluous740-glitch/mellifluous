import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
} from './firebase';
import { CollaboratorItem, UserProfile } from '../types';
import {
  subscribeToCollaborators,
  addCollaborator,
  deleteCollaborator,
  updateCollaboratorRole,
  getUserProfile,
  saveUserProfile,
  subscribeToUserProfile,
} from './realtimeService';

// Danh sách email chính thức ban đầu của Tác giả & Các Cộng sự quản trị viên
export const AUTHOR_EMAILS: string[] = [
  'cuncondangiu07@gmail.com',
  'meomeoxinhxinh07@gmail.com',
  'nhatlinhpham010194@gmail.com',
  'maianhpham927@gmail.com',
  'duongtieuvi102@gmail.com',
  'nguyenplinh1002@gmail.com',
  'nguyenlinhph0210@gmail.com',
  'luclamly920@gmail.com',
  'uongthienyenvi123@gmail.com',
  'vivi60810@gmail.com',
].map((email) => email.toLowerCase().trim());

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string | null;
  favoriteGenre?: string | null;
  websiteOrSocial?: string | null;
  isAuthor: boolean;
  isMainAuthor: boolean;
  isCollaborator: boolean;
  role: 'author' | 'admin' | 'collaborator' | 'editor' | 'reader';
  roleTitle: string;
  roleBadge: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthor: boolean;
  isMainAuthor: boolean;
  isCollaborator: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  collaboratorsList: CollaboratorItem[];
  addCollaboratorByEmail: (email: string, displayName: string, role: CollaboratorItem['role'], note?: string) => Promise<void>;
  removeCollaborator: (collabId: string) => Promise<void>;
  updateCollaboratorRoleByAdmin: (collabId: string, role: CollaboratorItem['role'], roleTitle?: string) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  quickAuthorLogin: (authorEmail: string) => void;
  quickReaderLogin: (nickname: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('mel_user_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Subscribe to real-time collaborators from Firestore
  useEffect(() => {
    const unsub = subscribeToCollaborators((list) => {
      setCollaboratorsList(list);
    });
    return unsub;
  }, []);

  // Helper to construct normalized AppUser object with dynamic collaborator privilege check
  const buildAppUser = (
    fbUser: User | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
    collaborators: CollaboratorItem[] = collaboratorsList,
    profileOverride?: Partial<UserProfile> | null
  ): AppUser => {
    const emailLower = (fbUser.email || '').toLowerCase().trim();
    const isDefaultAuthor = AUTHOR_EMAILS.includes(emailLower);
    const matchedCollab = collaborators.find((c) => c.email.toLowerCase().trim() === emailLower);

    const isAuthor = isDefaultAuthor || Boolean(matchedCollab);
    const isMainAuthor =
      isDefaultAuthor &&
      (emailLower === 'cuncondangiu07@gmail.com' ||
        emailLower === 'meomeoxinhxinh07@gmail.com' ||
        emailLower === 'nhatlinhpham010194@gmail.com' ||
        emailLower === 'maianhpham927@gmail.com');
    const isCollaborator = isAuthor && !isMainAuthor;

    let roleTitle = 'Độc giả yêu mến';
    let roleBadge = 'Độc giả';
    let role: 'author' | 'admin' | 'collaborator' | 'editor' | 'reader' = 'reader';

    if (isMainAuthor) {
      roleTitle = 'Tác giả • Mellifluous';
      roleBadge = 'Tác giả';
      role = 'author';
    } else if (matchedCollab) {
      role = matchedCollab.role;
      roleTitle = matchedCollab.roleTitle || (matchedCollab.role === 'admin' ? 'Quản trị viên' : matchedCollab.role === 'author' ? 'Đồng tác giả' : matchedCollab.role === 'editor' ? 'Biên tập viên' : 'Cộng sự BQT');
      roleBadge = matchedCollab.role === 'admin' ? 'Quản trị' : matchedCollab.role === 'author' ? 'Tác giả' : matchedCollab.role === 'editor' ? 'Editor' : 'Cộng sự';
    } else if (isCollaborator) {
      roleTitle = 'Cộng sự • Ban quản trị';
      roleBadge = 'Cộng sự';
      role = 'collaborator';
    }

    const finalDisplayName = profileOverride?.displayName || fbUser.displayName || (isMainAuthor ? 'Mellifluous (Tác giả)' : isCollaborator ? 'Cộng sự BQT' : 'Độc giả thân thương');
    const finalPhotoURL = profileOverride?.photoURL !== undefined ? profileOverride.photoURL : fbUser.photoURL || null;

    return {
      uid: fbUser.uid,
      email: fbUser.email || null,
      displayName: finalDisplayName,
      photoURL: finalPhotoURL,
      bio: profileOverride?.bio || null,
      favoriteGenre: profileOverride?.favoriteGenre || null,
      websiteOrSocial: profileOverride?.websiteOrSocial || null,
      isAuthor,
      isMainAuthor,
      isCollaborator,
      role,
      roleTitle,
      roleBadge,
    };
  };

  // Re-verify roles when collaboratorsList updates
  useEffect(() => {
    if (user && user.email) {
      const updatedUser = buildAppUser(user, collaboratorsList, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        bio: user.bio,
        favoriteGenre: user.favoriteGenre,
        websiteOrSocial: user.websiteOrSocial,
      });
      // Only update if role status changed
      if (
        updatedUser.isAuthor !== user.isAuthor ||
        updatedUser.role !== user.role ||
        updatedUser.roleTitle !== user.roleTitle
      ) {
        setUser(updatedUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(updatedUser));
        } catch {}
      }
    }
  }, [collaboratorsList]);

  // Auth listener & live profile sync
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch saved profile from Firestore/local
        const savedProfile = await getUserProfile(fbUser.uid);
        const appUser = buildAppUser(fbUser, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}

        // Listen to profile updates
        profileUnsub = subscribeToUserProfile(fbUser.uid, (latestProfile) => {
          if (latestProfile) {
            setUser((prev) => {
              if (!prev) return null;
              const merged = buildAppUser(
                {
                  uid: prev.uid,
                  email: prev.email,
                  displayName: latestProfile.displayName || prev.displayName,
                  photoURL: latestProfile.photoURL || prev.photoURL,
                },
                collaboratorsList,
                latestProfile
              );
              try {
                localStorage.setItem('mel_user_session', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        });
      } else {
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
        try {
          const saved = localStorage.getItem('mel_user_session');
          if (!saved) {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Update profile handler (avatar, bio, display name, etc.)
  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updatedProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: (data.displayName || user.displayName || 'Độc giả').trim(),
      photoURL: data.photoURL !== undefined ? data.photoURL : user.photoURL,
      bio: data.bio !== undefined ? data.bio : user.bio || '',
      favoriteGenre: data.favoriteGenre !== undefined ? data.favoriteGenre : user.favoriteGenre || '',
      websiteOrSocial: data.websiteOrSocial !== undefined ? data.websiteOrSocial : user.websiteOrSocial || '',
      role: user.role,
      roleTitle: user.roleTitle,
      updatedAt: new Date().toISOString(),
    };

    // 1. Firebase Auth profile update
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updatedProfile.displayName,
        photoURL: updatedProfile.photoURL || undefined,
      }).catch(() => {});
    }

    // 2. Firestore & localStorage persistence
    await saveUserProfile(updatedProfile);

    // 3. Local React state
    const newAppUser = buildAppUser(
      {
        uid: user.uid,
        email: user.email,
        displayName: updatedProfile.displayName,
        photoURL: updatedProfile.photoURL,
      },
      collaboratorsList,
      updatedProfile
    );
    setUser(newAppUser);
    try {
      localStorage.setItem('mel_user_session', JSON.stringify(newAppUser));
    } catch {}
  };

  // Collaborator management functions
  const addCollaboratorByEmail = async (
    email: string,
    displayName: string,
    role: CollaboratorItem['role'],
    note?: string
  ) => {
    const roleTitleMap: Record<CollaboratorItem['role'], string> = {
      author: 'Đồng tác giả / Tác giả',
      admin: 'Quản trị viên hệ thống',
      collaborator: 'Cộng sự Ban quản trị',
      editor: 'Biên tập viên / Editor',
    };

    await addCollaborator({
      email,
      displayName: displayName.trim() || email.split('@')[0],
      role,
      roleTitle: roleTitleMap[role],
      addedBy: user?.displayName || user?.email || 'Tác giả chính',
      note: note || '',
    });
  };

  const removeCollaborator = async (collabId: string) => {
    await deleteCollaborator(collabId);
  };

  const updateCollaboratorRoleByAdmin = async (
    collabId: string,
    role: CollaboratorItem['role'],
    roleTitle?: string
  ) => {
    await updateCollaboratorRole(collabId, role, roleTitle);
  };

  // Sign in with Google Popup
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const savedProfile = await getUserProfile(result.user.uid);
        const appUser = buildAppUser(result.user, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
      }
      closeAuthModal();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  // Sign in with Email / Password
  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (result.user) {
        const savedProfile = await getUserProfile(result.user.uid);
        const appUser = buildAppUser(result.user, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
      }
      closeAuthModal();
    } catch (err: any) {
      console.error('Email sign in error:', err);
      throw err;
    }
  };

  // Register with Email / Password
  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (result.user) {
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() }).catch(() => {});
        }
        const updatedUser = {
          ...result.user,
          displayName: name.trim() || result.user.displayName,
        };
        const appUser = buildAppUser(updatedUser, collaboratorsList);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
      }
      closeAuthModal();
    } catch (err: any) {
      console.error('Register error:', err);
      throw err;
    }
  };

  // Quick switch / Direct sign-in for Author & Collaborators
  const quickAuthorLogin = (authorEmail: string) => {
    const cleanEmail = authorEmail.toLowerCase().trim();
    const isMain =
      cleanEmail === 'cuncondangiu07@gmail.com' ||
      cleanEmail.split('@')[0] === 'cuncondangiu07' ||
      cleanEmail === 'meomeoxinhxinh07@gmail.com' ||
      cleanEmail.split('@')[0] === 'meomeoxinhxinh07' ||
      cleanEmail.split('@')[0] === 'nhatlinhpham010194' ||
      cleanEmail.split('@')[0] === 'maianhpham927';
    const appUser: AppUser = {
      uid: `author_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: cleanEmail,
      displayName: isMain ? 'Mellifluous (Tác giả chính)' : `Cộng sự (${cleanEmail.split('@')[0]})`,
      photoURL: null,
      isAuthor: true,
      isMainAuthor: isMain,
      isCollaborator: !isMain,
      role: isMain ? 'author' : 'collaborator',
      roleTitle: isMain ? 'Tác giả • Mellifluous' : 'Cộng sự • Ban quản trị',
      roleBadge: isMain ? 'Tác giả' : 'Cộng sự',
    };
    setUser(appUser);
    try {
      localStorage.setItem('mel_user_session', JSON.stringify(appUser));
    } catch {}
    closeAuthModal();
  };

  // Quick sign-in for Readers / Guests
  const quickReaderLogin = (nickname: string) => {
    const trimmed = nickname.trim() || 'Bạn đọc thân thương';
    const appUser: AppUser = {
      uid: `reader_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: null,
      displayName: trimmed,
      photoURL: null,
      isAuthor: false,
      isMainAuthor: false,
      isCollaborator: false,
      role: 'reader',
      roleTitle: 'Độc giả yêu mến',
      roleBadge: 'Độc giả',
    };
    setUser(appUser);
    try {
      localStorage.setItem('mel_user_session', JSON.stringify(appUser));
    } catch {}
    closeAuthModal();
  };

  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('mel_user_session');
      } catch {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthor: Boolean(user?.isAuthor),
        isMainAuthor: Boolean(user?.isMainAuthor),
        isCollaborator: Boolean(user?.isCollaborator),
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        collaboratorsList,
        addCollaboratorByEmail,
        removeCollaborator,
        updateCollaboratorRoleByAdmin,
        updateUserProfileData,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        quickAuthorLogin,
        quickReaderLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

