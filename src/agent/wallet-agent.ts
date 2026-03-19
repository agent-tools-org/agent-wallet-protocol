import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Abi,
  formatEther,
  parseEther,
} from 'viem';

export interface Policy {
  dailyLimit: bigint;
  whitelistedRecipients: Address[];
  paused: boolean;
}

export interface SpendRecord {
  to: Address;
  amount: bigint;
  reason: string;
  timestamp: bigint;
}

export interface SpendProposal {
  to: Address;
  amount: bigint;
  reason: string;
}

export interface SpendValidation {
  valid: boolean;
  error?: string;
}

export class WalletAgent {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private contractAddress: Address;
  private abi: Abi;

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient,
    contractAddress: Address,
    abi: Abi
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contractAddress = contractAddress;
    this.abi = abi;
  }

  async checkPolicy(): Promise<Policy> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: this.abi,
      functionName: 'getPolicy',
    }) as [bigint, Address[], boolean];

    return {
      dailyLimit: result[0],
      whitelistedRecipients: result[1],
      paused: result[2],
    };
  }

  async getSpentToday(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: this.abi,
      functionName: 'getSpentToday',
    }) as bigint;
    return result;
  }

  async getDailyBudgetRemaining(): Promise<bigint> {
    const policy = await this.checkPolicy();
    const spent = await this.getSpentToday();
    const remaining = policy.dailyLimit - spent;
    return remaining > 0n ? remaining : 0n;
  }

  async validateSpend(proposal: SpendProposal): Promise<SpendValidation> {
    const policy = await this.checkPolicy();

    if (policy.paused) {
      return { valid: false, error: 'Wallet is paused' };
    }

    if (proposal.amount <= 0n) {
      return { valid: false, error: 'Amount must be > 0' };
    }

    if (policy.whitelistedRecipients.length > 0) {
      const isWhitelisted = policy.whitelistedRecipients.some(
        (addr) => addr.toLowerCase() === proposal.to.toLowerCase()
      );
      if (!isWhitelisted) {
        return { valid: false, error: 'Recipient not whitelisted' };
      }
    }

    const spent = await this.getSpentToday();
    if (spent + proposal.amount > policy.dailyLimit) {
      return {
        valid: false,
        error: `Exceeds daily limit. Remaining: ${formatEther(policy.dailyLimit - spent)} ETH`,
      };
    }

    return { valid: true };
  }

  async proposeSpend(
    to: Address,
    amount: bigint,
    reason: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const validation = await this.validateSpend({ to, amount, reason });
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'spend',
        args: [to, amount, reason],
      });

      return { success: true, txHash: hash };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async getSpendingHistory(
    offset = 0,
    limit = 50
  ): Promise<SpendRecord[]> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: this.abi,
      functionName: 'getHistory',
      args: [BigInt(offset), BigInt(limit)],
    }) as Array<{ to: Address; amount: bigint; reason: string; timestamp: bigint }>;

    return result.map((r) => ({
      to: r.to,
      amount: r.amount,
      reason: r.reason,
      timestamp: r.timestamp,
    }));
  }

  formatHistory(records: SpendRecord[]): string {
    if (records.length === 0) return 'No spending history.';

    return records
      .map((r, i) => {
        const date = new Date(Number(r.timestamp) * 1000).toISOString();
        return `${i + 1}. ${formatEther(r.amount)} ETH → ${r.to} (${r.reason}) at ${date}`;
      })
      .join('\n');
  }
}
