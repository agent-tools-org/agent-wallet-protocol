import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  getContractAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { statusSepolia, PRIVATE_KEY, RPC_URL } from './config.js';
import { compile } from './compile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function deploy() {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  console.log('🔨 Compiling contract...');
  const { abi, bytecode } = await compile();

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`📍 Deployer: ${account.address}`);

  const walletClient = createWalletClient({
    account,
    chain: statusSepolia,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: statusSepolia,
    transport: http(RPC_URL),
  });

  console.log('🚀 Deploying AgentWallet...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [account.address, account.address],
    gasPrice: 0n,
    gas: 5000000n,
  });

  console.log(`📦 Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress!;
  console.log(`✅ Deployed at: ${contractAddress}`);

  // Set daily limit to 1 ETH
  console.log('⚙️  Setting daily limit to 1 ETH...');
  const limitHash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'setDailyLimit',
    args: [parseEther('1')],
    gasPrice: 0n,
    gas: 500000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: limitHash });

  // Whitelist deployer
  console.log('⚙️  Whitelisting deployer...');
  const wlHash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'setRecipientWhitelist',
    args: [[account.address], true],
    gasPrice: 0n,
    gas: 500000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: wlHash });

  // Save proof
  const proofDir = path.join(ROOT, 'proof');
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }

  const proof = {
    contract: 'AgentWallet',
    address: contractAddress,
    deployer: account.address,
    chain: statusSepolia.name,
    chainId: statusSepolia.id,
    txHash: hash,
    timestamp: new Date().toISOString(),
    policy: {
      dailyLimit: '1000000000000000000',
      whitelisted: [account.address],
    },
  };

  fs.writeFileSync(
    path.join(proofDir, 'deploy.json'),
    JSON.stringify(proof, null, 2)
  );

  console.log('📄 Proof saved to proof/deploy.json');
  return proof;
}

deploy().catch((err) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
