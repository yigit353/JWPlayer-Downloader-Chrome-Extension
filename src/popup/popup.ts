import { parseMasterPlaylist, VideoVariant, AudioTrack } from '../lib/m3u8-parser';
import { resolveUrl } from '../lib/url-utils';

interface CapturedStream {
  url: string;
  tabId: number;
  timestamp: number;
}

interface DownloadStatus {
  type: 'DOWNLOAD_STATUS';
  status: string;
  progress?: number;
  error?: string;
}

const streamListEl = document.getElementById('streamList') as HTMLDivElement;
const qualitySelectEl = document.getElementById('qualitySelect') as HTMLSelectElement;
const audioSelectEl = document.getElementById('audioSelect') as HTMLSelectElement;
const downloadBtnEl = document.getElementById('downloadBtn') as HTMLButtonElement;
const progressSectionEl = document.getElementById('progressSection') as HTMLDivElement;
const progressBarEl = document.getElementById('progressBar') as HTMLDivElement;
const statusTextEl = document.getElementById('statusText') as HTMLDivElement;
const cancelBtnEl = document.getElementById('cancelBtn') as HTMLButtonElement;

let selectedStreamUrl: string | null = null;
let currentVariants: VideoVariant[] = [];
let currentAudioTracks: AudioTrack[] = [];

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  const response = await chrome.runtime.sendMessage({
    type: 'GET_STREAMS',
    tabId: tab.id,
  });

  renderStreamList(response.streams || []);

  chrome.runtime.onMessage.addListener((message: DownloadStatus) => {
    if (message.type === 'DOWNLOAD_STATUS') {
      updateProgress(message);
    }
  });
}

function renderStreamList(streams: CapturedStream[]) {
  if (streams.length === 0) {
    streamListEl.innerHTML = '<div class="empty-state">No streams detected</div>';
    return;
  }

  streamListEl.innerHTML = streams
    .map(
      (stream, index) => `
      <div class="stream-item" data-url="${stream.url}" data-index="${index}">
        <div class="stream-url">${stream.url}</div>
      </div>
    `
    )
    .join('');

  streamListEl.querySelectorAll('.stream-item').forEach((item) => {
    item.addEventListener('click', () => selectStream(item as HTMLElement));
  });
}

async function selectStream(element: HTMLElement) {
  streamListEl.querySelectorAll('.stream-item').forEach((el) => el.classList.remove('selected'));
  element.classList.add('selected');

  selectedStreamUrl = element.dataset.url || null;
  if (!selectedStreamUrl) return;

  try {
    const response = await fetch(selectedStreamUrl);
    const content = await response.text();
    const { videos, audios } = parseMasterPlaylist(content);

    currentVariants = videos;
    currentAudioTracks = audios;

    updateQualitySelect(videos);
    updateAudioSelect(audios);
    downloadBtnEl.disabled = false;
  } catch (error) {
    console.error('Failed to parse playlist:', error);
  }
}

function updateQualitySelect(variants: VideoVariant[]) {
  qualitySelectEl.disabled = variants.length === 0;
  qualitySelectEl.innerHTML = variants
    .map(
      (v, i) =>
        `<option value="${i}">${v.resolution || 'Unknown'} - ${formatBitrate(v.bandwidth)}</option>`
    )
    .join('');
}

function updateAudioSelect(tracks: AudioTrack[]) {
  audioSelectEl.disabled = tracks.length === 0;
  if (tracks.length === 0) {
    audioSelectEl.innerHTML = '<option value="">Default audio</option>';
    return;
  }
  audioSelectEl.innerHTML = tracks
    .map((t, i) => `<option value="${i}">${t.name || t.language || 'Track ' + (i + 1)}</option>`)
    .join('');
}

function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`;
  }
  return `${(bps / 1000).toFixed(0)} kbps`;
}

function updateProgress(status: DownloadStatus) {
  progressSectionEl.classList.remove('hidden');

  if (status.progress !== undefined) {
    progressBarEl.style.width = `${status.progress}%`;
  }

  switch (status.status) {
    case 'fetching':
      statusTextEl.textContent = 'Fetching playlist...';
      break;
    case 'downloading':
      statusTextEl.textContent = `Downloading segments... ${status.progress || 0}%`;
      break;
    case 'merging':
      statusTextEl.textContent = 'Merging video...';
      break;
    case 'complete':
      statusTextEl.textContent = 'Download complete!';
      downloadBtnEl.disabled = false;
      cancelBtnEl.disabled = true;
      break;
    case 'error':
      statusTextEl.textContent = `Error: ${status.error}`;
      statusTextEl.classList.add('error');
      downloadBtnEl.disabled = false;
      cancelBtnEl.disabled = true;
      break;
    case 'cancelled':
      statusTextEl.textContent = 'Download cancelled';
      downloadBtnEl.disabled = false;
      cancelBtnEl.disabled = true;
      break;
  }
}

function generateOutputName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `video_${timestamp}`;
}

downloadBtnEl.addEventListener('click', async () => {
  if (!selectedStreamUrl) return;

  const selectedVariant = currentVariants[parseInt(qualitySelectEl.value)];
  const audioIndex = parseInt(audioSelectEl.value);
  const selectedAudio = !isNaN(audioIndex) ? currentAudioTracks[audioIndex] : null;

  const videoVariantUrl = resolveUrl(selectedStreamUrl, selectedVariant.url);
  const audioTrackUrl = selectedAudio?.url
    ? resolveUrl(selectedStreamUrl, selectedAudio.url)
    : null;

  downloadBtnEl.disabled = true;
  cancelBtnEl.disabled = false;
  statusTextEl.classList.remove('error');
  progressBarEl.style.width = '0%';
  progressSectionEl.classList.remove('hidden');

  await chrome.runtime.sendMessage({
    type: 'START_DOWNLOAD',
    masterUrl: selectedStreamUrl,
    videoVariantUrl,
    audioTrackUrl,
    outputName: generateOutputName(),
  });
});

cancelBtnEl.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CANCEL_DOWNLOAD' });
  cancelBtnEl.disabled = true;
});

init();
