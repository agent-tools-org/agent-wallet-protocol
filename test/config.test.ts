import { describe, it, expect } from 'vitest';
import { statusSepolia, baseSepolia, RPC_URL } from '../src/config.js';

describe('Config', () => {
  it('should export Status Network Sepolia chain config', () => {
    expect(statusSepolia).toBeDefined();
    expect(statusSepolia.id).toBe(1660990954);
    expect(statusSepolia.name).toBe('Status Network Sepolia');
    expect(statusSepolia.rpcUrls.default.http[0]).toContain('status.network');
  });

  it('should export Base Sepolia chain config', () => {
    expect(baseSepolia).toBeDefined();
    expect(baseSepolia.id).toBe(84532);
    expect(baseSepolia.name).toBe('Base Sepolia');
    expect(baseSepolia.rpcUrls.default.http[0]).toContain('base.org');
  });

  it('should have a default RPC_URL', () => {
    expect(RPC_URL).toBeDefined();
    expect(typeof RPC_URL).toBe('string');
    expect(RPC_URL.startsWith('http')).toBe(true);
  });
});
