const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('intelliwatch', {
  openDashboard: () => ipcRenderer.invoke('dashboard:open'),
  minimizeDashboard: () => ipcRenderer.invoke('app:minimize-dashboard'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('overlay:toggle-always-on-top', enabled),
  resizeOverlayHeight: (height) => ipcRenderer.invoke('overlay:resize-height', height),
  platform: process.platform
});
