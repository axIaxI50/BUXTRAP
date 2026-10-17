import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
export function createLogger() {
  const dir = path.join(app.getPath('userData'),'logs');
  const file = path.join(dir,'buxtrap.log');
  async function write(level:string,message:string) {
    try {
      await fs.mkdir(dir,{recursive:true});
      const line = `${new Date().toISOString()} [${level}] ${message.replace(/[\r\n]/g,' ')}\n`;
      const stat = await fs.stat(file).catch(()=>null);
      if (stat && stat.size > 1024*1024) await fs.rename(file,file+'.1').catch(()=>undefined);
      await fs.appendFile(file,line,'utf8');
    } catch { /* logging must never crash the app */ }
  }
  return {info:(m:string)=>void write('INFO',m),warn:(m:string)=>void write('WARN',m),error:(m:string)=>void write('ERROR',m)};
}
