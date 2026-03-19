import dotenv from 'dotenv';
import { defineChain } from 'viem';

dotenv.config();

export const statusSepolia = defineChain({
  id: 1660990954,
  name: 'Status Network Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public.sepolia.rpc.status.network'] },
  },
  testnet: true,
});

export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  testnet: true,
});

export const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined;

export const RPC_URL = process.env.RPC_URL || statusSepolia.rpcUrls.default.http[0];
