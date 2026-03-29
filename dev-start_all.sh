#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Starting Agent ==="
dotnet run --project "$SCRIPT_DIR/agent/agent.csproj" -- --mode native --env dev &
AGENT_PID=$!

echo "=== Starting Control Center ==="
dotnet run --project "$SCRIPT_DIR/control_center/control_center.csproj" &
CC_PID=$!

echo ""
echo "Agent PID:          $AGENT_PID"
echo "Control Center PID: $CC_PID"
echo ""
echo "Press Ctrl+C to stop all."

trap "echo 'Shutting down...'; kill $AGENT_PID $CC_PID 2>/dev/null; wait" INT TERM

wait
