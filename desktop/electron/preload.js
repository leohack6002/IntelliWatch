const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('intelliwatch', {
  openDashboard: () => ipcRenderer.invoke('dashboard:open'),
  minimizeDashboard: () => ipcRenderer.invoke('app:minimize-dashboard'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('overlay:toggle-always-on-top', enabled),
  platform: process.platform
});
