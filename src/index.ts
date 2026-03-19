export { statusSepolia, baseSepolia, PRIVATE_KEY, RPC_URL } from './config.js';
export { compile } from './compile.js';
export { WalletAgent } from './agent/wallet-agent.js';
export type { Policy, SpendRecord, SpendProposal, SpendValidation } from './agent/wallet-agent.js';
export { generateReport, formatReportJSON } from './dashboard/reporter.js';
export type { SpendingReport } from './dashboard/reporter.js';

console.log('🏦 Agent Wallet Protocol');
console.log('   On-chain wallets for AI agents with configurable spending policies');
console.log('');
console.log('   Commands:');
console.log('     npm run build   — Compile the AgentWallet contract');
console.log('     npm run deploy  — Deploy to Status Network Sepolia');
console.log('     npm run demo    — Run the demo simulation');
console.log('     npm test        — Run tests');
