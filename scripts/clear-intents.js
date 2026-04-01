#!/usr/bin/env node

/**
 * Clear all intents from the OTC matching service
 * Run: node scripts/clear-intents.js
 */

// Import the service
const { OtcMatchingService } = require('../lib/server/otcMatchingService.ts');

async function main() {
  try {
    console.log('🗑️  Clearing all intents and matches...\n');
    
    const service = OtcMatchingService.getInstance();
    const result = service.clearAllIntents();
    
    console.log('✅ Cleared successfully!');
    console.log(`   - Intents removed: ${result.clearedIntents}`);
    console.log(`   - Matches removed: ${result.clearedMatches}`);
    
    // Show state after clearing
    const state = service.getState();
    console.log('\n📊 Current state:');
    console.log(`   - Total intents: ${state.totalIntents}`);
    console.log(`   - Total matches: ${state.totalMatches}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
