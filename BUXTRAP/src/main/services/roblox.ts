import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
export interface InstallCandidate { path: string; version: string; valid: boolean; source: string }
export async function validateRobloxPath(input: string): Promise<{valid:boolean;path:string;reason?:string}> {
  try {
    const resolved = path.resolve(input);
    const stat = await fs.stat(resolved);
    let player = resolved;
    if (stat.isDirectory()) player = path.join(resolved, 'RobloxPlayerBeta.exe');
    const pstat = await fs.stat(player);
    if (!pstat.isFile() || path.basename(player).toLowerCase() !== 'robloxplayerbeta.exe') return {valid:false,path:resolved,reason:'Select a RobloxPlayerBeta.exe file or its containing directory.'};
    return {valid:true,path:player};
  } catch { return {valid:false,path:path.resolve(input),reason:'No readable Roblox Player executable was found at this location.'}; }
}
export async function scanRoblox(): Promise<InstallCandidate[]> {
  const roots = new Set<string>();
  const local = process.env.LOCALAPPDATA;
  if (local) roots.add(path.join(local,'Roblox','Versions'));
  roots.add(path.join(os.homedir(),'AppData','Local','Roblox','Versions'));
  const found: InstallCandidate[] = [];
  for (const root of roots) {
    let dirs: string[] = [];
    try { dirs = await fs.readdir(root); } catch { continue; }
    for (const dir of dirs) {
      const candidate = path.join(root,dir,'RobloxPlayerBeta.exe');
      try {
        const st = await fs.stat(candidate);
        if (st.isFile()) found.push({path:candidate,version:dir,valid:true,source:root});
      } catch { /* inaccessible or incomplete version folder */ }
    }
  }
  return found.sort((a,b) => b.version.localeCompare(a.version));
}
export async function getRobloxProcesses(): Promise<{running:boolean;processes:string[]}> {
  if (process.platform !== 'win32') return {running:false,processes:[]};
  try {
    const { stdout } = await execFileAsync('tasklist.exe',['/FO','CSV','/NH'],{windowsHide:true,timeout:3000});
    const processes = stdout.split(/\r?\n/).filter(x => /RobloxPlayerBeta\.exe/i.test(x));
    return {running:processes.length>0,processes};
  } catch { return {running:false,processes:[]}; }
}
export async function startRoblox(install: string, url: string): Promise<{status:string;message:string}> {
  const processes = await getRobloxProcesses();
  if (processes.running) return {status:'already-running',message:'Roblox appears to be running already.'};
  if (url) {
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe',['/d','/s','/c','start','',url],{detached:true,stdio:'ignore',windowsHide:true});
      child.unref(); return {status:'uri-opened',message:'Opened the supplied URL using the Windows URL handler.'};
    }
    return {status:'unsupported',message:'Roblox URL launching is supported here only on Windows.'};
  }
  const validation = await validateRobloxPath(install);
  if (!validation.valid) return {status:'not-found',message:validation.reason || 'Roblox Player was not found. Scan or select an installation first.'};
  const child = spawn(validation.path,[],{detached:true,stdio:'ignore',windowsHide:false});
  child.unref();
  return {status:'started',message:'Roblox Player launch was requested.'};
}
