Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Starting AeroHealth — Personalized Weather-Health System" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Frontend (Vite) on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Starting Backend Server on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Write-Host "Interactive Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173/"
py backend\server.py
