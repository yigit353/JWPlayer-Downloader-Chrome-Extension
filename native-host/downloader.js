import { writeFile, readdir, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

export async function generateSegmentsTxt(baseUrl, segmentPaths, outputPath) {
  const urls = segmentPaths.map(segment => {
    if (segment.startsWith('http://') || segment.startsWith('https://')) {
      return segment;
    }
    return new URL(segment, baseUrl).href;
  });
  await writeFile(outputPath, urls.join('\n'), 'utf-8');
  return outputPath;
}

export function runAria2c(segmentsFile, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    const args = [
      '-c',
      '-s16',
      '-x16',
      '-j8',
      '-i', segmentsFile,
      '-d', outputDir,
      '--console-log-level=warn',
      '--summary-interval=1'
    ];

    const proc = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let lastProgress = 0;

    const parseProgress = (data) => {
      const text = data.toString();
      const match = text.match(/\((\d+)%\)/);
      if (match && onProgress) {
        const progress = parseInt(match[1], 10);
        if (progress !== lastProgress) {
          lastProgress = progress;
          onProgress({ type: 'download', progress });
        }
      }
    };

    proc.stdout.on('data', parseProgress);
    proc.stderr.on('data', parseProgress);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`aria2c exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start aria2c: ${err.message}`));
    });
  });
}

export async function mergeSegments(segmentsDir, outputPath, hasAudio = true) {
  const files = await readdir(segmentsDir);
  const segmentFiles = files
    .filter(f => f.endsWith('.ts') || f.endsWith('.jpg') || f.match(/^\d+$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  if (segmentFiles.length === 0) {
    throw new Error('No segment files found in directory');
  }

  const listPath = join(segmentsDir, 'list.txt');
  const listContent = segmentFiles.map(f => `file '${join(segmentsDir, f)}'`).join('\n');
  await writeFile(listPath, listContent, 'utf-8');

  const concatPath = join(segmentsDir, 'all_segments.ts');
  await runFFmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    concatPath
  ]);

  const audioArgs = hasAudio ? ['-c:a', 'copy'] : ['-an'];
  await runFFmpeg([
    '-i', concatPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    ...audioArgs,
    '-y',
    outputPath
  ]);

  await unlink(listPath).catch(() => {});
  await unlink(concatPath).catch(() => {});

  return { success: true, outputPath };
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });
  });
}
