Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Starting AeroHealth — Personalized Weather-Health System" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Running Backend Server on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Write-Host "Interactive Web Application: http://127.0.0.1:8000/" -ForegroundColor Green
Write-Host "Interactive Swagger Docs:    http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://127.0.0.1:8000/"
py backend\server.py
