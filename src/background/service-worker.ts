import { parseSegmentPlaylist } from '../lib/m3u8-parser';

interface CapturedStream {
  url: string;
  tabId: number;
  timestamp: number;
}

interface DownloadRequest {
  masterUrl: string;
  videoVariantUrl: string;
  audioTrackUrl: string | null;
  outputName: string;
}

interface NativeMessage {
  type: string;
  progress?: number;
  status?: string;
  error?: string;
}

const capturedStreams: Map<number, CapturedStream[]> = new Map();
const NATIVE_HOST_NAME = 'com.jwplayer.downloader';

let nativePort: chrome.runtime.Port | null = null;

function connectNativeHost(): chrome.runtime.Port {
  if (nativePort) {
    return nativePort;
  }

  nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

  nativePort.onMessage.addListener((message: NativeMessage) => {
    if (message.type === 'DOWNLOAD_STATUS') {
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_STATUS',
        progress: message.progress,
        status: message.status,
        error: message.error,
      });
    }
  });

  nativePort.onDisconnect.addListener(() => {
    nativePort = null;
    const error = chrome.runtime.lastError?.message;
    if (error) {
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_STATUS',
        status: 'error',
        error: `Native host disconnected: ${error}`,
      });
    }
  });

  return nativePort;
}

async function fetchSegments(playlistUrl: string): Promise<string[]> {
  const response = await fetch(playlistUrl);
  const content = await response.text();
  const segments = parseSegmentPlaylist(content, playlistUrl);
  return segments.map((s) => s.url);
}

async function handleStartDownload(request: DownloadRequest): Promise<void> {
  try {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_STATUS',
      status: 'fetching',
      progress: 0,
    });

    const videoSegments = await fetchSegments(request.videoVariantUrl);
    let audioSegments: string[] = [];

    if (request.audioTrackUrl) {
      audioSegments = await fetchSegments(request.audioTrackUrl);
    }

    const port = connectNativeHost();

    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_STATUS',
      status: 'downloading',
      progress: 0,
    });

    port.postMessage({
      type: 'DOWNLOAD_SEGMENTS',
      videoSegments,
      audioSegments,
      outputName: request.outputName,
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_STATUS',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('.m3u8')) {
      const tabId = details.tabId;
      if (tabId < 0) return;

      const streams = capturedStreams.get(tabId) || [];
      const exists = streams.some((s) => s.url === details.url);

      if (!exists) {
        streams.push({
          url: details.url,
          tabId,
          timestamp: Date.now(),
        });
        capturedStreams.set(tabId, streams);

        chrome.storage.local.set({ [`streams_${tabId}`]: streams });
      }
    }
  },
  { urls: ['<all_urls>'] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  capturedStreams.delete(tabId);
  chrome.storage.local.remove(`streams_${tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STREAMS') {
    const tabId = message.tabId;
    const streams = capturedStreams.get(tabId) || [];
    sendResponse({ streams });
    return true;
  }

  if (message.type === 'CLEAR_STREAMS') {
    const tabId = message.tabId;
    capturedStreams.delete(tabId);
    chrome.storage.local.remove(`streams_${tabId}`);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'START_DOWNLOAD') {
    handleStartDownload(message as DownloadRequest);
    sendResponse({ started: true });
    return true;
  }

  if (message.type === 'CANCEL_DOWNLOAD') {
    if (nativePort) {
      nativePort.postMessage({ type: 'CANCEL_DOWNLOAD' });
    }
    sendResponse({ cancelled: true });
    return true;
  }

  return false;
});
