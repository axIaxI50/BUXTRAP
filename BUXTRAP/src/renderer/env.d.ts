/// <reference types="vite/client" />
interface Window {
  buxtrap: {
    windowControl(action:'minimize'|'maximize'|'close'): Promise<any>;
    appInfo(): Promise<any>; getConfig(): Promise<any>; updateConfig(patch:Record<string,unknown>): Promise<any>;
    scanRoblox(): Promise<any[]>; validateRoblox(p:string): Promise<any>; selectRoblox(): Promise<any>;
    startRoblox(url?:string): Promise<any>; robloxProcesses(): Promise<any>;
    openExternal(url:string): Promise<any>; openPath(kind:'data'|'logs'|'config'): Promise<any>;
    exportConfig(): Promise<any>; importConfig(): Promise<any>; resetConfig(): Promise<any>;
  }
}