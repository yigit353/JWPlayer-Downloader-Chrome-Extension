import { describe, it, expect } from 'vitest';
import { resolveUrl, extractBaseUrl } from '../lib/url-utils';

describe('resolveUrl', () => {
  const baseUrl = 'https://example.com/path/to/playlist.m3u8';

  it('should return absolute URL unchanged', () => {
    const absoluteUrl = 'https://cdn.example.com/video.ts';
    expect(resolveUrl(baseUrl, absoluteUrl)).toBe(absoluteUrl);
  });

  it('should handle http:// URLs', () => {
    const httpUrl = 'http://cdn.example.com/video.ts';
    expect(resolveUrl(baseUrl, httpUrl)).toBe(httpUrl);
  });

  it('should resolve protocol-relative URLs', () => {
    expect(resolveUrl('https://example.com/path', '//cdn.example.com/video.ts')).toBe(
      'https://cdn.example.com/video.ts'
    );
    expect(resolveUrl('http://example.com/path', '//cdn.example.com/video.ts')).toBe(
      'http://cdn.example.com/video.ts'
    );
  });

  it('should resolve root-relative URLs', () => {
    expect(resolveUrl(baseUrl, '/absolute/path/video.ts')).toBe(
      'https://example.com/absolute/path/video.ts'
    );
  });

  it('should resolve relative URLs', () => {
    expect(resolveUrl(baseUrl, 'segment.ts')).toBe('https://example.com/path/to/segment.ts');
    expect(resolveUrl(baseUrl, '1080/1.jpg')).toBe('https://example.com/path/to/1080/1.jpg');
  });

  it('should handle base URL with trailing slash', () => {
    const baseWithSlash = 'https://example.com/path/to/';
    expect(resolveUrl(baseWithSlash, 'video.ts')).toBe('https://example.com/path/to/video.ts');
  });
});

describe('extractBaseUrl', () => {
  it('should extract base URL from full URL', () => {
    expect(extractBaseUrl('https://example.com/path/to/file.m3u8')).toBe(
      'https://example.com/path/to/'
    );
  });

  it('should handle URL with only domain', () => {
    expect(extractBaseUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('should handle URL with query parameters', () => {
    expect(extractBaseUrl('https://example.com/path/file.m3u8?token=abc')).toBe(
      'https://example.com/path/'
    );
  });

  it('should handle URL ending with slash', () => {
    expect(extractBaseUrl('https://example.com/path/')).toBe('https://example.com/path/');
  });

  it('should handle deeply nested paths', () => {
    expect(extractBaseUrl('https://p3.photomag.biz/v/a53pn6r0qnb6/1080.m3u8')).toBe(
      'https://p3.photomag.biz/v/a53pn6r0qnb6/'
    );
  });
});
