@echo off
setlocal

set SCRIPT_DIR=%~dp0

echo === Starting Agent ===
start "Agent" dotnet run --project "%SCRIPT_DIR%agent\agent.csproj" -- --mode native --env dev

echo === Starting Control Center ===
start "Control Center" dotnet run --project "%SCRIPT_DIR%control_center\control_center.csproj"

echo === Starting Vite (Control Center UI) ===
start "Vite" /D "%SCRIPT_DIR%control_center\ClientApp" cmd /k npm run dev

echo.
echo Agent, Control Center, and Vite started in separate windows.
echo Open http://localhost:5000 for the UI (hot reload).
echo Close those windows to stop them.

endlocal
