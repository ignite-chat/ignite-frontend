"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
if (!process.isMainFrame) {
    throw new Error('IgniteNative preload script should only be loaded in main frames');
}
if (window.opener === null) {
    const { contextBridge, ipcRenderer } = require('electron');
    const IgniteNative = {
        isRenderer: process.type === 'renderer',
        isElectron: true,
        platform: process.platform,
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        getDesktopSources: () => ipcRenderer.invoke('desktop:getSources'),
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
        setBadgeCount: (count) => ipcRenderer.invoke('badge:set', count),
        showNotification: (opts) => ipcRenderer.invoke('notification:show', opts),
        getDiscordLocalTokens: () => ipcRenderer.invoke('discord:getLocalTokens'),
        onWindowOpen: (callback) => {
            const handler = (_event, url) => callback(url);
            ipcRenderer.on('window-open', handler);
            return () => ipcRenderer.removeListener('window-open', handler);
        },
    };
    contextBridge.exposeInMainWorld('IgniteNative', IgniteNative);
}
