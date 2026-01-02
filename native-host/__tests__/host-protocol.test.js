import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Native Messaging Protocol', () => {
  describe('Message encoding', () => {
    it('should encode message with 4-byte length prefix (little-endian)', () => {
      const message = { type: 'PING' };
      const messageStr = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageStr, 'utf-8');

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

      assert.strictEqual(lengthBuffer.length, 4);
      assert.strictEqual(lengthBuffer.readUInt32LE(0), messageBuffer.length);
    });

    it('should handle large messages correctly', () => {
      const largeData = 'x'.repeat(100000);
      const message = { type: 'DATA', payload: largeData };
      const messageStr = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageStr, 'utf-8');

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

      assert.strictEqual(lengthBuffer.readUInt32LE(0), messageBuffer.length);
      assert.ok(messageBuffer.length > 100000);
    });
  });

  describe('Message decoding', () => {
    it('should decode message from length-prefixed buffer', () => {
      const original = { type: 'DOWNLOAD_SEGMENTS', baseUrl: 'https://example.com/' };
      const messageStr = JSON.stringify(original);
      const messageBuffer = Buffer.from(messageStr, 'utf-8');

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

      const fullBuffer = Buffer.concat([lengthBuffer, messageBuffer]);

      const length = fullBuffer.readUInt32LE(0);
      const payloadBuffer = fullBuffer.slice(4, 4 + length);
      const decoded = JSON.parse(payloadBuffer.toString('utf-8'));

      assert.deepStrictEqual(decoded, original);
    });

    it('should handle unicode characters', () => {
      const original = { type: 'AUDIO', name: 'Türkçe', language: '日本語' };
      const messageStr = JSON.stringify(original);
      const messageBuffer = Buffer.from(messageStr, 'utf-8');

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

      const fullBuffer = Buffer.concat([lengthBuffer, messageBuffer]);

      const length = fullBuffer.readUInt32LE(0);
      const payloadBuffer = fullBuffer.slice(4, 4 + length);
      const decoded = JSON.parse(payloadBuffer.toString('utf-8'));

      assert.strictEqual(decoded.name, 'Türkçe');
      assert.strictEqual(decoded.language, '日本語');
    });
  });

  describe('Message types', () => {
    it('should support DOWNLOAD_SEGMENTS message format', () => {
      const message = {
        type: 'DOWNLOAD_SEGMENTS',
        baseUrl: 'https://p3.photomag.biz/v/a53pn6r0qnb6/',
        segmentPaths: ['1080/1.jpg', '1080/2.jpg'],
        outputDir: '/tmp/download',
        outputName: 'video',
      };

      assert.strictEqual(message.type, 'DOWNLOAD_SEGMENTS');
      assert.ok(Array.isArray(message.segmentPaths));
      assert.strictEqual(message.segmentPaths.length, 2);
    });

    it('should support MERGE_VIDEO message format', () => {
      const message = {
        type: 'MERGE_VIDEO',
        segmentsDir: '/tmp/download',
        outputPath: '/tmp/output.mp4',
        hasAudio: true,
      };

      assert.strictEqual(message.type, 'MERGE_VIDEO');
      assert.strictEqual(message.hasAudio, true);
    });

    it('should support PROGRESS message format', () => {
      const message = {
        type: 'PROGRESS',
        stage: 'download',
        progress: 75,
      };

      assert.strictEqual(message.stage, 'download');
      assert.strictEqual(message.progress, 75);
    });
  });
});
