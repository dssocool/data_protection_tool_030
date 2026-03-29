@echo off
setlocal

set SCRIPT_DIR=%~dp0

echo === Starting Agent ===
start "Agent" dotnet run --project "%SCRIPT_DIR%agent\agent.csproj" -- --mode native --env dev

echo === Starting Control Center ===
start "Control Center" dotnet run --project "%SCRIPT_DIR%control_center\control_center.csproj"

echo.
echo Agent and Control Center started in separate windows.
echo Close those windows to stop them.

endlocal
