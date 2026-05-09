const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, dialog } = require('electron');
try {
  require('dotenv').config();
} catch (_) {
  // Packaged builds intentionally exclude node_modules; dotenv is only needed when present.
}
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { pathToFileURL } = require('url');
const isDev = !app.isPackaged;

const STARTUP_STABILIZATION_MS = parseInt(process.env.INTELLIWATCH_STARTUP_DELAY_MS || '30000', 10);
const PRODUCTION_UI_START_DELAY_MS = 3000;
const LOW_PROCESS_PRIORITY = 19;
const ENGINE_WS_HOST = '127.0.0.1';
const ENGINE_WS_PORT = 8765;
const ENGINE_WS_URL = `ws://${ENGINE_WS_HOST}:${ENGINE_WS_PORT}`;
const ENGINE_READY_TIMEOUT_MS = 60000;
const TRAY_TOOLTIP_INTERVAL_MS = 5000;
const OVERLAY_WIDTH = 280;
const OVERLAY_MIN_HEIGHT = 292;
const OVERLAY_MAX_HEIGHT = 360;
const DEFAULT_SETTINGS = {
  startupDelay: 30,
  monitoringInterval: 5,
  thresholds: { cpu: 90, ram: 85, temperature: 80 },
  monitors: { cpu: true, ram: true, network: true, disk: true, gpu: true },
  theme: 'dark'
};
const APP_USER_MODEL_ID = 'com.intelliwatch.desktop';
let overlayWindow;
let dashboardWindow;
let settingsWindow;
let tray;
let engineProcess;
let startupStatusTimer;
let trayTooltipTimer;
let trayTelemetrySocket;
let latestTelemetry = null;
let isQuittingGracefully = false;

function getAssetPath(fileName) {
  return path.join(__dirname, '..', '..', 'assets', fileName);
}

function getWindowIconPath() {
  const icoPath = getAssetPath('icon.ico');
  return fs.existsSync(icoPath) ? icoPath : getAssetPath('icon.png');
}

function createFallbackTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="#0f172a"/><circle cx="16" cy="16" r="11" fill="none" stroke="#06b6d4" stroke-width="2"/><path d="M6 16c3-5 6-7 10-7s7 2 10 7c-3 5-6 7-10 7s-7-2-10-7Z" fill="none" stroke="#06b6d4" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="#06b6d4"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function createAppTrayIcon() {
  const iconPath = getAssetPath('icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  const visibleIcon = icon.isEmpty() ? createFallbackTrayIcon() : icon;
  return visibleIcon.resize({ width: 16, height: 16 });
}

function getUiUrl(route = '/') {
  if (isDev) return `http://127.0.0.1:5173${route}`;
  const uiIndexPath = path.join(__dirname, '../react-ui/dist/index.html');
  return `${pathToFileURL(uiIndexPath).toString()}#${route}`;
}

function createOverlayWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = OVERLAY_WIDTH;
  const height = OVERLAY_MIN_HEIGHT;

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
    icon: getWindowIconPath(),
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

function resizeOverlayHeight(height) {
  if (!overlayWindow) return;
  const nextHeight = Math.min(Math.max(Math.ceil(Number(height) || OVERLAY_MIN_HEIGHT), OVERLAY_MIN_HEIGHT), OVERLAY_MAX_HEIGHT);
  const { workArea } = screen.getPrimaryDisplay();
  overlayWindow.setBounds({
    width: OVERLAY_WIDTH,
    height: nextHeight,
    x: workArea.x + workArea.width - OVERLAY_WIDTH - 18,
    y: workArea.y + workArea.height - nextHeight - 18
  });
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
    icon: getWindowIconPath(),
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

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 760,
    height: 660,
    minWidth: 680,
    minHeight: 560,
    show: false,
    backgroundColor: '#060a12',
    title: 'IntelliWatch Settings',
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.loadURL(getUiUrl('/settings'));
  settingsWindow.once('ready-to-show', () => settingsWindow.show());
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  try {
    if (tray) return;

    const iconPath = getAssetPath('icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : createFallbackTrayIcon();
    const trayIcon = icon.isEmpty() ? createFallbackTrayIcon() : icon;

    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    updateTrayTooltip();
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'IntelliWatch', enabled: false },
      { type: 'separator' },
      { label: 'Show Dashboard', click: showDashboard },
      { label: 'Show Overlay', click: showOverlay },
      { label: 'Hide Overlay', click: hideOverlay },
      { type: 'separator' },
      { label: 'Settings', click: createSettingsWindow },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]));
    tray.on('click', toggleOverlay);
    tray.on('double-click', showDashboard);
    tray.on('right-click', () => tray.popUpContextMenu());
    startTrayTelemetry();
    trayTooltipTimer = setInterval(updateTrayTooltip, TRAY_TOOLTIP_INTERVAL_MS);
  } catch (error) {
    console.error('Failed to create tray:', error);
    tray = null;
  }
}

function updateTrayTooltip() {
  if (!tray) return;
  const metrics = latestTelemetry?.metrics;
  if (!metrics) {
    tray.setToolTip('IntelliWatch - starting telemetry...');
    return;
  }
  tray.setToolTip(`IntelliWatch — CPU: ${metrics.cpu_percent}% | RAM: ${metrics.ram_percent}% | TEMP: ${metrics.temperature_c ?? 0}C`);
  tray.setImage(createAppTrayIcon());
}

function startTrayTelemetry() {
  if (trayTelemetrySocket || typeof WebSocket === 'undefined') return;
  try {
    trayTelemetrySocket = new WebSocket(ENGINE_WS_URL);
    trayTelemetrySocket.onmessage = (event) => {
      latestTelemetry = JSON.parse(event.data);
      updateTrayTooltip();
    };
    trayTelemetrySocket.onclose = () => {
      trayTelemetrySocket = null;
      if (!app.isQuitting) setTimeout(startTrayTelemetry, TRAY_TOOLTIP_INTERVAL_MS);
    };
    trayTelemetrySocket.onerror = () => trayTelemetrySocket?.close();
  } catch (error) {
    console.error('Failed to connect tray telemetry:', error);
    setTimeout(startTrayTelemetry, TRAY_TOOLTIP_INTERVAL_MS);
  }
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
  updateTrayTooltip();
}

function showDashboard() {
  if (!dashboardWindow) createDashboardWindow();
  dashboardWindow.show();
  dashboardWindow.focus();
}

function showOverlay() {
  if (!overlayWindow) {
    createOverlayWindow();
    return;
  }
  overlayWindow.showInactive();
}

function hideOverlay() {
  overlayWindow?.hide();
}

function toggleOverlay() {
  if (!overlayWindow) {
    showOverlay();
    return;
  }
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

function getPackagedPythonPath() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function getPackagedEnginePath() {
  return path.join(process.resourcesPath, 'monitoring-engine', 'main.py');
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  const settingsPath = getSettingsPath();
  try {
    if (!fs.existsSync(settingsPath)) return DEFAULT_SETTINGS;
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(saved.thresholds || {}) },
      monitors: { ...DEFAULT_SETTINGS.monitors, ...(saved.monitors || {}) }
    };
  } catch (error) {
    console.error('Failed to read settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...settings,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(settings.thresholds || {}) },
    monitors: { ...DEFAULT_SETTINGS.monitors, ...(settings.monitors || {}) }
  };
  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}

function getStartupDelayMs() {
  const settingsDelay = Number(readSettings().startupDelay) * 1000;
  return Number.isFinite(settingsDelay) ? settingsDelay : STARTUP_STABILIZATION_MS;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setEngineLowPriority() {
  if (!engineProcess?.pid) return;
  try {
    process.setPriority(engineProcess.pid, LOW_PROCESS_PRIORITY);
  } catch (error) {
    console.error('Failed to set monitoring engine process priority:', error);
  }
}

function startMonitoringEngine() {
  if (isDev || engineProcess) return;
  const enginePath = getPackagedEnginePath();
  const pythonPath = getPackagedPythonPath();

  if (!fs.existsSync(enginePath)) {
    console.error(`Monitoring engine not found at ${enginePath}`);
    return;
  }

  engineProcess = spawn(pythonPath, [enginePath], {
    cwd: path.dirname(enginePath),
    env: { ...process.env, INTELLIWATCH_CONFIG_PATH: getSettingsPath(), INTELLIWATCH_DATA_DIR: app.getPath('userData') },
    windowsHide: true,
    stdio: 'ignore'
  });
  setEngineLowPriority();
  engineProcess.on('error', (error) => {
    console.error('Failed to start monitoring engine:', error);
    engineProcess = null;
  });
  engineProcess.on('exit', () => {
    engineProcess = null;
  });
}

function waitForEngineConnection(timeoutMs = ENGINE_READY_TIMEOUT_MS) {
  if (typeof WebSocket !== 'undefined') {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const attempt = () => {
        const socket = new WebSocket(ENGINE_WS_URL);
        let settled = false;
        const finish = (connected) => {
          if (settled) return;
          settled = true;
          socket.close();
          if (connected || Date.now() - startedAt >= timeoutMs) resolve(connected);
          else setTimeout(attempt, 1000);
        };
        const timer = setTimeout(() => finish(false), 1200);
        socket.onopen = () => {
          clearTimeout(timer);
          finish(true);
        };
        socket.onerror = () => {
          clearTimeout(timer);
          finish(false);
        };
      };
      attempt();
    });
  }

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const socket = net.createConnection({ host: ENGINE_WS_HOST, port: ENGINE_WS_PORT });
      socket.setTimeout(1200);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => socket.destroy());
      socket.on('error', () => {});
      socket.on('close', () => {
        if (Date.now() - startedAt >= timeoutMs) resolve(false);
        else setTimeout(attempt, 1000);
      });
    };
    attempt();
  });
}

async function showOverlayWhenEngineReady() {
  const connected = await waitForEngineConnection();
  if (connected) {
    createOverlayWindow();
    return;
  }
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Retry', 'Close'],
    defaultId: 0,
    cancelId: 1,
    message: 'Could not connect to monitoring engine. Please restart IntelliWatch.'
  });
  if (response === 0) await showOverlayWhenEngineReady();
}

async function sendEngineShutdownSignal() {
  if (typeof WebSocket === 'undefined') return false;
  return new Promise((resolve) => {
    try {
      const socket = new WebSocket(ENGINE_WS_URL);
      const timer = setTimeout(() => {
        socket.close();
        resolve(false);
      }, 1200);
      socket.onopen = () => {
        socket.send('shutdown');
        socket.close();
      };
      socket.onclose = () => {
        clearTimeout(timer);
        resolve(true);
      };
      socket.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch (_) {
      resolve(false);
    }
  });
}

function waitForProcessExit(processToStop, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    processToStop.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopMonitoringEngine() {
  if (!engineProcess) return;
  const pid = engineProcess.pid;
  const processToStop = engineProcess;
  engineProcess = null;

  await sendEngineShutdownSignal();
  if (await waitForProcessExit(processToStop, 3000)) return;

  // Force-kill only after the engine has had a chance to close SQLite cleanly.
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
ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:save', (_, settings) => writeSettings(settings));
ipcMain.handle('overlay:toggle-always-on-top', (_, enabled) => {
  if (overlayWindow) overlayWindow.setAlwaysOnTop(Boolean(enabled), 'screen-saver');
});
ipcMain.handle('overlay:resize-height', (_, height) => resizeOverlayHeight(height));
ipcMain.handle('app:minimize-dashboard', () => dashboardWindow?.hide());

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  enableAutoLaunch();
  createTray();
  startMonitoringEngine();
  if (!isDev) await delay(PRODUCTION_UI_START_DELAY_MS);
  createDashboardWindow();
  startStartupStatusMessages();
  setTimeout(async () => {
    stopStartupStatusMessages();
    await showOverlayWhenEngineReady();
  }, getStartupDelayMs());
});

app.on('window-all-closed', (event) => event.preventDefault());
app.on('activate', showDashboard);
app.on('before-quit', async (event) => {
  if (isQuittingGracefully) return;
  event.preventDefault();
  isQuittingGracefully = true;
  app.isQuitting = true;
  stopStartupStatusMessages();
  if (trayTooltipTimer) clearInterval(trayTooltipTimer);
  trayTelemetrySocket?.close();
  await stopMonitoringEngine();
  app.quit();
});
