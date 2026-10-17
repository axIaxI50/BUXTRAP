import { app, BrowserWindow, ipcMain, shell, dialog, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { scanRoblox, validateRobloxPath, startRoblox, getRobloxProcesses } from './services/roblox';
import { createLogger } from './services/logging';

const logger = createLogger();
let win: BrowserWindow | null = null;
const configPath = () => path.join(app.getPath('userData'), 'config.json');
const defaults = {
  schemaVersion: 1, selectedInstall: '', autoScan: true, scanIntervalMinutes: 10,
  focusMode: false, discordEnabled: false, discordApplicationId: '', presenceDetails: 'Playing Roblox',
  presenceState: 'Launched with BUXTRAP', animations: true, reducedMotion: false, glow: 35,
  uiScale: 100, compactMode: false, sidebarWidth: 232, gameUrl: '',
  fastFlags: {} as Record<string, string | number | boolean>
};
const ConfigSchema = z.object({
  schemaVersion: z.number().int().min(1).max(1).default(1),
  selectedInstall: z.string().max(4096).default(''),
  autoScan: z.boolean().default(true),
  scanIntervalMinutes: z.number().int().min(1).max(1440).default(10),
  focusMode: z.boolean().default(false),
  discordEnabled: z.boolean().default(false),
  discordApplicationId: z.string().max(32).default(''),
  presenceDetails: z.string().max(128).default('Playing Roblox'),
  presenceState: z.string().max(128).default('Launched with BUXTRAP'),
  animations: z.boolean().default(true), reducedMotion: z.boolean().default(false),
  glow: z.number().min(0).max(100).default(35), uiScale: z.number().min(80).max(125).default(100),
  compactMode: z.boolean().default(false), sidebarWidth: z.number().min(190).max(300).default(232),
  gameUrl: z.string().max(2048).default(''),
  fastFlags: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
});
type Config = z.infer<typeof ConfigSchema>;
let config: Config = { ...defaults };
const safeUrl = (raw: string) => {
  try { const u = new URL(raw); return ['https:', 'http:', 'roblox:'].includes(u.protocol); } catch { return false; }
};
async function loadConfig() {
  try { config = ConfigSchema.parse(JSON.parse(await fs.readFile(configPath(), 'utf8'))); }
  catch { config = { ...defaults }; await saveConfig(); }
}
async function saveConfig() {
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  const tmp = configPath() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(tmp, configPath());
}
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 640, frame: false,
    backgroundColor: '#000000', show: false,
    webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win?.show());
  if (!app.isPackaged) void win.loadURL('http://localhost:5173');
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.on('closed', () => { win = null; });
}
app.whenReady().then(async () => {
  await loadConfig();
  ipcMain.handle('window:control', (_e, action: unknown) => {
    if (!win || !['minimize','maximize','close'].includes(String(action))) return;
    if (action === 'minimize') win.minimize();
    if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
    if (action === 'close') win.close();
    return { maximized: win.isMaximized() };
  });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, userData: app.getPath('userData'), theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' }));
  ipcMain.handle('config:get', () => config);
  ipcMain.handle('config:update', async (_e, patch: unknown) => {
    const parsed = ConfigSchema.partial().safeParse(patch);
    if (!parsed.success) throw new Error('Invalid configuration values.');
    config = ConfigSchema.parse({ ...config, ...parsed.data });
    await saveConfig(); return config;
  });
  ipcMain.handle('roblox:scan', async () => { const result = await scanRoblox(); logger.info(`Roblox scan: ${result.length} candidate(s)`); return result; });
  ipcMain.handle('roblox:validate', async (_e, p: unknown) => {
    if (typeof p !== 'string' || p.length > 4096) throw new Error('Invalid path.');
    return validateRobloxPath(p);
  });
  ipcMain.handle('roblox:select', async () => {
    const result = await dialog.showOpenDialog(win!, { title:'Select Roblox installation or Player executable', properties:['openFile','openDirectory'], filters:[{name:'Roblox Player', extensions:['exe']}] });
    if (result.canceled || !result.filePaths[0]) return null;
    const validation = await validateRobloxPath(result.filePaths[0]);
    if (!validation.valid) throw new Error(validation.reason);
    config.selectedInstall = validation.path; await saveConfig(); return config;
  });
  ipcMain.handle('roblox:start', async (_e, url: unknown) => {
    if (typeof url !== 'string' || url.length > 2048 || (url && !safeUrl(url))) throw new Error('Enter a valid http(s) or Roblox URL.');
    const install = config.selectedInstall;
    const result = await startRoblox(install, url);
    logger.info(`Roblox start requested: ${result.status}`); return result;
  });
  ipcMain.handle('roblox:processes', () => getRobloxProcesses());
  ipcMain.handle('system:openExternal', async (_e, raw: unknown) => {
    if (typeof raw !== 'string' || !safeUrl(raw)) throw new Error('Only valid web or Roblox URLs are allowed.');
    await shell.openExternal(raw); return true;
  });
  ipcMain.handle('system:openPath', async (_e, kind: unknown) => {
    const allowed = ['data','logs','config'];
    if (typeof kind !== 'string' || !allowed.includes(kind)) throw new Error('Unsupported location.');
    const target = kind === 'data' ? app.getPath('userData') : kind === 'config' ? configPath() : path.join(app.getPath('userData'),'logs');
    if (kind === 'logs') await fs.mkdir(target, { recursive: true });
    const err = await shell.openPath(target); if (err) throw new Error(err); return true;
  });
  ipcMain.handle('system:export', async () => {
    const d = await dialog.showSaveDialog(win!, { defaultPath:'buxtrap-config.json', filters:[{name:'JSON',extensions:['json']}] });
    if (d.canceled || !d.filePath) return false;
    await fs.writeFile(d.filePath, JSON.stringify(config,null,2), 'utf8'); return true;
  });
  ipcMain.handle('system:import', async () => {
    const d = await dialog.showOpenDialog(win!, { properties:['openFile'], filters:[{name:'JSON',extensions:['json']}] });
    if (d.canceled || !d.filePaths[0]) return false;
    const imported = ConfigSchema.safeParse(JSON.parse(await fs.readFile(d.filePaths[0],'utf8')));
    if (!imported.success) throw new Error('Configuration file is invalid or incompatible.');
    config = imported.data; await saveConfig(); return config;
  });
  ipcMain.handle('system:reset', async () => { config = { ...defaults }; await saveConfig(); return config; });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
