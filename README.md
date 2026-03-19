# 🏦 Agent Wallet Protocol

**The bank account for AI agents** — an on-chain wallet protocol with configurable spending policies.

> Synthesis Hackathon — Open Track: Agentic Infrastructure

## Overview

Agent Wallet Protocol gives AI agents their own on-chain wallets with built-in guardrails. An **owner** sets spending policies (daily limits, recipient whitelists, emergency pause), and the **agent** operates within those constraints. This separation of concerns enables autonomous AI spending without unlimited access to funds.

## Architecture

```
┌─────────┐     Policy Config      ┌──────────────────┐
│  Owner   │ ─────────────────────▶ │  AgentWallet.sol │
└─────────┘   setDailyLimit()      │                  │
              setWhitelist()        │  • Daily limits  │
              pause()/unpause()     │  • Whitelist     │
                                    │  • Pause guard   │
┌─────────┐     Spend within       │                  │
│  Agent   │ ─────────────────────▶ │  spend(to,amt,   │
└─────────┘   policy constraints    │    reason)       │
                                    └──────────────────┘
```

## Key Features

- **Daily Spending Limits** — Cap how much an agent can spend per UTC day
- **Recipient Whitelist** — Restrict which addresses can receive funds
- **Emergency Pause** — Owner can freeze all spending instantly
- **Spending History** — Full on-chain audit trail with reasons
- **Separation of Concerns** — Owner controls policy, agent controls spending
- **Gasless Deploy** — Deploy to Status Network Sepolia with zero gas fees

## Project Structure

```
contracts/
  AgentWallet.sol          — Solidity smart contract
src/
  config.ts                — Chain configs (Status Sepolia, Base Sepolia)
  compile.ts               — Compile contract with solc
  deploy.ts                — Deploy + configure on-chain
  agent/wallet-agent.ts    — Agent SDK: policy checks, spend validation
  dashboard/reporter.ts    — Spending reports and analytics
  index.ts                 — Entry point and exports
test/
  config.test.ts           — Config validation
  wallet-agent.test.ts     — Agent logic tests (mocked)
  reporter.test.ts         — Report generation tests
  compile.test.ts          — Contract compilation tests
scripts/
  demo.ts                  — Full demo simulation
```

## Quick Start

```bash
# Install dependencies
npm install

# Compile the smart contract
npm run build

# Run tests
npm test

# Run the demo
npm run demo
```

## Smart Contract

`AgentWallet.sol` implements:

| Function | Access | Description |
|----------|--------|-------------|
| `deposit()` | Anyone | Fund the wallet |
| `spend(to, amount, reason)` | Agent only | Spend within policy |
| `setDailyLimit(limit)` | Owner only | Set daily spending cap |
| `setRecipientWhitelist(addrs, allowed)` | Owner only | Manage whitelist |
| `pause() / unpause()` | Owner only | Emergency controls |
| `getSpentToday()` | View | Current daily spend |
| `getPolicy()` | View | Full policy state |
| `getHistory(offset, limit)` | View | Spending records |

## Spending Policies

1. **Daily Limit** — Resets at UTC midnight. Agent cannot exceed the cap.
2. **Recipient Whitelist** — When populated, only whitelisted addresses can receive. Empty whitelist = any recipient allowed.
3. **Emergency Pause** — Blocks all spending immediately. Only owner can unpause.

## Deployment

```bash
# Set your private key
cp .env.example .env
# Edit .env with your key

# Deploy to Status Network Sepolia (gasless)
npm run deploy
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for deployment |
| `RPC_URL` | RPC endpoint (defaults to Status Network Sepolia) |

## License

MIT
