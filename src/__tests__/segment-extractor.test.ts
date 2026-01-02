import { describe, it, expect } from 'vitest';
import { generateSegmentsTxt } from '../lib/segment-extractor';

describe('generateSegmentsTxt', () => {
  it('should generate one URL per line', () => {
    const segments = [
      'https://example.com/seg1.ts',
      'https://example.com/seg2.ts',
      'https://example.com/seg3.ts',
    ];

    const result = generateSegmentsTxt(segments);

    expect(result).toBe(
      'https://example.com/seg1.ts\nhttps://example.com/seg2.ts\nhttps://example.com/seg3.ts'
    );
  });

  it('should handle single segment', () => {
    const segments = ['https://example.com/only.ts'];
    const result = generateSegmentsTxt(segments);
    expect(result).toBe('https://example.com/only.ts');
  });

  it('should handle empty array', () => {
    const result = generateSegmentsTxt([]);
    expect(result).toBe('');
  });

  it('should handle segments with special characters in URL', () => {
    const segments = [
      'https://example.com/path%20with%20spaces/seg1.ts',
      'https://example.com/path?token=abc&id=123',
    ];

    const result = generateSegmentsTxt(segments);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('%20');
    expect(lines[1]).toContain('token=abc');
  });

  it('should preserve JPEG extension segments (TS disguised as JPG)', () => {
    const segments = [
      'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/1.jpg',
      'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/2.jpg',
      'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/3.jpg',
    ];

    const result = generateSegmentsTxt(segments);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0].endsWith('.jpg')).toBe(true);
  });
});
