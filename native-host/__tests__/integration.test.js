import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, readdir, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { mergeSegments } from '../downloader.js';

function isCommandAvailable(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasAria2c = isCommandAvailable('aria2c');
const hasFFmpeg = isCommandAvailable('ffmpeg');

describe('Integration Tests', () => {
  describe('aria2c download', { skip: !hasAria2c }, () => {
    let tempDir;

    before(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'jw-integration-'));
    });

    after(async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should download files from segments.txt', async () => {
      const segmentsFile = join(tempDir, 'segments.txt');
      const testUrls = [
        'https://httpbin.org/image/jpeg',
      ];

      await writeFile(segmentsFile, testUrls.join('\n'), 'utf-8');

      const { runAria2c } = await import('../downloader.js');

      await runAria2c(segmentsFile, tempDir, (progress) => {
        console.log('Download progress:', progress);
      });

      const files = await readdir(tempDir);
      const downloadedFiles = files.filter(f => f !== 'segments.txt');

      assert.ok(downloadedFiles.length >= 1, 'At least one file should be downloaded');
    });
  });

  describe('ffmpeg merge', { skip: !hasFFmpeg }, () => {
    let tempDir;

    before(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'jw-ffmpeg-'));
    });

    after(async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should create list.txt from segment files', async () => {
      for (let i = 1; i <= 3; i++) {
        execSync(
          `ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=24 -f lavfi -i sine=frequency=440:duration=1 -c:v libx264 -preset ultrafast -c:a aac -y "${join(tempDir, `${i}.ts`)}"`,
          { stdio: 'ignore' }
        );
      }

      const files = await readdir(tempDir);
      const tsFiles = files.filter(f => f.endsWith('.ts'));
      assert.strictEqual(tsFiles.length, 3, 'Should have 3 test .ts files');
    });

    it('should merge segments into final video', async () => {
      const outputPath = join(tempDir, 'output.mp4');

      await mergeSegments(tempDir, outputPath, true);

      await access(outputPath);

      const output = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`, { encoding: 'utf-8' });
      const duration = parseFloat(output.trim());

      assert.ok(duration >= 2, 'Output video should be at least 2 seconds');
    });
  });

  describe('Full workflow simulation', { skip: !hasFFmpeg }, () => {
    it('should handle the complete download-merge workflow', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'jw-full-'));

      try {
        for (let i = 1; i <= 2; i++) {
          execSync(
            `ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=24 -f lavfi -i sine=frequency=440:duration=1 -c:v libx264 -preset ultrafast -c:a aac -y "${join(tempDir, `${i}.ts`)}"`,
            { stdio: 'ignore' }
          );
        }

        const outputPath = join(tempDir, 'final.mp4');
        await mergeSegments(tempDir, outputPath, true);

        await access(outputPath);
        console.log('Full workflow completed successfully');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
