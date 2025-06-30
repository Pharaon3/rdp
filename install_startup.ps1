Write-Host "Installing WebSocket Agent as Windows Startup Service..." -ForegroundColor Green

# Configuration
$pythonScriptUrl = "https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py"
$pythonScriptPath = "websocket_agent.py"
$taskName = "WebSocketAgent"
$currentDir = Get-Location

# Step 1: Download the Python script if it doesn't exist
if (-not (Test-Path $pythonScriptPath)) {
    Write-Host "Downloading Python script..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $pythonScriptUrl -OutFile $pythonScriptPath
} else {
    Write-Host "Python script already exists, skipping download" -ForegroundColor Yellow
}

# Step 2: Install websockets package
Write-Host "Installing websockets package..." -ForegroundColor Yellow
pip install websockets

# Step 3: Create startup script
Write-Host "Creating startup script..." -ForegroundColor Yellow
$startupScriptContent = @"
@echo off
REM WebSocket Agent Startup Script
cd /d "$currentDir"
powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '192.168.129.23', '8888', 'test' -WindowStyle Hidden"
"@

$startupScriptPath = Join-Path $currentDir "start_agent_startup.bat"
$startupScriptContent | Out-File -FilePath $startupScriptPath -Encoding ASCII
Write-Host "Created startup script: $startupScriptPath" -ForegroundColor Green

# Step 4: Remove existing task if it exists
Write-Host "Removing existing startup task..." -ForegroundColor Yellow
try {
    schtasks /delete /tn $taskName /f 2>$null
    Write-Host "Removed existing startup task" -ForegroundColor Green
} catch {
    # Task doesn't exist, which is fine
}

# Step 5: Install as Windows startup task
Write-Host "Installing as Windows startup task..." -ForegroundColor Yellow
$action = New-ScheduledTaskAction -Execute $startupScriptPath
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force

Write-Host "Installed startup task successfully" -ForegroundColor Green

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "The WebSocket agent will now start automatically on system startup." -ForegroundColor Green
Write-Host "You can test it by restarting your computer." -ForegroundColor Green
Write-Host "`nTo remove the startup task later, run:" -ForegroundColor Yellow
Write-Host "schtasks /delete /tn $taskName /f" -ForegroundColor Cyan

Read-Host "Press Enter to exit" 