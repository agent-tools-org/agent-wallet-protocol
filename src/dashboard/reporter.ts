import { formatEther, type Address } from 'viem';
import type { SpendRecord, Policy } from '../agent/wallet-agent.js';

export interface SpendingReport {
  totalSpent: bigint;
  transactionCount: number;
  topRecipients: Array<{ address: Address; total: bigint; count: number }>;
  budgetUtilization: number;
  summary: string;
}

export function generateReport(
  records: SpendRecord[],
  policy: Policy,
  spentToday: bigint
): SpendingReport {
  const totalSpent = records.reduce((sum, r) => sum + r.amount, 0n);
  const transactionCount = records.length;

  // Aggregate by recipient
  const recipientMap = new Map<string, { total: bigint; count: number }>();
  for (const record of records) {
    const key = record.to.toLowerCase();
    const existing = recipientMap.get(key) || { total: 0n, count: 0 };
    existing.total += record.amount;
    existing.count += 1;
    recipientMap.set(key, existing);
  }

  const topRecipients = Array.from(recipientMap.entries())
    .map(([address, data]) => ({
      address: address as Address,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
    .slice(0, 5);

  // Budget utilization as percentage
  const budgetUtilization =
    policy.dailyLimit > 0n
      ? Number((spentToday * 10000n) / policy.dailyLimit) / 100
      : 0;

  const summary = buildSummary(
    spentToday,
    policy.dailyLimit,
    budgetUtilization,
    topRecipients,
    transactionCount
  );

  return {
    totalSpent,
    transactionCount,
    topRecipients,
    budgetUtilization,
    summary,
  };
}

function buildSummary(
  spentToday: bigint,
  dailyLimit: bigint,
  utilization: number,
  topRecipients: Array<{ address: Address; total: bigint; count: number }>,
  txCount: number
): string {
  const lines: string[] = [];

  lines.push(
    `Agent spent ${formatEther(spentToday)} ETH today (${utilization}% of ${formatEther(dailyLimit)} ETH limit).`
  );

  if (topRecipients.length > 0) {
    const top = topRecipients[0];
    lines.push(
      `Top recipient: ${top.address} (${formatEther(top.total)} ETH across ${top.count} transaction${top.count > 1 ? 's' : ''}).`
    );
  }

  lines.push(`Total transactions: ${txCount}.`);

  const remaining = dailyLimit - spentToday;
  if (remaining > 0n) {
    lines.push(`Remaining budget: ${formatEther(remaining)} ETH.`);
  } else {
    lines.push('Daily budget fully utilized.');
  }

  return lines.join(' ');
}

export function formatReportJSON(report: SpendingReport): object {
  return {
    totalSpent: formatEther(report.totalSpent),
    transactionCount: report.transactionCount,
    budgetUtilization: `${report.budgetUtilization}%`,
    topRecipients: report.topRecipients.map((r) => ({
      address: r.address,
      total: formatEther(r.total),
      count: r.count,
    })),
    summary: report.summary,
  };
}
