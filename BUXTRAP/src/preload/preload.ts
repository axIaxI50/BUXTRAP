import { contextBridge, ipcRenderer } from 'electron';
const api = {
  windowControl: (action:'minimize'|'maximize'|'close') => ipcRenderer.invoke('window:control',action),
  appInfo: () => ipcRenderer.invoke('app:info'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (patch:Record<string,unknown>) => ipcRenderer.invoke('config:update',patch),
  scanRoblox: () => ipcRenderer.invoke('roblox:scan'),
  validateRoblox: (p:string) => ipcRenderer.invoke('roblox:validate',p),
  selectRoblox: () => ipcRenderer.invoke('roblox:select'),
  startRoblox: (url='') => ipcRenderer.invoke('roblox:start',url),
  robloxProcesses: () => ipcRenderer.invoke('roblox:processes'),
  openExternal: (url:string) => ipcRenderer.invoke('system:openExternal',url),
  openPath: (kind:'data'|'logs'|'config') => ipcRenderer.invoke('system:openPath',kind),
  exportConfig: () => ipcRenderer.invoke('system:export'),
  importConfig: () => ipcRenderer.invoke('system:import'),
  resetConfig: () => ipcRenderer.invoke('system:reset')
};
contextBridge.exposeInMainWorld('buxtrap',api);
