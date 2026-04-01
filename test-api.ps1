#!/usr/bin/env pwsh

$url = "http://localhost:3000/"

Write-Host "Testing API at $url"

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host ""
Write-Host "Testing /api/status endpoint..."
$url2 = "http://localhost:3000/api/status"

try {
    $response = Invoke-WebRequest -Uri $url2 -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)"
    }
}
