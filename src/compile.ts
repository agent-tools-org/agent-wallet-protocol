import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export interface CompileResult {
  abi: unknown[];
  bytecode: string;
}

export async function compile(): Promise<CompileResult> {
  const solcModule = await import('solc');
  const solc = solcModule.default;

  const contractPath = path.join(ROOT, 'contracts', 'AgentWallet.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'AgentWallet.sol': { content: source },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: { severity: string }) => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error(`Compilation failed:\n${errors.map((e: { formattedMessage: string }) => e.formattedMessage).join('\n')}`);
    }
  }

  const contract = output.contracts['AgentWallet.sol']['AgentWallet'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;

  const artifactsDir = path.join(ROOT, 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(artifactsDir, 'AgentWallet.json'),
    JSON.stringify({ abi, bytecode }, null, 2)
  );

  console.log('✅ AgentWallet compiled successfully');
  console.log(`   ABI: ${abi.length} entries`);
  console.log(`   Bytecode: ${bytecode.length} chars`);

  return { abi, bytecode };
}

// Run if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('compile.ts') ||
  process.argv[1].endsWith('compile.js')
);
if (isMain) {
  compile().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
