const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const isDev = !app.isPackaged;

const STARTUP_STABILIZATION_MS = parseInt(process.env.INTELLIWATCH_STARTUP_DELAY_MS || '30000', 10);
let overlayWindow;
let dashboardWindow;
let tray;
let engineProcess;
let startupStatusTimer;

function getUiUrl(route = '/') {
  if (isDev) return `http://127.0.0.1:5173${route}`;
  return `file://${path.join(__dirname, '../react-ui/dist/index.html')}#${route}`;
}

function createOverlayWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 280;
  const height = 228;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 18,
    y: workArea.y + workArea.height - height - 18,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadURL(getUiUrl('/overlay'));
  overlayWindow.once('ready-to-show', () => overlayWindow.showInactive());
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#060a12',
    title: 'IntelliWatch',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dashboardWindow.loadURL(getUiUrl('/dashboard'));
  dashboardWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../assets/tray.svg'));
  const fallbackIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=');
  tray = new Tray(icon.isEmpty() ? fallbackIcon : icon);
  tray.setToolTip('IntelliWatch');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: showDashboard },
    { label: 'Toggle Overlay', click: toggleOverlay },
    { type: 'separator' },
    {
      label: 'Quit IntelliWatch',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('click', showDashboard);
}

function startStartupStatusMessages() {
  if (!tray || startupStatusTimer) return;
  // Surface progress in the tray while the existing overlay delay completes.
  const messages = [
    'IntelliWatch is starting...',
    'Waiting for system to stabilize...',
    'Almost ready...'
  ];
  let messageIndex = 0;
  tray.setToolTip(messages[messageIndex]);
  startupStatusTimer = setInterval(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    tray.setToolTip(messages[messageIndex]);
  }, 10000);
}

function stopStartupStatusMessages() {
  if (startupStatusTimer) {
    clearInterval(startupStatusTimer);
    startupStatusTimer = null;
  }
  tray?.setToolTip('IntelliWatch');
}

function showDashboard() {
  if (!dashboardWindow) createDashboardWindow();
  dashboardWindow.show();
  dashboardWindow.focus();
}

function toggleOverlay() {
  if (!overlayWindow) return;
  if (overlayWindow.isVisible()) overlayWindow.hide();
  else overlayWindow.showInactive();
}

function enableAutoLaunch() {
  if (process.platform !== 'win32') return;
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    name: 'IntelliWatch'
  });
}

function startMonitoringEngine() {
  if (isDev || engineProcess) return;
  const enginePath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'monitoring-engine', 'main.py')
    : path.join(app.getAppPath(), 'monitoring-engine', 'main.py');
  engineProcess = spawn('python', [enginePath], {
    windowsHide: true,
    stdio: 'ignore'
  });
  engineProcess.on('exit', () => {
    engineProcess = null;
  });
}

function stopMonitoringEngine() {
  if (!engineProcess) return;
  const pid = engineProcess.pid;
  const processToStop = engineProcess;
  engineProcess = null;

  // Ensure the packaged Python monitoring engine does not remain after Electron exits.
  if (process.platform === 'win32' && pid) {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore'
    });
    return;
  }

  processToStop.kill();
}

ipcMain.handle('dashboard:open', () => showDashboard());
ipcMain.handle('overlay:toggle-always-on-top', (_, enabled) => {
  if (overlayWindow) overlayWindow.setAlwaysOnTop(Boolean(enabled), 'screen-saver');
});
ipcMain.handle('app:minimize-dashboard', () => dashboardWindow?.hide());

app.whenReady().then(() => {
  enableAutoLaunch();
  startMonitoringEngine();
  createTray();
  createDashboardWindow();
  startStartupStatusMessages();
  setTimeout(() => {
    stopStartupStatusMessages();
    createOverlayWindow();
  }, STARTUP_STABILIZATION_MS);
});

app.on('window-all-closed', (event) => event.preventDefault());
app.on('activate', showDashboard);
app.on('before-quit', () => {
  app.isQuitting = true;
  stopStartupStatusMessages();
  stopMonitoringEngine();
});
