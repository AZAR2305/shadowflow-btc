# ShadowFlow API Integration Test Script (Windows PowerShell)
# Tests all three bridge routes with real Pyth Oracle data

$BaseUrl = "http://localhost:3000"

Write-Host "🚀 ShadowFlow API Integration Test" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Test 1: Buy STRK with BTC
Write-Host "📝 Test 1: Buy STRK with BTC (BTC → STRK Bridge)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$buyStrkBody = @{
    walletAddress = "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    btcAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
    btcAmount = 0.5
    minStrkReceive = 25000
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/otc/buy-strk" -Method POST -Body $buyStrkBody -ContentType "application/json"
    $response | ConvertTo-Json | Write-Host
    Write-Host "✅ Buy STRK test passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Buy STRK test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 2: Sell STRK for BTC
Write-Host "📝 Test 2: Sell STRK for BTC (STRK → BTC Bridge)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$sellStrkBody = @{
    walletAddress = "0x456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012"
    btcAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
    strkAmount = 50000
    minBtcReceive = 0.01
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/otc/sell-strk" -Method POST -Body $sellStrkBody -ContentType "application/json"
    $response | ConvertTo-Json | Write-Host
    Write-Host "✅ Sell STRK test passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Sell STRK test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 3: Create Intent (Full OTC)
Write-Host "📝 Test 3: Create Intent with Full Web3 Flow" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$intentBody = @{
    walletAddress = "0x789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345"
    direction = "buy"
    templateId = "simple"
    priceThreshold = 50000
    amount = 1
    splitCount = 1
    selectedPath = "default"
    depositConfirmed = $true
    depositAmount = 100
    sendChain = "btc"
    receiveChain = "strk"
    receiveWalletAddress = "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/otc/intents" -Method POST -Body $intentBody -ContentType "application/json"
    $response | ConvertTo-Json | Write-Host
    Write-Host "✅ Intent creation test passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Intent creation test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
