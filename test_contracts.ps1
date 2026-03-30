# Load Environment Variables from .env
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#\s]+=" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Item -Path "Env:\$name" -Value $value
    }
} else {
    Write-Host "Error: .env file not found." -ForegroundColor Red
    exit 1
}

$ACCOUNT = "0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e"
$ESCROW_ADDRESS = $env:NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS
$LIQUIDITY_POOL = $env:NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS
$BUY_STRK = $env:NEXT_PUBLIC_BUY_STRK_ADDRESS
$SELL_STRK = $env:NEXT_PUBLIC_SELL_STRK_ADDRESS
$TOKEN = $env:NEXT_PUBLIC_STRK_TOKEN_ADDRESS
$DUMMY_BTC = "0x425443" # Just a dummy identifier for BTC

Write-Host "🧪 Configuring and Testing Contracts on Sepolia..." -ForegroundColor Cyan

# 1. Configure EscrowContract (ALREADY CONFIGURED ON-CHAIN)
Write-Host "`n➤ 1. (Skipped) Configuring EscrowContract..." -ForegroundColor Yellow
# sncast --profile sepolia invoke --contract-address $ESCROW_ADDRESS --function add_wallet_to_allowlist --calldata $ACCOUNT
# sncast --profile sepolia invoke --contract-address $ESCROW_ADDRESS --function add_token_to_allowlist --calldata $TOKEN

# 2. Configure LiquidityPool (ALREADY CONFIGURED ON-CHAIN)
Write-Host "`n➤ 2. (Skipped) Configuring LiquidityPool... (STRK / BTC dummy)" -ForegroundColor Yellow
# sncast --profile sepolia invoke --contract-address $LIQUIDITY_POOL --function allow_pair --calldata "$TOKEN" "$DUMMY_BTC" "1000000000000000000" "0" "1000" "0"

# 3. Read Verification
Write-Host "`n➤ 3. Verifying Configurations (Read Calls)..." -ForegroundColor Yellow

$walletAllowedRes = sncast --profile sepolia call --contract-address $ESCROW_ADDRESS --function is_wallet_allowed --calldata $ACCOUNT
Write-Host "  Is wallet allowed? $walletAllowedRes"

$pairAllowedRes = sncast --profile sepolia call --contract-address $LIQUIDITY_POOL --function is_pair_allowed --calldata "$TOKEN" "$DUMMY_BTC"
Write-Host "  Is pair allowed? $pairAllowedRes"

$buyStrkRateRes = sncast --profile sepolia call --contract-address $BUY_STRK --function get_btc_rate
Write-Host "  Buy STRK Rate: $buyStrkRateRes"

$sellStrkRateRes = sncast --profile sepolia call --contract-address $SELL_STRK --function get_strk_to_btc_rate
Write-Host "  Sell STRK Rate: $sellStrkRateRes"

Write-Host "`n✅ Configuration and Basic Read Tests Completed!" -ForegroundColor Green
