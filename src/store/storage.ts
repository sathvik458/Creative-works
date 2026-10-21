/**
 * Storage service. Everything the app persists goes through this adapter, so
 * swapping localStorage for a database later only means writing a new adapter
 * (same 3 methods) and exporting it as `storage` below.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();

/** In-memory fallback (SSR, private mode, blocked storage). */
export const memoryAdapter: StorageAdapter = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

export const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryAdapter.getItem(key);
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryAdapter.setItem(key, value);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryAdapter.removeItem(key);
    }
  },
};

export const storage: StorageAdapter = typeof window === "undefined" ? memoryAdapter : localStorageAdapter;
export const STORAGE_KEY = "language-stories:v1";
