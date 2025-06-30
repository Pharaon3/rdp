@echo off
REM WebSocket Agent Startup Script
cd /d "C:\rdp\"
powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '192.168.129.23', '8888', 'test' -WindowStyle Hidden"
