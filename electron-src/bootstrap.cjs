const { app, autoUpdater, BrowserWindow, ipcMain, Tray, desktopCapturer, Menu, shell, nativeImage, Notification } = require('electron');
const { join } = require('path');
const fs = require('fs');

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
