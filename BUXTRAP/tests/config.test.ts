import { describe,it,expect } from 'vitest';
import { z } from 'zod';
const Schema=z.object({schemaVersion:z.number().int().min(1).max(1),autoScan:z.boolean(),scanIntervalMinutes:z.number().int().min(1).max(1440),fastFlags:z.record(z.union([z.string(),z.number(),z.boolean()]))});
describe('configuration validation',()=>{
 it('accepts a valid configuration',()=>expect(Schema.safeParse({schemaVersion:1,autoScan:true,scanIntervalMinutes:10,fastFlags:{FlagA:true}}).success).toBe(true));
 it('rejects invalid scan intervals',()=>expect(Schema.safeParse({schemaVersion:1,autoScan:true,scanIntervalMinutes:0,fastFlags:{}}).success).toBe(false));
 it('rejects nested values in typed flags',()=>expect(Schema.safeParse({schemaVersion:1,autoScan:true,scanIntervalMinutes:10,fastFlags:{Bad:{nested:true}}}).success).toBe(false));
});
