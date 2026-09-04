@echo off
echo =================================================================
echo   Starting AeroHealth — Personalized Weather-Health System
echo =================================================================
echo.
echo Running Backend Server on http://127.0.0.1:8000 ...
echo Interactive Web Application available at: http://127.0.0.1:8000/
echo Interactive Swagger Docs available at:    http://127.0.0.1:8000/docs
echo.
start http://127.0.0.1:8000/
py backend\server.py
pause
