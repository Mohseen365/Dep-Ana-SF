$logDir = Join-Path $env:TEMP "dependency-analyzer-p0"
$outFile = Join-Path $logDir "existing-test-failure-inventory.txt"

# Ensure the output directory exists
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$logs = Get-ChildItem -Path $logDir -File -Filter "explorer-full-vitest*.log"

Write-Host "`n=== EXISTING LOG FILES ==="
$logs | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

if (-not $logs) {
    Write-Host "No matching existing logs found."
    Write-Host "Do not rerun the full suite yet; locate the original log files first."
    return
}

$patterns = @(
    'Test Files',
    'Tests\s',
    'FAIL',
    'failed',
    'AssertionError',
    'Error:',
    'Unhandled Error',
    'expected .* to',
    'UrlSync',
    'URL.?Sync',
    'desync invariant failure',
    'duplicate run',
    'error TS\d+'
)

$results = foreach ($logFile in $logs) {
    "`r`n============================================================"
    "LOG: $($logFile.FullName)"
    "============================================================"
    Select-String -Path $logFile.FullName -Pattern $patterns -Context 3,6 -ErrorAction SilentlyContinue |
        ForEach-Object {
            "Line $($_.LineNumber): $($_.Line)"
            $_.Context.PreContext
            $_.Context.PostContext
            "------------------------------------------------------------"
        }
}

$results | Set-Content -Path $outFile -Encoding utf8

Write-Host "`n=== INVENTORY WRITTEN ==="
Write-Host $outFile
Write-Host "`n=== INVENTORY PREVIEW ==="
Get-Content $outFile -TotalCount 250

Write-Host "`n=== IMPORTANT ==="
Write-Host "This extracts evidence from existing logs; it does not rerun tests."
Write-Host "The original test exit code may still be unavailable."
