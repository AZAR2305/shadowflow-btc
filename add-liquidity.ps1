#!/usr/bin/env pwsh
<#
.SYNOPSIS
Add liquidity to the Starknet bridge pools

.DESCRIPTION
This script adds STRK or BTC liquidity to the bridge reserves.
Requires: Backend running on http://localhost:3000

.PARAMETER Amount
The amount of tokens to add (in base units)
For STRK (18 decimals): 1 STRK = 1000000000000000000
For BTC (8 decimals): 1 BTC = 100000000

.PARAMETER Chain
Which chain's liquidity to add: 'strk' or 'btc' (default: strk)

.PARAMETER ApiKey
API key for authorization (optional if not required)

.EXAMPLE
# Add 10 STRK to reserves
.\add-liquidity.ps1 -Amount 10000000000000000000 -Chain strk

# Add 0.5 BTC to reserves
.\add-liquidity.ps1 -Amount 50000000 -Chain btc

# Add 100 STRK using API token
.\add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk -ApiKey "your-key"
#>

param(
    [Parameter(Mandatory = $true, HelpMessage = "Amount in base units")]
    [string]$Amount,
    
    [Parameter(Mandatory = $false, HelpMessage = "Chain: 'strk' or 'btc'")]
    [ValidateSet("strk", "btc")]
    [string]$Chain = "strk",
    
    [Parameter(Mandatory = $false, HelpMessage = "API key for authorization")]
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Adding $Chain liquidity..." -ForegroundColor Cyan
Write-Host "Amount: $Amount base units" -ForegroundColor Gray

# Reference amounts
$strkDecimals = 18
$strkPerToken = [Math]::Pow(10, $strkDecimals)
$strkAmount = [double]$Amount / $strkPerToken

$btcDecimals = 8
$satoshisPerBtc = [Math]::Pow(10, $btcDecimals)
$btcAmount = [double]$Amount / $satoshisPerBtc

if ($Chain -eq "strk") {
    Write-Host "   - $strkAmount STRK tokens" -ForegroundColor Green
} else {
    Write-Host "   - $btcAmount BTC" -ForegroundColor Green
}

# Build request
$body = @{
    amount = $Amount
    chain  = $Chain
} | ConvertTo-Json

# Build headers
$headers = @{
    "Content-Type" = "application/json"
}

if ($ApiKey) {
    $headers["Authorization"] = "Bearer $ApiKey"
}

# Make request
$url = "http://localhost:3000/api/otc/liquidity/add-reserves"

try {
    Write-Host ""
    Write-Host "Sending request to $url..." -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri $url `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json

    if ($result.success) {
        Write-Host ""
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host "Transaction Hash: $($result.transactionHash)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Waiting for confirmation..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        
        Write-Host "Liquidity added! Check /api/otc/diagnostics for pool status." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "Error: $($result.error)" -ForegroundColor Red
        Write-Host "Details: $($result.details)" -ForegroundColor Yellow
        exit 1
    }
}
catch [System.Net.WebException] {
    Write-Host ""
    Write-Host "REQUEST FAILED" -ForegroundColor Red
    
    # Try to read error response body
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        try {
            $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error: $($errorBody.error)" -ForegroundColor Red
            if ($errorBody.stack) {
                Write-Host "Stack: $($errorBody.stack)" -ForegroundColor Yellow
            }
            $reader.Close()
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    exit 1
}
catch {
    Write-Host ""
    Write-Host "REQUEST FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Liquidity added to $Chain pool"
Write-Host "2. Try the swap again: POST /api/otc/intents"
Write-Host "3. Check pool status: GET /api/otc/diagnostics"
Write-Host "================================================" -ForegroundColor Cyan

