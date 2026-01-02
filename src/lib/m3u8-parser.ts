export interface VideoVariant {
  bandwidth: number;
  resolution: string | null;
  codecs: string | null;
  url: string;
  audioGroupId: string | null;
}

export interface AudioTrack {
  groupId: string;
  name: string | null;
  language: string | null;
  url: string | null;
  default: boolean;
}

export interface Segment {
  url: string;
  duration: number;
}

export interface MasterPlaylist {
  videos: VideoVariant[];
  audios: AudioTrack[];
}

export function parseMasterPlaylist(content: string): MasterPlaylist {
  const lines = content.split('\n').map((line) => line.trim());
  const videos: VideoVariant[] = [];
  const audios: AudioTrack[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-STREAM-INF:'.length));
      const url = lines[i + 1];

      if (url && !url.startsWith('#')) {
        videos.push({
          bandwidth: parseInt(attrs['BANDWIDTH'] || '0', 10),
          resolution: attrs['RESOLUTION'] || null,
          codecs: attrs['CODECS'] || null,
          url,
          audioGroupId: attrs['AUDIO'] || null,
        });
      }
    }

    if (line.startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')) {
      const attrs = parseAttributes(line.substring('#EXT-X-MEDIA:'.length));

      audios.push({
        groupId: attrs['GROUP-ID'] || '',
        name: attrs['NAME'] || null,
        language: attrs['LANGUAGE'] || null,
        url: attrs['URI'] || null,
        default: attrs['DEFAULT'] === 'YES',
      });
    }
  }

  return { videos, audios };
}

export function parseSegmentPlaylist(content: string, baseUrl: string): Segment[] {
  const lines = content.split('\n').map((line) => line.trim());
  const segments: Segment[] = [];
  let currentDuration = 0;

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([\d.]+)/);
      if (match) {
        currentDuration = parseFloat(match[1]);
      }
    } else if (line && !line.startsWith('#')) {
      const url = resolveSegmentUrl(baseUrl, line);
      segments.push({
        url,
        duration: currentDuration,
      });
      currentDuration = 0;
    }
  }

  return segments;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([A-Z-]+)=(?:"([^"]*)"|([^,]*))/g;
  let match;

  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    attrs[key] = value;
  }

  return attrs;
}

function resolveSegmentUrl(baseUrl: string, segmentPath: string): string {
  if (segmentPath.startsWith('http://') || segmentPath.startsWith('https://')) {
    return segmentPath;
  }

  const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return base + segmentPath;
}
