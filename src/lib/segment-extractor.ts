import { parseSegmentPlaylist } from './m3u8-parser';
import { resolveUrl } from './url-utils';

export async function extractSegments(playlistUrl: string): Promise<string[]> {
  const response = await fetch(playlistUrl);
  const content = await response.text();
  const segments = parseSegmentPlaylist(content, playlistUrl);
  return segments.map((segment) => segment.url);
}

export function generateSegmentsTxt(segments: string[]): string {
  return segments.join('\n');
}
