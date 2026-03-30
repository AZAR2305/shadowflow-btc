# Mock Deployment for Testing (No sncast/scarb required)
# Generates dummy contract addresses for API testing

param(
    [switch]$GenerateOnly = $false
)

Write-Host "🧪 ShadowFlow - Mock Contract Deployment (Testing)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Generate realistic-looking Starknet contract addresses
function Generate-StarknetAddress {
    $guid = [guid]::NewGuid().ToString() -replace '-', ''
    return "0x" + $guid.Substring(0, 63)
}

# Create deployment addresses
$deployedAddresses = @{
    'garaga_verifier'    = Generate-StarknetAddress
    'shadowflow'         = Generate-StarknetAddress
    'escrow'             = Generate-StarknetAddress
    'liquidity_pool'     = Generate-StarknetAddress
    'buy_strk'           = Generate-StarknetAddress
    'sell_strk'          = Generate-StarknetAddress
}

Write-Host "📋 Generated Mock Contract Addresses:" -ForegroundColor Green
Write-Host ""

foreach ($contract in $deployedAddresses.GetEnumerator()) {
    Write-Host "  $($contract.Name.PadRight(20)) = $($contract.Value)" -ForegroundColor Gray
}

Write-Host ""

# Create deployment.env
$deploymentEnv = @"
# ShadowFlow Mock Deployment (Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
# Use these addresses for API testing
# For real deployment, install sncast and scarb, then run:
#   pwsh deploy-contracts.ps1

VERIFIER_CONTRACT_ADDRESS=$($deployedAddresses['garaga_verifier'])
SHADOWFLOW_CONTRACT_ADDRESS=$($deployedAddresses['shadowflow'])
ESCROW_CONTRACT_ADDRESS=$($deployedAddresses['escrow'])
LIQUIDITY_POOL_ADDRESS=$($deployedAddresses['liquidity_pool'])
BUY_STRK_CONTRACT_ADDRESS=$($deployedAddresses['buy_strk'])
SELL_STRK_CONTRACT_ADDRESS=$($deployedAddresses['sell_strk'])

# API Configuration
STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia
ADMIN_ADDRESS=0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ADMIN_PRIVATE_KEY=0x1234567890abcdef

# Pyth Oracle
PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network

# Bitcoin
NEXT_PUBLIC_BTC_RPC_URL=https://mempool.space/testnet4/api
NEXT_PUBLIC_BTC_EXPLORER_URL=https://mempool.space/testnet4
BTC_NETWORK=testnet4
BTC_ESCROW_PRIVATE_KEY=YOUR_TESTNET_WIF_HERE

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_EXECUTION=false
PRICE_CACHE_TTL=60
MOCK_BLOCKCHAIN=false

DEPLOYED_AT=$(Get-Date -Format 'o')
"@

# Write to .env.local
$envFile = ".env.local"
Set-Content -Path $envFile -Value $deploymentEnv -Encoding UTF8

Write-Host "💾 Created: $envFile" -ForegroundColor Green
Write-Host ""

# Copy to contracts directory too
$contractsEnv = "contracts/deployment.env"
Set-Content -Path $contractsEnv -Value $deploymentEnv -Encoding UTF8
Write-Host "💾 Created: $contractsEnv" -ForegroundColor Green
Write-Host ""

Write-Host "========================================================" -ForegroundColor Green
Write-Host "✅ MOCK DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review .env.local - addresses are for testing only" -ForegroundColor Gray
Write-Host "  2. Start dev server: npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "⚡ Test the API Routes:" -ForegroundColor Cyan
Write-Host "  In another terminal, run:" -ForegroundColor Gray
Write-Host "  pwsh test-api-routes.ps1" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔧 For Real Deployment:" -ForegroundColor Cyan
Write-Host "  1. Install scarb: https://docs.starknet.io/tools/scarb/" -ForegroundColor Gray
Write-Host "  2. Install sncast: cargo install sncast --locked" -ForegroundColor Gray
Write-Host "  3. Setup Starknet account: sncast account create" -ForegroundColor Gray
Write-Host "  4. Run: pwsh deploy-contracts.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 See DEPLOYMENT_SETUP.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎉 Ready to test!" -ForegroundColor Green
