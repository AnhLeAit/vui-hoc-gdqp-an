# Build app Windows -> dist\windows
#   - Bo cai dat NSIS (.exe) va MSI (.msi)
#   - Ban portable (.exe chay truc tiep, khong can cai)
# Cach dung (PowerShell):  .\scripts\build-windows.ps1
# Hoac nhap dup file scripts\build-windows.bat

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$Root = Get-Location

function Require($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Loi: khong tim thay '$cmd'. $hint" -ForegroundColor Red
        exit 1
    }
}
Require node  "Cai Node.js tai https://nodejs.org"
Require cargo "Cai Rust tai https://rustup.rs (chon toolchain MSVC)"

$Version = node -p "require('./src-tauri/tauri.conf.json').version"
$Bundle  = "src-tauri\target\release\bundle"

Write-Host "==> Cai dependencies" -ForegroundColor Cyan
if (Test-Path package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Build v$Version" -ForegroundColor Cyan
npx tauri build --bundles nsis,msi
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Gom file vao dist\windows" -ForegroundColor Cyan
$Out = "dist\windows"
if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }
New-Item -ItemType Directory -Path $Out | Out-Null
Copy-Item "$Bundle\nsis\*.exe" $Out
Copy-Item "$Bundle\msi\*.msi"  $Out
# Giao dien web da nhung san trong file exe, nen file nay chay doc lap (can WebView2 - co san tren Win 10/11)
Copy-Item "src-tauri\target\release\vui-hoc-gdqp-an.exe" "$Out\Vui Hoc GDQP-AN_${Version}_portable.exe"

Write-Host ""
Write-Host "Xong! File nam trong: $Root\$Out" -ForegroundColor Green
Get-ChildItem $Out | Format-Table Name, @{n="Size (MB)"; e={"{0:N1}" -f ($_.Length / 1MB)}} -AutoSize
