# Script de diagnostico
Write-Host "=== Diagnostico de TinkerSet ===" 
Write-Host ""

# 1. Python
Write-Host "[1] Python..." -NoNewline
try {
    $py = python --version 2>&1
    Write-Host " OK - $py" -ForegroundColor Green
} catch {
    Write-Host " FALTA" -ForegroundColor Red
}

# 2. FastAPI
Write-Host "[2] FastAPI/Uvicorn..." -NoNewline
try {
    python -c "import fastapi, uvicorn" 2>&1 | Out-Null
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FALTA - pip install fastapi uvicorn python-multipart" -ForegroundColor Yellow
}

# 3. app.exe
Write-Host "[3] app.exe..." -NoNewline
if (Test-Path "frontend\src-tauri\target\release\app.exe") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FALTA - run: npx tauri build --no-bundle" -ForegroundColor Red
}
