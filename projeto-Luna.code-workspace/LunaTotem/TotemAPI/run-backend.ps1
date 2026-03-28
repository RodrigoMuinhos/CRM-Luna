<#
Simple helper to start TotemAPI locally.

Usage (PowerShell):
  # run with maven (default)
  .\run-backend.ps1

  # start the packaged jar (if built)
  .\run-backend.ps1 -jar

This script is intentionally small and interactive so you can see logs in the terminal.
#>
param(
    [switch]$jar
)

Set-Location -Path $PSScriptRoot

if ($jar) {
    $jarPath = Join-Path $PSScriptRoot 'target\totem-api-0.0.1-SNAPSHOT.jar'
    if (Test-Path $jarPath) {
        Write-Host "Starting backend from jar: $jarPath"
        & java -jar $jarPath --spring.profiles.active=local
    } else {
        Write-Error "Jar not found: $jarPath - run 'mvn package' first or use the default (mvn spring-boot:run)."
    }
} else {
    Write-Host 'Starting backend with Maven (spring-boot:run) — use Ctrl+C to stop.'
    & mvn spring-boot:run
}
