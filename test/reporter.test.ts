import { describe, it, expect } from 'vitest';
import { parseEther, formatEther } from 'viem';
import { generateReport, formatReportJSON } from '../src/dashboard/reporter.js';
import type { SpendRecord, Policy } from '../src/agent/wallet-agent.js';

const ADDR_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const ADDR_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

const mockPolicy: Policy = {
  dailyLimit: parseEther('1'),
  whitelistedRecipients: [ADDR_A, ADDR_B],
  paused: false,
};

const mockRecords: SpendRecord[] = [
  { to: ADDR_A, amount: parseEther('0.2'), reason: 'API call', timestamp: 1700000000n },
  { to: ADDR_A, amount: parseEther('0.1'), reason: 'Data fetch', timestamp: 1700001000n },
  { to: ADDR_B, amount: parseEther('0.05'), reason: 'Storage', timestamp: 1700002000n },
];

describe('Reporter', () => {
  it('should calculate total spent', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    expect(report.totalSpent).toBe(parseEther('0.35'));
  });

  it('should count transactions', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    expect(report.transactionCount).toBe(3);
  });

  it('should identify top recipients', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    expect(report.topRecipients.length).toBeGreaterThan(0);
    expect(report.topRecipients[0].address).toBe(ADDR_A.toLowerCase());
    expect(report.topRecipients[0].total).toBe(parseEther('0.3'));
    expect(report.topRecipients[0].count).toBe(2);
  });

  it('should calculate budget utilization', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    expect(report.budgetUtilization).toBe(35);
  });

  it('should generate plain-language summary', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    expect(report.summary).toContain('0.35 ETH today');
    expect(report.summary).toContain('35%');
    expect(report.summary).toContain('1 ETH limit');
    expect(report.summary).toContain('Top recipient');
  });

  it('should handle empty records', () => {
    const report = generateReport([], mockPolicy, 0n);
    expect(report.totalSpent).toBe(0n);
    expect(report.transactionCount).toBe(0);
    expect(report.topRecipients).toHaveLength(0);
    expect(report.budgetUtilization).toBe(0);
  });

  it('should format report as JSON', () => {
    const report = generateReport(mockRecords, mockPolicy, parseEther('0.35'));
    const json = formatReportJSON(report) as any;
    expect(json.totalSpent).toBe('0.35');
    expect(json.transactionCount).toBe(3);
    expect(json.budgetUtilization).toBe('35%');
    expect(json.topRecipients).toHaveLength(2);
  });
});
