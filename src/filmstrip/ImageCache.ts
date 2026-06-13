/**
 * Module-level image cache for filmstrip assets.
 *
 * Loaded images are cached by path so that multiple Konva components
 * sharing the same filmstrip file do not trigger redundant network/disk reads.
 */

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Synchronously retrieve a previously cached image, or undefined.
 */
export function getCachedImage(path: string): HTMLImageElement | undefined {
  return imageCache.get(path);
}

/**
 * Asynchronously load (and cache) an image from a local file path or URL.
 *
 * Handles both `file://` prefixed paths and raw paths. If the image is
 * already cached the promise resolves immediately.
 */
export function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const cached = imageCache.get(path);
    if (cached) {
      resolve(cached);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(path, img);
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${path}`));
    };

    // Normalise path: if it doesn't look like a URL, prefix with file://
    img.src = path.startsWith('file://') || path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `file://${path}`;
  });
}

/**
 * Preload an image into the cache without waiting for the result
 * (fire-and-forget). Useful for background loading.
 */
export function preloadImage(path: string): void {
  if (imageCache.has(path)) return;
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { imageCache.set(path, img); };
  img.src = path.startsWith('file://') || path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `file://${path}`;
}

/**
 * Remove a single entry from the cache.
 */
export function removeCachedImage(path: string): void {
  imageCache.delete(path);
}

/**
 * Clear the entire image cache.
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Try common filmstrip frame counts that divide evenly into the image height.
 * Returns the best match or undefined if no clean division is found.
 */
const COMMON_FRAME_COUNTS = [2, 3, 4, 5, 8, 10, 12, 16, 20, 24, 30, 32, 48, 50, 60, 64, 72, 100, 128];

export function detectFrameCount(imageHeight: number): {
  frameCount: number;
  frameHeight: number;
  exact: boolean;
} {
  // Prefer the highest even-division count
  for (const count of [...COMMON_FRAME_COUNTS].reverse()) {
    if (imageHeight % count === 0) {
      return { frameCount: count, frameHeight: imageHeight / count, exact: true };
    }
  }

  // Fallback: assume 100px per frame as a reasonable default
  const guess = Math.max(2, Math.round(imageHeight / 100));
  const frameHeight = Math.floor(imageHeight / guess);
  const remainder = imageHeight - frameHeight * guess;
  return {
    frameCount: guess,
    frameHeight,
    exact: remainder === 0,
  };
}
