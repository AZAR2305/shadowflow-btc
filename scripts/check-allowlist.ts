/**
 * Allowlist Check Script
 * Check if the executor wallet is in the escrow contract allowlist
 */

import { RpcProvider, Contract } from 'starknet';

const RPC_URL = 'https://api.cartridge.gg/x/starknet/sepolia';
const ESCROW_ADDRESS = '0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4';
const EXECUTOR_ADDRESS = '0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e';

const provider = new RpcProvider({ nodeUrl: RPC_URL });

async function checkAllowlist() {
  console.log('Escrow Contract Allowlist Check');
  console.log('================================\n');
  console.log(`Escrow Contract: ${ESCROW_ADDRESS}`);
  console.log(`Executor Wallet: ${EXECUTOR_ADDRESS}\n`);

  try {
    // Try to call is_in_allowlist or similar function
    const contractClass = await provider.getClassAt(ESCROW_ADDRESS);
    
    if ('abi' in contractClass && contractClass.abi) {
      const abi = contractClass.abi as any[];
      const allowlistFunctions = abi.filter((item: any) => 
        item.type === 'function' && 
        (item.name.includes('allowlist') || item.name.includes('whitelist'))
      );

      console.log('Allowlist-related functions found:');
      allowlistFunctions.forEach((func: any) => {
        console.log(`  - ${func.name}`);
      });

      // Try to check if executor is in allowlist
      const contract = new Contract(contractClass.abi, ESCROW_ADDRESS, provider);
      
      // Try common function names
      const checkFunctions = ['is_in_allowlist', 'is_whitelisted', 'isAllowlisted', 'check_allowlist'];
      
      for (const funcName of checkFunctions) {
        try {
          const result = await contract.call(funcName, [EXECUTOR_ADDRESS]);
          console.log(`\n✅ ${funcName}(${EXECUTOR_ADDRESS}): ${result}`);
          
          if (result === false || result === 0n || result === '0') {
            console.log('\n❌ EXECUTOR IS NOT IN ALLOWLIST');
            console.log('\nTo add executor to allowlist, run:');
            console.log(`starkli invoke ${ESCROW_ADDRESS} add_to_allowlist ${EXECUTOR_ADDRESS} --rpc ${RPC_URL} --account <admin-account>`);
          } else {
            console.log('\n✅ EXECUTOR IS IN ALLOWLIST');
          }
          break;
        } catch (e) {
          // Function doesn't exist, try next one
          continue;
        }
      }

      // Try to get owner
      try {
        const owner = await contract.call('owner', []);
        console.log(`\nContract Owner: ${owner}`);
      } catch (e) {
        console.log('\nCould not determine contract owner');
      }

    } else {
      console.log('❌ No ABI found for escrow contract');
    }

  } catch (error) {
    console.error('Error checking allowlist:', error);
  }
}

checkAllowlist().catch(console.error);
