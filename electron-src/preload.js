"use strict";

if (!process.isMainFrame) {
    throw new Error('IgniteNative preload script should only be loaded in main frames');
}
if (window.opener === null) {
    const { contextBridge, ipcRenderer } = require('electron');
    const IgniteNative = {
        isRenderer: process.type === 'renderer',
        isElectron: true,
        platform: process.platform,
        arch: process.arch,
        osVersion: process.getSystemVersion(),
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        getDesktopSources: () => ipcRenderer.invoke('desktop:getSources'),
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
        setBadgeCount: (count) => ipcRenderer.invoke('badge:set', count),
        showNotification: (opts) => ipcRenderer.invoke('notification:show', opts),
        getMemoryUsage: () => ipcRenderer.invoke('app:getMemoryUsage'),
        getDiscordLocalTokens: () => ipcRenderer.invoke('discord:getLocalTokens'),
        // Message log file storage
        saveMessageLogAttachment: (channelId, messageId, filename, data) =>
            ipcRenderer.invoke('msglog:saveAttachment', channelId, messageId, filename, data),
        loadMessageLogAttachment: (channelId, messageId, filename) =>
            ipcRenderer.invoke('msglog:loadAttachment', channelId, messageId, filename),
        saveMessageLogMessages: (channelId, jsonData) =>
            ipcRenderer.invoke('msglog:saveMessages', channelId, jsonData),
        loadMessageLogMessages: (channelId) =>
            ipcRenderer.invoke('msglog:loadMessages', channelId),
        getMessageLogBasePath: () => ipcRenderer.invoke('msglog:getBasePath'),
        onWindowOpen: (callback) => {
            const handler = (_event, url) => callback(url);
            ipcRenderer.on('window-open', handler);
            return () => ipcRenderer.removeListener('window-open', handler);
        },
    };
    contextBridge.exposeInMainWorld('IgniteNative', IgniteNative);
}
