import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSegmentsTxt } from '../downloader.js';

describe('generateSegmentsTxt', () => {
  let tempDir;

  it('should write correct URLs to file with relative paths', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jw-test-'));
    const outputPath = join(tempDir, 'segments.txt');
    const baseUrl = 'https://p3.photomag.biz/v/a53pn6r0qnb6/';
    const segments = ['1080/1.jpg', '1080/2.jpg', '1080/3.jpg'];

    await generateSegmentsTxt(baseUrl, segments, outputPath);

    const content = await readFile(outputPath, 'utf-8');
    const lines = content.split('\n');

    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], 'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/1.jpg');
    assert.strictEqual(lines[1], 'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/2.jpg');
    assert.strictEqual(lines[2], 'https://p3.photomag.biz/v/a53pn6r0qnb6/1080/3.jpg');

    await rm(tempDir, { recursive: true });
  });

  it('should handle absolute segment URLs', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jw-test-'));
    const outputPath = join(tempDir, 'segments.txt');
    const baseUrl = 'https://example.com/';
    const segments = [
      'https://cdn.example.com/seg1.ts',
      'https://cdn.example.com/seg2.ts',
    ];

    await generateSegmentsTxt(baseUrl, segments, outputPath);

    const content = await readFile(outputPath, 'utf-8');
    const lines = content.split('\n');

    assert.strictEqual(lines[0], 'https://cdn.example.com/seg1.ts');
    assert.strictEqual(lines[1], 'https://cdn.example.com/seg2.ts');

    await rm(tempDir, { recursive: true });
  });

  it('should handle base URL without trailing slash', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jw-test-'));
    const outputPath = join(tempDir, 'segments.txt');
    const baseUrl = 'https://example.com/path/to/playlist.m3u8';
    const segments = ['segment1.ts', 'segment2.ts'];

    await generateSegmentsTxt(baseUrl, segments, outputPath);

    const content = await readFile(outputPath, 'utf-8');
    const lines = content.split('\n');

    assert.strictEqual(lines[0], 'https://example.com/path/to/segment1.ts');

    await rm(tempDir, { recursive: true });
  });

  it('should handle empty segments array', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jw-test-'));
    const outputPath = join(tempDir, 'segments.txt');

    await generateSegmentsTxt('https://example.com/', [], outputPath);

    const content = await readFile(outputPath, 'utf-8');
    assert.strictEqual(content, '');

    await rm(tempDir, { recursive: true });
  });
});
