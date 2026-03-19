import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEther, formatEther } from 'viem';
import { WalletAgent, type Policy, type SpendRecord } from '../src/agent/wallet-agent.js';

function createMockClients(overrides: {
  policy?: Policy;
  spentToday?: bigint;
  history?: SpendRecord[];
  balance?: bigint;
} = {}) {
  const policy: Policy = overrides.policy ?? {
    dailyLimit: parseEther('1'),
    whitelistedRecipients: ['0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`],
    paused: false,
    whitelistEnabled: true,
  };

  const spentToday = overrides.spentToday ?? parseEther('0.3');
  const history = overrides.history ?? [];
  const balance = overrides.balance ?? parseEther('10');

  const readContract = vi.fn().mockImplementation(async (args: { functionName: string }) => {
    switch (args.functionName) {
      case 'getPolicy':
        return [policy.dailyLimit, policy.whitelistedRecipients, policy.paused, policy.whitelistEnabled];
      case 'getSpentToday':
        return spentToday;
      case 'getHistory':
        return history;
      default:
        throw new Error(`Unknown function: ${args.functionName}`);
    }
  });

  const writeContract = vi.fn().mockResolvedValue('0xmockhash');

  const publicClient = {
    readContract,
    getBalance: vi.fn().mockResolvedValue(balance),
  } as any;
  const walletClient = { writeContract } as any;

  return { publicClient, walletClient, readContract, writeContract };
}

const CONTRACT_ADDR = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
const MOCK_ABI = [] as any;

describe('WalletAgent', () => {
  it('should check policy', async () => {
    const { publicClient, walletClient } = createMockClients();
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const policy = await agent.checkPolicy();
    expect(policy.dailyLimit).toBe(parseEther('1'));
    expect(policy.paused).toBe(false);
    expect(policy.whitelistedRecipients).toHaveLength(1);
  });

  it('should calculate daily budget remaining', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('0.3'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const remaining = await agent.getDailyBudgetRemaining();
    expect(remaining).toBe(parseEther('0.7'));
  });

  it('should return 0 when budget exhausted', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('1.5'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const remaining = await agent.getDailyBudgetRemaining();
    expect(remaining).toBe(0n);
  });

  it('should validate spend within limits', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('0.3'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.5'),
      reason: 'Test payment',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject spend exceeding daily limit', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('0.8'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.5'),
      reason: 'Over limit',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Exceeds daily limit');
  });

  it('should reject spend to non-whitelisted address', async () => {
    const { publicClient, walletClient } = createMockClients();
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
      amount: parseEther('0.1'),
      reason: 'Bad recipient',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not whitelisted');
  });

  it('should reject spend when wallet is paused', async () => {
    const { publicClient, walletClient } = createMockClients({
      policy: {
        dailyLimit: parseEther('1'),
        whitelistedRecipients: ['0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`],
        paused: true,
        whitelistEnabled: true,
      },
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.1'),
      reason: 'Paused',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('paused');
  });

  it('should reject zero amount', async () => {
    const { publicClient, walletClient } = createMockClients();
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: 0n,
      reason: 'Zero',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Amount must be > 0');
  });

  it('should format spending history', () => {
    const { publicClient, walletClient } = createMockClients();
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const records: SpendRecord[] = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        amount: parseEther('0.1'),
        reason: 'Payment',
        timestamp: 1700000000n,
      },
    ];

    const formatted = agent.formatHistory(records);
    expect(formatted).toContain('0.1 ETH');
    expect(formatted).toContain('Payment');
  });

  it('should return empty message for no history', () => {
    const { publicClient, walletClient } = createMockClients();
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const formatted = agent.formatHistory([]);
    expect(formatted).toBe('No spending history.');
  });

  it('should allow spend at exact daily limit boundary', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('0.5'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.5'),
      reason: 'Exact boundary',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject spend 1 wei over daily limit', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: parseEther('0.5'),
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.5') + 1n,
      reason: 'One wei over',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Exceeds daily limit');
  });

  it('should return full budget after midnight reset (spentToday = 0)', async () => {
    const { publicClient, walletClient } = createMockClients({
      spentToday: 0n,
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const remaining = await agent.getDailyBudgetRemaining();
    expect(remaining).toBe(parseEther('1'));
  });

  it('should allow any address when whitelist is empty', async () => {
    const { publicClient, walletClient } = createMockClients({
      policy: {
        dailyLimit: parseEther('1'),
        whitelistedRecipients: [],
        paused: false,
        whitelistEnabled: false,
      },
      spentToday: 0n,
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.validateSpend({
      to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
      amount: parseEther('0.1'),
      reason: 'No whitelist restriction',
    });
    expect(result.valid).toBe(true);
  });

  it('should block proposeSpend when wallet is paused', async () => {
    const { publicClient, walletClient } = createMockClients({
      policy: {
        dailyLimit: parseEther('1'),
        whitelistedRecipients: ['0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`],
        paused: true,
        whitelistEnabled: true,
      },
    });
    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);

    const result = await agent.proposeSpend(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      parseEther('0.1'),
      'Paused wallet'
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('paused');
  });

  it('should allow spend to non-whitelisted address when whitelist is disabled', async () => {
    const { publicClient, walletClient } = createMockClients({
      policy: {
        dailyLimit: parseEther('1'),
        whitelistedRecipients: ['0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`],
        paused: false,
        whitelistEnabled: false,
      },
      spentToday: 0n,
    });

    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);
    const result = await agent.validateSpend({
      to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
      amount: parseEther('0.1'),
      reason: 'Whitelist disabled',
    });

    expect(result.valid).toBe(true);
  });

  it('should reject spend when wallet has insufficient balance', async () => {
    const { publicClient, walletClient } = createMockClients({
      policy: {
        dailyLimit: parseEther('1'),
        whitelistedRecipients: ['0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`],
        paused: false,
        whitelistEnabled: true,
      },
      spentToday: 0n,
      balance: parseEther('0.05'),
    });

    const agent = new WalletAgent(publicClient, walletClient, CONTRACT_ADDR, MOCK_ABI);
    const result = await agent.validateSpend({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      amount: parseEther('0.1'),
      reason: 'Insufficient ETH',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient balance');
  });
});
