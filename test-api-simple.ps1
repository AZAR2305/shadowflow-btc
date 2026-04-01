# Simple test for API routes - requires dev server running
# Start dev server first: npm run dev

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose = $false
)

Write-Host "🧪 Testing ShadowFlow API Routes" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Test data
$testBtcAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
$testStarknetAddress = "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Test 1: GET /api/health (or check if routes exist)
Write-Host "1️⃣ Testing /api/otc/buy-strk" -ForegroundColor Green
$buyStrkPayload = @{
    btcAddress = $testBtcAddress
    btcAmount = 0.1
    minStrkReceive = 1000
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/otc/buy-strk" `
        -Method POST `
        -ContentType "application/json" `
        -Body $buyStrkPayload `
        -ErrorAction Stop

    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    
    if ($Verbose) {
        Write-Host "Response:" -ForegroundColor Gray
        $data | ConvertTo-Json | Write-Host -ForegroundColor Gray
    } else {
        Write-Host "  - Price Data: BTC = $($data.prices.btcPrice), STRK = $($data.prices.strkPrice)" -ForegroundColor Gray
        Write-Host "  - ZK Proof: $($data.proof.commitmentHash)" -ForegroundColor Gray
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  Expected validation error (test data)" -ForegroundColor Yellow
        Write-Host "   Headers: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Sell STRK
Write-Host "2️⃣ Testing /api/otc/sell-strk" -ForegroundColor Green
$sellStrkPayload = @{
    strkAmount = 2000
    btcRecipient = $testBtcAddress
    minBtcReceive = 0.05
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/otc/sell-strk" `
        -Method POST `
        -ContentType "application/json" `
        -Body $sellStrkPayload `
        -ErrorAction Stop

    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    
    if ($Verbose) {
        Write-Host "Response:" -ForegroundColor Gray
        $data | ConvertTo-Json | Write-Host -ForegroundColor Gray
    } else {
        Write-Host "  - Price Data: BTC = $($data.prices.btcPrice), STRK = $($data.prices.strkPrice)" -ForegroundColor Gray
        Write-Host "  - ZK Proof: $($data.proof.commitmentHash)" -ForegroundColor Gray
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  Expected validation error (test data)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Full OTC Intent
Write-Host "3️⃣ Testing /api/otc/intents" -ForegroundColor Green
$intentPayload = @{
    seller = $testStarknetAddress
    buyer = $testStarknetAddress
    baseAsset = "BTc"
    quoteAsset = "STRK"
    amount = 0.1
    direction = "sell"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/otc/intents" `
        -Method POST `
        -ContentType "application/json" `
        -Body $intentPayload `
        -ErrorAction Stop

    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    
    if ($Verbose) {
        Write-Host "Response:" -ForegroundColor Gray
        $data | ConvertTo-Json | Write-Host -ForegroundColor Gray
    } else {
        Write-Host "  - Price Verified: $($data.priceVerification.verified)" -ForegroundColor Gray
        Write-Host "  - ZK Proof: $($data.proof.commitmentHash)" -ForegroundColor Gray
        Write-Host "  - Escrow Status: $($data.escrow.status)" -ForegroundColor Gray
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  Expected validation error (test data)" -ForegroundColor Yellow
        Write-Host "   This is normal for test payloads" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Use -Verbose flag to see full responses" -ForegroundColor Gray
Write-Host "  - Default URL is http://localhost:3000" -ForegroundColor Gray
Write-Host "  - Make sure dev server is running (npm run dev)" -ForegroundColor Gray
Write-Host ""
