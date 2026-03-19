import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';

const chain = defineChain({
  id: 1660990954,
  name: 'Status Network Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://public.sepolia.rpc.status.network'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://sepoliascan.status.network' } },
});

async function main() {
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const artifact = JSON.parse(fs.readFileSync('artifacts/AgentWallet.json', 'utf8'));

  const wallet = createWalletClient({ account, chain, transport: http() });
  const pub = createPublicClient({ chain, transport: http() });

  console.log('Deploying AgentWallet from', account.address);
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [account.address, account.address],
    gasPrice: 0n,
    gas: 5000000n,
  });
  console.log('TX:', hash);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log('Contract:', receipt.contractAddress);
  console.log('Block:', receipt.blockNumber, 'Gas:', receipt.gasUsed);

  // Set daily limit to 1 ETH
  const addr = receipt.contractAddress!;
  const limitHash = await wallet.writeContract({
    address: addr, abi: artifact.abi, functionName: 'setDailyLimit',
    args: [1000000000000000000n],
    gasPrice: 0n, gas: 500000n,
  });
  const limitRx = await pub.waitForTransactionReceipt({ hash: limitHash });
  console.log('Daily limit set, block:', limitRx.blockNumber);

  fs.mkdirSync('proof', { recursive: true });
  fs.writeFileSync('proof/gasless-deploy.json', JSON.stringify({
    deployer: account.address, contractAddress: addr,
    deployTxHash: hash, deployBlock: Number(receipt.blockNumber),
    limitTxHash: limitHash, limitBlock: Number(limitRx.blockNumber),
    gasUsed: Number(receipt.gasUsed + limitRx.gasUsed), effectiveGasPrice: 0,
    explorerUrl: `https://sepoliascan.status.network/address/${addr}`,
    network: 'Status Network Sepolia', chainId: 1660990954,
    timestamp: new Date().toISOString()
  }, null, 2));
  console.log('Proof saved');
}

main().catch(e => { console.error(e.message); process.exit(1); });
