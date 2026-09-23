import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';
import {
  getProtectionConfig,
  subscribeProtectionConfig,
  isEditableElement,
  ProtectionConfig,
} from '../../lib/contentProtectionService';

export const ContentProtection: React.FC = () => {
  const [config, setConfig] = useState<ProtectionConfig>(getProtectionConfig);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return subscribeProtectionConfig((updated) => setConfig(updated));
  }, []);

  const showWarning = (customMsg?: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(customMsg || config.customWarningMessage);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  useEffect(() => {
    if (!config.enabled) return;

    // 1. Context Menu (Right-Click) Protection
    const handleContextMenu = (e: MouseEvent) => {
      if (!config.blockRightClick) return;
      if (isEditableElement(e.target)) return;

      e.preventDefault();
      showWarning(config.customWarningMessage);
    };

    // 2. Clipboard Copy & Cut Protection
    const handleCopy = (e: ClipboardEvent) => {
      if (!config.blockCopy) return;
      if (isEditableElement(e.target)) return;

      e.preventDefault();
      try {
        if (e.clipboardData) {
          const watermark =
            'Nội dung thuộc bản quyền độc quyền của Mellifluous (better and better).\n' +
            'Vui lòng đọc trực tiếp tại website và không sao chép, đăng tải lại trái phép!\n' +
            'Website: ' + window.location.origin;
          e.clipboardData.setData('text/plain', watermark);
        }
      } catch {}
      showWarning('Đã chặn thao tác sao chép! Nội dung được bảo hộ bản quyền bởi Mellifluous.');
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!config.blockCopy) return;
      if (isEditableElement(e.target)) return;
      e.preventDefault();
      showWarning('Đã chặn thao tác cắt nội dung!');
    };

    // 3. Selection Start Protection
    const handleSelectStart = (e: Event) => {
      if (!config.blockCopy) return;
      if (isEditableElement(e.target)) return;
      const target = e.target as HTMLElement;
      // Allow selecting in non-story UI if needed, but block on story & reader components
      if (
        target.closest('.reader-prose') ||
        target.closest('.protected-content') ||
        target.closest('[data-protected="true"]')
      ) {
        e.preventDefault();
      }
    };

    // 4. Drag and Drop Protection
    const handleDragStart = (e: DragEvent) => {
      if (isEditableElement(e.target)) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'img' ||
        target.closest('.reader-prose') ||
        target.closest('.protected-content')
      ) {
        e.preventDefault();
      }
    };

    // 5. DevTools & Printing Shortcut Protections
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!config.blockShortcuts) return;
      if (isEditableElement(e.target)) return;

      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        showWarning('Phím tắt nhà phát triển bị vô hiệu hóa để bảo vệ bản quyền.');
        return;
      }

      // Ctrl/Cmd + Shift + I/J/C (DevTools Inspect & Console)
      if (isCmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        showWarning('Công cụ kiểm tra phần tử bị vô hiệu hóa để bảo vệ nội dung tác giả.');
        return;
      }

      // Ctrl/Cmd + U (View Source)
      if (isCmdOrCtrl && key === 'u') {
        e.preventDefault();
        showWarning('Xem mã nguồn trang đã bị vô hiệu hóa.');
        return;
      }

      // Ctrl/Cmd + S (Save Page)
      if (isCmdOrCtrl && key === 's') {
        e.preventDefault();
        showWarning('Lưu trang web bị vô hiệu hóa để tránh tải trộm nội dung.');
        return;
      }

      // Ctrl/Cmd + P (Print to PDF)
      if (isCmdOrCtrl && key === 'p') {
        if (config.blockPrint) {
          e.preventDefault();
          showWarning('Tính năng in ấn (Print / Save as PDF) đã bị khóa để bảo vệ bản quyền.');
          return;
        }
      }

      // Ctrl/Cmd + C (Copy shortcut)
      if (isCmdOrCtrl && key === 'c') {
        if (config.blockCopy) {
          e.preventDefault();
          showWarning('Phím tắt sao chép (Ctrl+C) đã bị khóa. Vui lòng tôn trọng bản quyền dịch giả!');
          return;
        }
      }

      // Ctrl/Cmd + A (Select All) inside protected container
      if (isCmdOrCtrl && key === 'a') {
        const selection = window.getSelection();
        if (selection) {
          const anchor = selection.anchorNode?.parentElement;
          if (anchor && (anchor.closest('.reader-prose') || anchor.closest('.protected-content'))) {
            e.preventDefault();
            selection.removeAllRanges();
            showWarning('Chọn toàn bộ văn bản bị vô hiệu hóa trong khu vực đọc truyện.');
            return;
          }
        }
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('copy', handleCopy, { capture: true });
    window.addEventListener('cut', handleCut, { capture: true });
    document.addEventListener('selectstart', handleSelectStart, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('copy', handleCopy, { capture: true });
      window.removeEventListener('cut', handleCut, { capture: true });
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [config]);

  return (
    <>
      {/* Toast Notification for attempted theft/copy */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-9999 max-w-[92vw] sm:max-w-md w-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-stone-900/95 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xl backdrop-blur-md border border-pink-500/40 text-xs sm:text-sm font-medium">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 dark:bg-pink-500/30 flex items-center justify-center shrink-0 text-pink-400 dark:text-pink-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-1">
              <div className="font-serif font-bold text-pink-300 dark:text-pink-700 text-xs flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bảo vệ bản quyền • Mellifluous</span>
              </div>
              <p className="leading-snug text-stone-200 dark:text-stone-800">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 text-stone-400 hover:text-white dark:text-stone-500 dark:hover:text-stone-900 rounded-lg transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Print Protection Watermark Overlay (Displays only when user tries to Print/Save as PDF) */}
      <div id="print-protection-notice" style={{ display: 'none' }}>
        <div style={{ maxWidth: '600px', margin: '150px auto', textAlign: 'center', padding: '30px', border: '3px solid #f43f5e', borderRadius: '16px' }}>
          <h1 style={{ fontSize: '28px', color: '#be123c', marginBottom: '16px', fontWeight: 'bold' }}>
            NỘI DUNG ĐƯỢC BẢO HỘ BẢN QUYỀN
          </h1>
          <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.8' }}>
            Toàn bộ các tác phẩm và bản dịch trên website <strong>Mellifluous (better and better)</strong> được bảo vệ bản quyền độc quyền.
          </p>
          <p style={{ fontSize: '15px', color: '#e11d48', marginTop: '12px', fontWeight: 'bold' }}>
            Hành vi in ấn, sao chép hoặc phát tán trái phép là vi phạm quyền tác giả!
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
            Website chính thức: mellifluous740-glitch.github.io/mellifluous
          </p>
        </div>
      </div>
    </>
  );
};
