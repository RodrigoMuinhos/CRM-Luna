<#
Small helper to start TotemUI in dev mode (Next.js) from PowerShell.

Usage:
  # run from TotemUI directory
  .\run-frontend.ps1

This script will install packages automatically if node_modules is missing and then start the dev server.
#>

Set-Location -Path $PSScriptRoot

if (-not (Test-Path 'node_modules')) {
    Write-Host 'node_modules not found. Running npm install...'
    & npm install
}

function Get-LanIPv4Addresses {
    # Prefer a DNS/IP host lookup that works across environments
    $ips = @()
    try {
        $dnsAddrs = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) 2>$null
        if ($dnsAddrs) {
            $ips = $dnsAddrs | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | ForEach-Object { $_.IPAddressToString }
            $ips = $ips | Where-Object { $_ -and $_ -notlike '127.*' -and $_ -notlike '169.*' } | Sort-Object -Unique
        }
    } catch {
        # ignore
    }

    # If DNS didn't return desired addresses, fallback to Get-NetIPAddress and ipconfig parsing
    if (-not $ips -or $ips.Count -eq 0) {
        try {
            $net = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' }
            if ($net) { $ips = $net | Select-Object -ExpandProperty IPAddress }
        } catch {
            # ignore
        }
    }

    if (-not $ips -or $ips.Count -eq 0) {
        $raw = ipconfig 2>$null | Out-String
        $matches = [regex]::Matches($raw, '\d{1,3}(?:\.\d{1,3}){3}') | ForEach-Object { $_.Value }
        $ips = $matches | Where-Object { $_ -notlike '127.*' -and $_ -notlike '169.*' } | Sort-Object -Unique
    }

    return ,$ips
}

$ips = Get-LanIPv4Addresses
if ($ips -and $ips.Count -gt 0) {
    Write-Host 'Detected LAN IPv4 address(es):' -ForegroundColor Green
    foreach ($ip in $ips | Where-Object { $_ -and $_.ToString().Trim().Length -gt 0 }) {
            $ipClean = $ip.ToString().Trim()
            Write-Host "  http://$ipClean:3000" -ForegroundColor Yellow
            Write-Host "  http://$ipClean:3000/mobile-login" -ForegroundColor Yellow
        }
    Write-Host 'If you have trouble accessing from your phone, ensure firewall allows port 3000 and your phone is on the same network.' -ForegroundColor Gray
} else {
    Write-Host 'No LAN IPv4 address detected - Next will bind to all interfaces (0.0.0.0).' -ForegroundColor Yellow
}

Write-Host 'Starting frontend (npm run dev) - use Ctrl+C to stop. The server will be bound to 0.0.0.0:3000' -ForegroundColor Cyan
$env:HOST = '0.0.0.0'
npm run dev
