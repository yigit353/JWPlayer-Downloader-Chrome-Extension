#!/bin/bash

LOG="/tmp/jwplayer-native-host.log"

# Write to log immediately to verify script starts
echo "=== Script started at $(date) ===" >> "$LOG"

# Set PATH to include nvm's node and homebrew
export PATH="/Users/yigit/.nvm/versions/node/v24.1.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

echo "PATH: $PATH" >> "$LOG"
echo "Node: $(which node 2>&1)" >> "$LOG"

# Change to the script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo "Working dir: $(pwd)" >> "$LOG"

# Run the host
echo "Starting node host.js..." >> "$LOG"
exec node host.js 2>> "$LOG"
