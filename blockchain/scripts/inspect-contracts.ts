/**
 * Contract Inspection Script
 * Run this to inspect the deployed contracts and understand their interfaces
 */

import { RpcProvider } from 'starknet';

const RPC_URL = 'https://api.cartridge.gg/x/starknet/sepolia';
const provider = new RpcProvider({ nodeUrl: RPC_URL });

const CONTRACTS = {
  escrow: '0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4',
  buyStrk: '0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b',
  sellStrk: '0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325',
};

async function inspectContract(name: string, address: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Inspecting ${name} Contract: ${address}`);
  console.log('='.repeat(70));

  try {
    // Get contract class
    const classHash = await provider.getClassHashAt(address);
    console.log(`Class Hash: ${classHash}`);

    // Get contract class definition
    const contractClass = await provider.getClassAt(address);
    
    if ('abi' in contractClass && contractClass.abi) {
      console.log(`\nABI Found! Functions:`);
      
      const abi = contractClass.abi as any[];
      const functions = abi.filter((item: any) => item.type === 'function');
      
      functions.forEach((func: any) => {
        console.log(`\n  Function: ${func.name}`);
        if (func.inputs && func.inputs.length > 0) {
          console.log(`  Inputs:`);
          func.inputs.forEach((input: any, index: number) => {
            console.log(`    [${index}] ${input.name}: ${input.type}`);
          });
        }
        if (func.outputs && func.outputs.length > 0) {
          console.log(`  Outputs:`);
          func.outputs.forEach((output: any) => {
            console.log(`    - ${output.type}`);
          });
        }
      });
    } else {
      console.log('No ABI found in contract class');
    }
  } catch (error) {
    console.error(`Error inspecting ${name}:`, error);
  }
}

async function main() {
  console.log('Contract Interface Inspection Tool');
  console.log('===================================\n');
  console.log(`RPC: ${RPC_URL}\n`);

  // Inspect BuyStrk contract (most important for fixing param #2 error)
  await inspectContract('BuyStrk', CONTRACTS.buyStrk);

  // Inspect Escrow contract (to check allowlist functions)
  await inspectContract('Escrow', CONTRACTS.escrow);

  // Inspect SellStrk contract
  await inspectContract('SellStrk', CONTRACTS.sellStrk);

  console.log(`\n${'='.repeat(70)}`);
  console.log('Inspection Complete!');
  console.log('='.repeat(70)\n);
}

main().catch(console.error);
