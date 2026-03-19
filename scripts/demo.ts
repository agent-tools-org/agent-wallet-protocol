import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseEther, formatEther } from 'viem';
import { WalletAgent, type Policy, type SpendRecord } from '../src/agent/wallet-agent.js';
import { generateReport, formatReportJSON } from '../src/dashboard/reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Simulated on-chain state
let simulatedPolicy: Policy = {
  dailyLimit: parseEther('1'),
  whitelistedRecipients: [
    '0x1111111111111111111111111111111111111111' as `0x${string}`,
    '0x2222222222222222222222222222222222222222' as `0x${string}`,
  ],
  paused: false,
};
let simulatedSpentToday = 0n;
const simulatedHistory: SpendRecord[] = [];

function createMockAgent(): WalletAgent {
  const readContract = async (args: { functionName: string }) => {
    switch (args.functionName) {
      case 'getPolicy':
        return [
          simulatedPolicy.dailyLimit,
          simulatedPolicy.whitelistedRecipients,
          simulatedPolicy.paused,
        ];
      case 'getSpentToday':
        return simulatedSpentToday;
      case 'getHistory':
        return simulatedHistory;
      default:
        throw new Error(`Unknown: ${args.functionName}`);
    }
  };

  const writeContract = async (args: { functionName: string; args: unknown[] }) => {
    if (args.functionName === 'spend') {
      const [to, amount, reason] = args.args as [`0x${string}`, bigint, string];
      simulatedSpentToday += amount;
      simulatedHistory.push({
        to,
        amount,
        reason,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      });
      return '0xdemotxhash';
    }
    return '0x0';
  };

  return new WalletAgent(
    { readContract } as any,
    { writeContract } as any,
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    [] as any
  );
}

async function demo() {
  console.log('═══════════════════════════════════════════');
  console.log('  🏦 Agent Wallet Protocol — Demo');
  console.log('═══════════════════════════════════════════\n');

  const agent = createMockAgent();
  const demoResults: Record<string, unknown> = {};

  // 1. Show wallet policy
  console.log('📋 Step 1: Check wallet policy');
  const policy = await agent.checkPolicy();
  console.log(`   Daily limit: ${formatEther(policy.dailyLimit)} ETH`);
  console.log(`   Whitelisted: ${policy.whitelistedRecipients.length} addresses`);
  console.log(`   Paused: ${policy.paused}`);
  demoResults.policy = {
    dailyLimit: formatEther(policy.dailyLimit),
    whitelisted: policy.whitelistedRecipients,
    paused: policy.paused,
  };

  // 2. Spend within limits (succeeds)
  console.log('\n✅ Step 2: Spend 0.3 ETH (within limits)');
  const spend1 = await agent.proposeSpend(
    '0x1111111111111111111111111111111111111111' as `0x${string}`,
    parseEther('0.3'),
    'API service payment'
  );
  console.log(`   Result: ${spend1.success ? 'SUCCESS' : 'BLOCKED'}`);
  if (spend1.txHash) console.log(`   Tx: ${spend1.txHash}`);
  demoResults.spend1_within_limit = spend1;

  // 3. Spend more (still within limits)
  console.log('\n✅ Step 3: Spend 0.2 ETH to second address');
  const spend2 = await agent.proposeSpend(
    '0x2222222222222222222222222222222222222222' as `0x${string}`,
    parseEther('0.2'),
    'Data storage fee'
  );
  console.log(`   Result: ${spend2.success ? 'SUCCESS' : 'BLOCKED'}`);
  demoResults.spend2_within_limit = spend2;

  // 4. Exceed daily limit (blocked)
  console.log('\n🚫 Step 4: Spend 0.6 ETH (exceeds daily limit)');
  const spend3 = await agent.proposeSpend(
    '0x1111111111111111111111111111111111111111' as `0x${string}`,
    parseEther('0.6'),
    'Large purchase'
  );
  console.log(`   Result: ${spend3.success ? 'SUCCESS' : 'BLOCKED'}`);
  console.log(`   Reason: ${spend3.error}`);
  demoResults.spend3_over_limit = spend3;

  // 5. Non-whitelisted address (blocked)
  console.log('\n🚫 Step 5: Spend to non-whitelisted address');
  const spend4 = await agent.proposeSpend(
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
    parseEther('0.1'),
    'Unknown recipient'
  );
  console.log(`   Result: ${spend4.success ? 'SUCCESS' : 'BLOCKED'}`);
  console.log(`   Reason: ${spend4.error}`);
  demoResults.spend4_not_whitelisted = spend4;

  // 6. Budget check
  console.log('\n💰 Step 6: Check remaining budget');
  const remaining = await agent.getDailyBudgetRemaining();
  console.log(`   Remaining: ${formatEther(remaining)} ETH`);
  demoResults.remaining_budget = formatEther(remaining);

  // 7. Generate spending report
  console.log('\n📊 Step 7: Generate spending report');
  const history = await agent.getSpendingHistory();
  const report = generateReport(history, policy, simulatedSpentToday);
  console.log(`   ${report.summary}`);
  demoResults.report = formatReportJSON(report);

  // Save demo proof
  const proofDir = path.join(ROOT, 'proof');
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }

  const proof = {
    protocol: 'Agent Wallet Protocol',
    timestamp: new Date().toISOString(),
    demo: demoResults,
    history: history.map((h) => ({
      to: h.to,
      amount: formatEther(h.amount),
      reason: h.reason,
    })),
  };

  fs.writeFileSync(
    path.join(proofDir, 'demo.json'),
    JSON.stringify(proof, null, 2)
  );

  console.log('\n📄 Proof saved to proof/demo.json');
  console.log('\n═══════════════════════════════════════════');
  console.log('  Demo complete!');
  console.log('═══════════════════════════════════════════');
}

demo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
