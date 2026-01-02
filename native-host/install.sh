#!/bin/bash

# Install script for JWPlayer Downloader Native Host (macOS)
#
# IMPORTANT: Before running this script:
# 1. Update com.jwplayer.downloader.json with your Chrome extension ID
#    (Replace YOUR_EXTENSION_ID with the actual ID from chrome://extensions)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_NAME="com.jwplayer.downloader"
MANIFEST_FILE="$SCRIPT_DIR/$HOST_NAME.json"
TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

echo "Installing JWPlayer Downloader Native Host..."

# Check if manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
  echo "Error: Manifest file not found: $MANIFEST_FILE"
  exit 1
fi

# Check if extension ID has been updated
if grep -q "YOUR_EXTENSION_ID" "$MANIFEST_FILE"; then
  echo "Error: Please update the extension ID in $MANIFEST_FILE"
  echo "       Replace YOUR_EXTENSION_ID with your actual Chrome extension ID"
  exit 1
fi

# Create the native messaging hosts directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Make host.js executable
chmod +x "$SCRIPT_DIR/host.js"
echo "Made host.js executable"

# Remove existing symlink if present
if [ -L "$TARGET_DIR/$HOST_NAME.json" ] || [ -f "$TARGET_DIR/$HOST_NAME.json" ]; then
  rm "$TARGET_DIR/$HOST_NAME.json"
  echo "Removed existing manifest"
fi

# Create symlink to the manifest
ln -s "$MANIFEST_FILE" "$TARGET_DIR/$HOST_NAME.json"
echo "Created symlink: $TARGET_DIR/$HOST_NAME.json -> $MANIFEST_FILE"

echo ""
echo "Installation complete!"
echo ""
echo "Requirements:"
echo "  - aria2c: brew install aria2"
echo "  - ffmpeg: brew install ffmpeg"
echo ""
echo "To verify installation, check that this file exists:"
echo "  $TARGET_DIR/$HOST_NAME.json"
