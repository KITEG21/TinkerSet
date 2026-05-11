# Script para crear ZIP portable
$sourceExe = "frontend\src-tauri\target\release\app.exe"
if (-not (Test-Path $sourceExe)) {
    Write-Host "Falta app.exe. Ejecuta: npx tauri build --no-bundle"
    exit 1
}

$tempDir = "$env:TEMP\TinkerSet-pct-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copiar exe
Copy-Item $sourceExe -Destination "$tempDir\app.exe"
Write-Host "Copiado app.exe"

# Copiar DLLs
Get-ChildItem (Split-Path $sourceExe) -Filter "*.dll" | ForEach-Object {
    Copy-Item $_.FullName -Destination $tempDir
    Write-Host "Copiado $($_.Name)"
}

# Crear README
$readme = "# TinkerSet Portable`n"
$readme += "Instala WebView2 Runtime si falta: https://go.microsoft.com/fwlink/?LinkId=2124703`n"
$readme += "Instala Python 3.9+: pip install fastapi uvicorn python-multipart`n"
$readme += "Luego ejecuta: app.exe`n"
$readme | Out-File "$tempDir\README.txt" -Encoding UTF8

# Crear ZIP
$zipPath = "TinkerSet-portable-$(Get-Date -Format yyyyMMdd-HHmm).zip"
Compress-Archive -Path $tempDir -DestinationPath $zipPath -Force
Remove-Item $tempDir -Recurse -Force

Write-Host "Listo: $zipPath"
