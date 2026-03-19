import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { compile, type CompileResult } from '../src/compile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('Compile', () => {
  let result: CompileResult;

  beforeAll(async () => {
    result = await compile();
  }, 60000);

  it('should produce a valid ABI', () => {
    expect(result.abi).toBeDefined();
    expect(Array.isArray(result.abi)).toBe(true);
    expect(result.abi.length).toBeGreaterThan(0);
  });

  it('should include key ABI functions', () => {
    const names = result.abi
      .filter((e: any) => e.type === 'function')
      .map((e: any) => e.name);
    expect(names).toContain('spend');
    expect(names).toContain('deposit');
    expect(names).toContain('setDailyLimit');
    expect(names).toContain('getPolicy');
    expect(names).toContain('getSpentToday');
    expect(names).toContain('getHistory');
  });

  it('should produce valid bytecode', () => {
    expect(result.bytecode).toBeDefined();
    expect(typeof result.bytecode).toBe('string');
    expect(result.bytecode.startsWith('0x')).toBe(true);
    expect(result.bytecode.length).toBeGreaterThan(100);
  });

  it('should save artifact to disk', () => {
    const artifactPath = path.join(ROOT, 'artifacts', 'AgentWallet.json');
    expect(fs.existsSync(artifactPath)).toBe(true);

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    expect(artifact.abi).toBeDefined();
    expect(artifact.bytecode).toBeDefined();
  });

  it('should include all expected contract functions', () => {
    const functionNames = result.abi
      .filter((e: any) => e.type === 'function')
      .map((e: any) => e.name);
    const expectedFunctions = [
      'spend', 'deposit', 'setDailyLimit', 'setRecipientWhitelist',
      'pause', 'unpause', 'getPolicy', 'getSpentToday', 'getHistory',
      'owner', 'agent', 'dailyLimit', 'paused', 'whitelistedRecipients', 'history',
    ];
    for (const fn of expectedFunctions) {
      expect(functionNames).toContain(fn);
    }
  });

  it('should include expected event signatures', () => {
    const events = result.abi
      .filter((e: any) => e.type === 'event')
      .map((e: any) => e.name);
    expect(events).toContain('Deposited');
    expect(events).toContain('Spent');
    expect(events).toContain('PolicyUpdated');
    expect(events).toContain('Paused');
    expect(events).toContain('Unpaused');
  });
});
