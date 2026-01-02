import { describe, it, expect } from 'vitest';
import { parseMasterPlaylist, parseSegmentPlaylist } from '../lib/m3u8-parser';

describe('parseMasterPlaylist', () => {
  const realMasterPlaylist = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio0",NAME="Türkçe",LANGUAGE="tr",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",URI="audio-tr-1.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio0",NAME="English",LANGUAGE="en",AUTOSELECT=NO,DEFAULT=NO,CHANNELS="2",URI="audio-en-2.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1270077,RESOLUTION=1136x480,FRAME-RATE=23.974,CODECS="avc1.640020,mp4a.40.2",AUDIO="audio0"
720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2673569,RESOLUTION=1920x812,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio0"
1080.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=75705,RESOLUTION=1136x480,CODECS="avc1.640020",URI="iframes-720.m3u8"
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=125990,RESOLUTION=1920x812,CODECS="avc1.640028",URI="iframes-1080.m3u8"`;

  it('should parse video variants with resolution and bandwidth', () => {
    const result = parseMasterPlaylist(realMasterPlaylist);

    expect(result.videos).toHaveLength(2);
    expect(result.videos[0]).toEqual({
      bandwidth: 1270077,
      resolution: '1136x480',
      codecs: 'avc1.640020,mp4a.40.2',
      url: '720.m3u8',
      audioGroupId: 'audio0',
    });
    expect(result.videos[1]).toEqual({
      bandwidth: 2673569,
      resolution: '1920x812',
      codecs: 'avc1.640028,mp4a.40.2',
      url: '1080.m3u8',
      audioGroupId: 'audio0',
    });
  });

  it('should parse audio tracks with language and default flag', () => {
    const result = parseMasterPlaylist(realMasterPlaylist);

    expect(result.audios).toHaveLength(2);
    expect(result.audios[0]).toEqual({
      groupId: 'audio0',
      name: 'Türkçe',
      language: 'tr',
      url: 'audio-tr-1.m3u8',
      default: true,
    });
    expect(result.audios[1]).toEqual({
      groupId: 'audio0',
      name: 'English',
      language: 'en',
      url: 'audio-en-2.m3u8',
      default: false,
    });
  });

  it('should handle playlist without audio tracks', () => {
    const videoOnlyPlaylist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
360p.m3u8`;

    const result = parseMasterPlaylist(videoOnlyPlaylist);

    expect(result.videos).toHaveLength(1);
    expect(result.audios).toHaveLength(0);
  });

  it('should handle empty content', () => {
    const result = parseMasterPlaylist('');

    expect(result.videos).toHaveLength(0);
    expect(result.audios).toHaveLength(0);
  });

  it('should handle playlist with multiple audio groups', () => {
    const multiGroupPlaylist = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="stereo",NAME="Stereo",LANGUAGE="en",DEFAULT=YES,URI="stereo.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="surround",NAME="Surround",LANGUAGE="en",DEFAULT=NO,URI="surround.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000,AUDIO="stereo"
video.m3u8`;

    const result = parseMasterPlaylist(multiGroupPlaylist);

    expect(result.audios).toHaveLength(2);
    expect(result.audios[0].groupId).toBe('stereo');
    expect(result.audios[1].groupId).toBe('surround');
  });
});

describe('parseSegmentPlaylist', () => {
  const baseUrl = 'https://p3.photomag.biz/v/a53pn6r0qnb6/1080.m3u8';

  const segmentPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.010000,
1080/1.jpg
#EXTINF:10.010000,
1080/2.jpg
#EXTINF:9.926000,
1080/3.jpg
#EXT-X-ENDLIST`;

  it('should parse segments with correct durations', () => {
    const segments = parseSegmentPlaylist(segmentPlaylist, baseUrl);

    expect(segments).toHaveLength(3);
    expect(segments[0].duration).toBeCloseTo(10.01);
    expect(segments[1].duration).toBeCloseTo(10.01);
    expect(segments[2].duration).toBeCloseTo(9.926);
  });

  it('should resolve relative segment URLs to absolute', () => {
    const segments = parseSegmentPlaylist(segmentPlaylist, baseUrl);

    expect(segments[0].url).toBe('https://p3.photomag.biz/v/a53pn6r0qnb6/1080/1.jpg');
    expect(segments[1].url).toBe('https://p3.photomag.biz/v/a53pn6r0qnb6/1080/2.jpg');
    expect(segments[2].url).toBe('https://p3.photomag.biz/v/a53pn6r0qnb6/1080/3.jpg');
  });

  it('should handle .ts segments', () => {
    const tsPlaylist = `#EXTM3U
#EXTINF:6.000,
segment001.ts
#EXTINF:6.000,
segment002.ts`;

    const segments = parseSegmentPlaylist(tsPlaylist, 'https://example.com/hls/playlist.m3u8');

    expect(segments).toHaveLength(2);
    expect(segments[0].url).toBe('https://example.com/hls/segment001.ts');
  });

  it('should handle absolute segment URLs', () => {
    const absolutePlaylist = `#EXTM3U
#EXTINF:5.0,
https://cdn.example.com/seg1.ts`;

    const segments = parseSegmentPlaylist(absolutePlaylist, 'https://example.com/master.m3u8');

    expect(segments[0].url).toBe('https://cdn.example.com/seg1.ts');
  });

  it('should handle empty playlist', () => {
    const segments = parseSegmentPlaylist('#EXTM3U\n#EXT-X-ENDLIST', baseUrl);

    expect(segments).toHaveLength(0);
  });
});
