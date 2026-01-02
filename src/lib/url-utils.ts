export function resolveUrl(base: string, relative: string): string {
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }

  if (relative.startsWith('//')) {
    const protocol = base.startsWith('https') ? 'https:' : 'http:';
    return protocol + relative;
  }

  if (relative.startsWith('/')) {
    const url = new URL(base);
    return url.origin + relative;
  }

  const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
  return baseDir + relative;
}

export function extractBaseUrl(url: string): string {
  const lastSlashIndex = url.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return url;
  }
  return url.substring(0, lastSlashIndex + 1);
}
