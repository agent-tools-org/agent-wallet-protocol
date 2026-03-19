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

## Smart Contract Architecture

`AgentWallet.sol` is a single-contract design with clear role separation:

| Function | Access | Description |
|----------|--------|-------------|
| `constructor(owner, agent)` | Deploy | Sets the owner and agent addresses |
| `deposit()` | Anyone | Fund the wallet with ETH |
| `receive()` | Anyone | Accept direct ETH transfers |
| `spend(to, amount, reason)` | Agent only | Spend within policy constraints |
| `setDailyLimit(limit)` | Owner only | Set daily spending cap (in wei) |
| `setRecipientWhitelist(addrs, allowed)` | Owner only | Add/remove whitelisted recipients |
| `pause()` | Owner only | Freeze all spending immediately |
| `unpause()` | Owner only | Resume spending |
| `getSpentToday()` | View | Current daily spend (resets at UTC midnight) |
| `getPolicy()` | View | Returns dailyLimit, whitelist, paused state |
| `getHistory(offset, limit)` | View | Paginated spending records |

### Events

| Event | Emitted When |
|-------|-------------|
| `Deposited(from, amount)` | ETH deposited into wallet |
| `Spent(to, amount, reason)` | Agent completes a spend |
| `PolicyUpdated(field)` | Owner changes dailyLimit or whitelist |
| `Paused()` / `Unpaused()` | Emergency pause toggled |

### Daily Reset Mechanism

The contract tracks spending per UTC day. At the start of each new day (calculated as `block.timestamp / 86400 * 86400`), the `_spentToday` counter resets to zero automatically on the next spend call.

## Spending Policy Examples

### Conservative (Low-autonomy agent)
```
Daily limit:  0.1 ETH
Whitelist:    2-3 known service addresses only
Use case:     Agent pays for API calls to trusted providers
```

### Moderate (Standard agent)
```
Daily limit:  1.0 ETH
Whitelist:    10-20 verified addresses
Use case:     Agent manages routine DeFi operations
```

### Aggressive (High-autonomy agent)
```
Daily limit:  10.0 ETH
Whitelist:    Empty (any recipient allowed)
Use case:     Trading agent with broad operational freedom
```

> **Tip:** Start conservative and increase limits as you gain confidence in the agent's behavior. The owner can adjust policies at any time without redeploying.

## Deployment

### Deployed Contract

A live instance is deployed on Status Network Sepolia:

```
Contract: 0xb3a70a055d13a66793fe302bb6e86527ed15aa1d
Network:  Status Network Sepolia (Chain ID: 2020)
Explorer: https://sepoliascan.status.network/address/0xb3a70a055d13a66793fe302bb6e86527ed15aa1d
```

### Deploy Your Own (Status Network Sepolia — Gasless)

Status Network Sepolia offers **zero gas fees**, making it ideal for development:

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 2. Compile the contract
npm run build

# 3. Deploy (gasless on Status Network Sepolia)
npm run deploy
```

The deploy script will:
1. Compile `AgentWallet.sol` if artifacts don't exist
2. Deploy to Status Network Sepolia (RPC: `https://public.sepolia.status.network`)
3. Configure the agent address, daily limit, and whitelist
4. Save deployment proof to `proof/deploy.json`

### Deploy to Other Networks

Set `RPC_URL` to target a different network:

```bash
RPC_URL=https://sepolia.base.org npm run deploy
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for deployment |
| `RPC_URL` | RPC endpoint (defaults to Status Network Sepolia) |

## Security Considerations

- **Private key management** — Never commit `.env` or private keys. Use a dedicated deployer wallet with minimal funds.
- **Owner ≠ Agent** — Always use separate addresses for owner and agent roles. The owner controls policy; the agent controls spending.
- **Daily limits** — Set conservative limits initially. The daily reset at UTC midnight means a compromised agent can spend at most `dailyLimit` per day.
- **Whitelist enforcement** — When the whitelist is populated, the agent can only send to approved addresses. An empty whitelist allows any recipient — use with caution.
- **Emergency pause** — If suspicious activity is detected, the owner can call `pause()` to immediately freeze all spending.
- **On-chain audit trail** — Every spend is recorded with recipient, amount, reason, and timestamp. Use `getHistory()` or the reporter module for monitoring.
- **Contract immutability** — The owner/agent addresses are set at deploy time and cannot be changed. Deploy a new contract if rotation is needed.

## License

MIT
