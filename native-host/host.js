#!/usr/bin/env node

import { generateSegmentsTxt, runAria2c, mergeSegments } from './downloader.js';
import { join } from 'node:path';

function readMessage() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let lengthBuffer = Buffer.alloc(4);
    let lengthRead = 0;
    let messageLength = null;
    let messageRead = 0;

    const onData = (chunk) => {
      let offset = 0;

      while (offset < chunk.length) {
        if (messageLength === null) {
          const bytesToRead = Math.min(4 - lengthRead, chunk.length - offset);
          chunk.copy(lengthBuffer, lengthRead, offset, offset + bytesToRead);
          lengthRead += bytesToRead;
          offset += bytesToRead;

          if (lengthRead === 4) {
            messageLength = lengthBuffer.readUInt32LE(0);
            if (messageLength === 0) {
              process.stdin.removeListener('data', onData);
              resolve(null);
              return;
            }
          }
        } else {
          const bytesToRead = Math.min(messageLength - messageRead, chunk.length - offset);
          chunks.push(chunk.slice(offset, offset + bytesToRead));
          messageRead += bytesToRead;
          offset += bytesToRead;

          if (messageRead === messageLength) {
            process.stdin.removeListener('data', onData);
            const messageBuffer = Buffer.concat(chunks);
            try {
              const message = JSON.parse(messageBuffer.toString('utf-8'));
              resolve(message);
            } catch (err) {
              reject(new Error(`Failed to parse message: ${err.message}`));
            }
            return;
          }
        }
      }
    };

    process.stdin.on('data', onData);
    process.stdin.once('end', () => {
      process.stdin.removeListener('data', onData);
      resolve(null);
    });
    process.stdin.once('error', reject);
  });
}

function sendMessage(message) {
  const messageStr = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageStr, 'utf-8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);
  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

async function handleDownloadSegments(data) {
  const { baseUrl, segmentPaths, outputDir, outputName } = data;

  if (!baseUrl || !segmentPaths || !outputDir) {
    throw new Error('Missing required fields: baseUrl, segmentPaths, outputDir');
  }

  const segmentsFile = join(outputDir, 'segments.txt');
  await generateSegmentsTxt(baseUrl, segmentPaths, segmentsFile);

  sendMessage({ type: 'PROGRESS', stage: 'download', progress: 0 });

  await runAria2c(segmentsFile, outputDir, (progress) => {
    sendMessage({ type: 'PROGRESS', stage: 'download', ...progress });
  });

  return { success: true, outputDir, segmentsFile };
}

async function handleMergeVideo(data) {
  const { segmentsDir, outputPath, hasAudio = true } = data;

  if (!segmentsDir || !outputPath) {
    throw new Error('Missing required fields: segmentsDir, outputPath');
  }

  sendMessage({ type: 'PROGRESS', stage: 'merge', status: 'starting' });

  const result = await mergeSegments(segmentsDir, outputPath, hasAudio);

  sendMessage({ type: 'PROGRESS', stage: 'merge', status: 'complete' });

  return result;
}

async function main() {
  while (true) {
    try {
      const message = await readMessage();

      if (message === null) {
        break;
      }

      const { type, ...data } = message;
      let response;

      switch (type) {
        case 'DOWNLOAD_SEGMENTS':
          response = await handleDownloadSegments(data);
          break;

        case 'MERGE_VIDEO':
          response = await handleMergeVideo(data);
          break;

        case 'PING':
          response = { type: 'PONG', timestamp: Date.now() };
          break;

        default:
          response = { error: `Unknown message type: ${type}` };
      }

      sendMessage({ type: 'RESPONSE', ...response });
    } catch (err) {
      sendMessage({ type: 'ERROR', error: err.message, stack: err.stack });
    }
  }
}

main().catch((err) => {
  sendMessage({ type: 'FATAL_ERROR', error: err.message });
  process.exit(1);
});
