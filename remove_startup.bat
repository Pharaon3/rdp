@echo off
echo Removing WebSocket Agent from Windows Startup...

REM Remove the startup task
echo Removing startup task...
schtasks /delete /tn WebSocketAgent /f

if %errorlevel% equ 0 (
    echo Successfully removed WebSocket Agent from startup.
) else (
    echo No startup task found or failed to remove.
)

REM Optionally remove the startup script
if exist "start_agent_startup.bat" (
    echo Removing startup script...
    del "start_agent_startup.bat"
    echo Startup script removed.
)

echo.
echo WebSocket Agent has been removed from startup.
echo The agent will no longer start automatically on system boot.
echo.
pause 