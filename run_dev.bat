@echo off
echo =================================================================
echo   Starting AeroHealth — Personalized Weather-Health System
echo =================================================================
echo.
echo Starting Frontend (Vite) on http://localhost:5173 ...
start cmd /k "cd frontend && npm run dev"

echo Running Backend Server on http://127.0.0.1:8000 ...
echo Interactive Swagger Docs available at: http://127.0.0.1:8000/docs
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173/
py backend\server.py
pause
