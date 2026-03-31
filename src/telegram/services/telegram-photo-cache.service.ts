/**
 * Persistent photo cache using IndexedDB.
 * Photos are stored as blobs keyed by entity ID.
 * In-memory blob URLs are created on demand and kept for the session.
 */

const DB_NAME = 'telegram_photo_cache';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** In-memory blob URL cache — survives for the session */
const blobUrlCache = new Map<string, string>();

export const TelegramPhotoCacheService = {
  /**
   * Get a blob URL from the in-memory cache.
   */
  getMemoryCached(key: string): string | null {
    return blobUrlCache.get(key) || null;
  },

  /**
   * Load a photo from IndexedDB and create a blob URL.
   * Returns null if not found in cache.
   */
  async loadFromDisk(key: string): Promise<string | null> {
    // Already in memory
    if (blobUrlCache.has(key)) return blobUrlCache.get(key)!;

    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const blob = request.result as Blob | undefined;
          if (!blob) {
            resolve(null);
            return;
          }
          const url = URL.createObjectURL(blob);
          blobUrlCache.set(key, url);
          resolve(url);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Save photo data to IndexedDB and create a blob URL.
   * `data` should be a Uint8Array of the image bytes.
   */
  async saveToDisk(key: string, data: Uint8Array): Promise<string> {
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(key, url);

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, key);
    } catch {
      // Silently fail disk write — in-memory still works
    }

    return url;
  },

  /**
   * Check if a photo is in the in-memory or disk cache.
   */
  async has(key: string): Promise<boolean> {
    if (blobUrlCache.has(key)) return true;

    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count(key);
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  /**
   * Clear all cached photos.
   */
  async clear() {
    for (const url of blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    blobUrlCache.clear();

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {}
  },
};
