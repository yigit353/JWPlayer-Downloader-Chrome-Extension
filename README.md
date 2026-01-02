# JWPlayer Downloader Chrome Extension

A Chrome extension to detect and download m3u8/HLS streams from JWPlayer. Automatically captures stream URLs, downloads segments in parallel with `aria2c`, and merges them with `ffmpeg`.

## Features

- 🔍 Automatically detects m3u8 playlists on any page
- 📺 Supports multiple video qualities (720p, 1080p, etc.)
- 🔊 Supports multiple audio tracks (different languages)
- ⚡ Parallel segment download with aria2c (16 connections)
- 🎬 Automatic video merging with ffmpeg
- 📦 Handles non-standard HLS (MPEG-TS segments disguised as .jpg)

## Prerequisites

Install the required tools via Homebrew:

```bash
brew install aria2 ffmpeg
```

## Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test

# Run native host tests
npm run test:native
```

## Load Extension in Chrome

1. Run `npm run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `dist` folder
5. Copy the Extension ID shown under the extension name

## Install Native Messaging Host

The native host allows the extension to run aria2c and ffmpeg commands:

1. Edit `native-host/com.jwplayer.downloader.json`:
   - Replace `YOUR_EXTENSION_ID` with your actual extension ID from Chrome

2. Run the install script:
   ```bash
   cd native-host
   chmod +x install.sh
   ./install.sh
   ```

## Usage

1. Navigate to a page with a JWPlayer video
2. Play the video briefly (to trigger m3u8 request)
3. Click the extension icon
4. Select the detected stream
5. Choose video quality and audio track
6. Click "Download"

## How It Works

```
Browser detects m3u8 → Extension parses playlist → Native host runs:
  1. aria2c downloads all segments in parallel
  2. ffmpeg concatenates segments into .ts
  3. ffmpeg encodes to final .mp4
```

The workflow handles the quirky HLS format where segments are MPEG-TS files with `.jpg` extensions.

## Project Structure

```
├── src/
│   ├── background/
│   │   └── service-worker.ts   # Captures m3u8 requests
│   ├── popup/
│   │   ├── popup.html          # Extension popup UI
│   │   └── popup.ts            # Popup logic
│   ├── lib/
│   │   ├── m3u8-parser.ts      # M3U8 playlist parser
│   │   ├── url-utils.ts        # URL utilities
│   │   └── segment-extractor.ts # Segment URL extraction
│   ├── __tests__/              # Unit tests (vitest)
│   └── manifest.json           # Extension manifest
├── native-host/
│   ├── host.js                 # Native messaging host
│   ├── downloader.js           # aria2c/ffmpeg runner
│   ├── __tests__/              # Integration tests
│   └── install.sh              # macOS installer
└── dist/                       # Built extension
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build the extension |
| `npm run lint` | Type check with TypeScript |
| `npm test` | Run unit tests |
| `npm run test:native` | Run native host tests |
| `npm run test:all` | Run all tests |

## Manual Download (without extension)

If you want to download manually from the command line:

```bash
# 1. Parse the m3u8 and create segments.txt
BASE="https://p3.photomag.biz/v/a53pn6r0qnb6/"
grep -E '^[0-9]+/.*\.(jpg|ts)$' 1080.m3u8 | sed "s#^#${BASE}#" > segments.txt

# 2. Download segments in parallel
aria2c -c -s16 -x16 -j8 -i segments.txt

# 3. Create concat list
ls *.jpg | sort -V | sed "s/^/file '/; s/$/'/" > list.txt

# 4. Concatenate segments
ffmpeg -f concat -safe 0 -i list.txt -c copy all_segments.ts

# 5. Encode to MP4
ffmpeg -i all_segments.ts -c:v libx264 -preset veryfast -crf 18 -c:a copy output.mp4
```

## License

MIT
