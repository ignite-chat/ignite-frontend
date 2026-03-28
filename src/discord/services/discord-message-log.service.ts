import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordMessageLogStore, type LoggedMessage } from '../store/discord-message-log.store';
import type { DiscordMessage } from '../types';

const DB_NAME = 'ignite_discord_message_log';
const DB_VERSION = 1;
const MSG_STORE = 'messages';
const ATTACH_STORE = 'attachments';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MSG_STORE)) {
        const store = db.createObjectStore(MSG_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('channelId', 'channelId', { unique: false });
        store.createIndex('loggedAt', 'loggedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(ATTACH_STORE)) {
        db.createObjectStore(ATTACH_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Auto-incrementing ID for IndexedDB entries */
type PersistedLogEntry = LoggedMessage & { id?: number; channelId: string };

/**
 * Service that captures deleted/edited Discord messages before they are removed
 * from the live store, and optionally persists them.
 */
export const DiscordMessageLogService = {
  /**
   * Called BEFORE a message is removed from the channel store.
   * Captures the message snapshot and logs it.
   */
  onMessageDelete(channelId: string, messageId: string, guildId: string | null) {
    const store = useDiscordMessageLogStore.getState();
    if (!store.isChannelLogged(channelId, guildId)) return;

    const messages = useDiscordChannelsStore.getState().channelMessages[channelId];
    const message = messages?.find((m: DiscordMessage) => m.id === messageId);
    if (!message) return;

    const entry: LoggedMessage = {
      message: structuredClone(message),
      type: 'deleted',
      loggedAt: new Date().toISOString(),
      guildId,
    };

    store.addLogEntry(entry);
    this._persist(entry, channelId);
    this._handleAttachments(message, channelId);
  },

  /**
   * Called BEFORE a bulk delete removes messages from the channel store.
   */
  onMessageDeleteBulk(channelId: string, messageIds: string[], guildId: string | null) {
    const store = useDiscordMessageLogStore.getState();
    if (!store.isChannelLogged(channelId, guildId)) return;

    const messages = useDiscordChannelsStore.getState().channelMessages[channelId];
    if (!messages) return;

    const idSet = new Set(messageIds);
    const entries: LoggedMessage[] = [];

    for (const msg of messages) {
      if (idSet.has(msg.id)) {
        const entry: LoggedMessage = {
          message: structuredClone(msg),
          type: 'deleted',
          loggedAt: new Date().toISOString(),
          guildId,
        };
        entries.push(entry);
        this._handleAttachments(msg, channelId);
      }
    }

    if (entries.length > 0) {
      store.addLogEntries(entries);
      for (const entry of entries) {
        this._persist(entry, channelId);
      }
    }
  },

  /**
   * Called BEFORE a message update overwrites the old version.
   * Captures the original content.
   */
  onMessageUpdate(channelId: string, messageId: string, newData: any, guildId: string | null) {
    const store = useDiscordMessageLogStore.getState();
    if (!store.isChannelLogged(channelId, guildId)) return;

    // Only log if content actually changed
    if (!newData.content && newData.content !== '') return;

    const messages = useDiscordChannelsStore.getState().channelMessages[channelId];
    const message = messages?.find((m: DiscordMessage) => m.id === messageId);
    if (!message) return;

    // Skip if content didn't change (could be embed/reaction update)
    if (message.content === newData.content) return;

    const entry: LoggedMessage = {
      message: structuredClone(message),
      type: 'edited',
      loggedAt: new Date().toISOString(),
      guildId,
      newContent: newData.content,
    };

    store.addLogEntry(entry);
    this._persist(entry, channelId);
  },

  /**
   * Persist a log entry to IndexedDB if permanent storage is enabled.
   */
  async _persist(entry: LoggedMessage, channelId: string) {
    const { settings } = useDiscordMessageLogStore.getState();
    if (!settings.permanentStorage) return;

    try {
      const db = await openDB();
      const tx = db.transaction(MSG_STORE, 'readwrite');
      const store = tx.objectStore(MSG_STORE);
      store.add({ ...entry, channelId } as PersistedLogEntry);
    } catch (err) {
      console.warn('[MessageLog] Failed to persist entry:', err);
    }
  },

  /**
   * Download and store attachments if the setting is enabled.
   * Electron: saves to filesystem via IPC.
   * Non-Electron: skips (messages only).
   */
  async _handleAttachments(message: DiscordMessage, channelId: string) {
    const { settings } = useDiscordMessageLogStore.getState();
    if (!settings.storeImages) return;
    if (!message.attachments?.length) return;

    const isElectron = !!window.IgniteNative;

    for (const attachment of message.attachments) {
      const url = attachment.url || attachment.proxy_url;
      if (!url) continue;

      try {
        if (isElectron && window.IgniteNative?.saveMessageLogAttachment) {
          // Electron: download and save to disk
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const filename = attachment.filename || `${attachment.id}`;
          await window.IgniteNative.saveMessageLogAttachment(
            channelId,
            message.id,
            filename,
            new Uint8Array(buffer),
          );
        } else if (settings.permanentStorage) {
          // Non-Electron with permanent storage: save blob to IndexedDB
          const response = await fetch(url);
          const blob = await response.blob();
          const db = await openDB();
          const tx = db.transaction(ATTACH_STORE, 'readwrite');
          const store = tx.objectStore(ATTACH_STORE);
          store.put({
            key: `${channelId}/${message.id}/${attachment.filename || attachment.id}`,
            blob,
            filename: attachment.filename,
            contentType: attachment.content_type,
          });
        }
      } catch (err) {
        console.warn('[MessageLog] Failed to save attachment:', attachment.filename, err);
      }
    }
  },

  /**
   * Load persisted logs for a channel from IndexedDB.
   */
  async loadPersistedLogs(channelId: string): Promise<LoggedMessage[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(MSG_STORE, 'readonly');
        const store = tx.objectStore(MSG_STORE);
        const index = store.index('channelId');
        const req = index.getAll(channelId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  },

  /**
   * Load a saved attachment from IndexedDB.
   */
  async loadAttachment(
    channelId: string,
    messageId: string,
    filename: string,
  ): Promise<Blob | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readonly');
        const store = tx.objectStore(ATTACH_STORE);
        const req = store.get(`${channelId}/${messageId}/${filename}`);
        req.onsuccess = () => resolve(req.result?.blob || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  /**
   * Clear all persisted data from IndexedDB.
   */
  async clearPersistedData() {
    try {
      const db = await openDB();
      const tx = db.transaction([MSG_STORE, ATTACH_STORE], 'readwrite');
      tx.objectStore(MSG_STORE).clear();
      tx.objectStore(ATTACH_STORE).clear();
    } catch (err) {
      console.warn('[MessageLog] Failed to clear persisted data:', err);
    }
  },

  /**
   * Clear persisted data for a specific channel.
   */
  async clearPersistedChannel(channelId: string) {
    try {
      const db = await openDB();
      const tx = db.transaction(MSG_STORE, 'readwrite');
      const store = tx.objectStore(MSG_STORE);
      const index = store.index('channelId');
      const req = index.openCursor(channelId);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (err) {
      console.warn('[MessageLog] Failed to clear persisted channel:', err);
    }
  },
};
