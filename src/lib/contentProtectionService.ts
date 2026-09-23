/**
 * Content Protection & Anti-Theft Service for Mellifluous
 * Prevents unauthorized copying, scraping, right-click, and reuploading.
 */

export interface ProtectionConfig {
  enabled: boolean;
  blockRightClick: boolean;
  blockCopy: boolean;
  blockShortcuts: boolean;
  blockPrint: boolean;
  invisibleWatermark: boolean;
  customWarningMessage: string;
}

const STORAGE_KEY = 'mel_content_protection_config_v1';

export const DEFAULT_PROTECTION_CONFIG: ProtectionConfig = {
  enabled: true,
  blockRightClick: true,
  blockCopy: true,
  blockShortcuts: true,
  blockPrint: true,
  invisibleWatermark: true,
  customWarningMessage: 'Nội dung thuộc bản quyền của Mellifluous (better and better). Vui lòng không sao chép hoặc đăng tải lại!',
};

let currentConfig: ProtectionConfig = { ...DEFAULT_PROTECTION_CONFIG };
let isInitialized = false;
const listeners = new Set<(config: ProtectionConfig) => void>();

export const getProtectionConfig = (): ProtectionConfig => {
  if (!isInitialized && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        currentConfig = { ...DEFAULT_PROTECTION_CONFIG, ...parsed };
      }
    } catch {
      currentConfig = { ...DEFAULT_PROTECTION_CONFIG };
    }
    isInitialized = true;
  }
  return { ...currentConfig };
};

export const saveProtectionConfig = (patch: Partial<ProtectionConfig>): ProtectionConfig => {
  currentConfig = { ...getProtectionConfig(), ...patch };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
    } catch {}
  }
  listeners.forEach((cb) => {
    try {
      cb({ ...currentConfig });
    } catch {}
  });
  return { ...currentConfig };
};

export const subscribeProtectionConfig = (cb: (config: ProtectionConfig) => void): (() => void) => {
  listeners.add(cb);
  cb(getProtectionConfig());
  return () => {
    listeners.delete(cb);
  };
};

/**
 * Checks if target element is an input, textarea, or user-editable component.
 * Ensures author admin inputs are NEVER blocked!
 */
export const isEditableElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  if (target.isContentEditable) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"], .allow-select, .allow-context-menu')) {
    return true;
  }
  return false;
};
