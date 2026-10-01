// A card cell can be a picture: a Wikimedia Commons file name
// ("Belgian road sign A13.svg", "Flag of Belgium.svg") or a direct image link.

const IMAGE_EXT = /\.(svg|png|jpe?g|gif|webp)$/i;

/**
 * Image URLs to try for a cell, best first, or [] when the cell is plain text.
 * For Wikimedia file names: a resized copy first (small and fast), then the
 * original file, because resizing occasionally fails for some files.
 */
export function imageSources(cell = '') {
  const v = cell.trim();
  if (!v || v.includes('|')) return [];
  if (/^https?:\/\//i.test(v)) {
    const path = v.split(/[?#]/)[0];
    return IMAGE_EXT.test(path) || /upload\.wikimedia\.org/i.test(v) ? [v] : [];
  }
  if (IMAGE_EXT.test(v) && !/[\\/]/.test(v)) {
    const base = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(v.replace(/ /g, '_'))}`;
    return [`${base}?width=320`, base];
  }
  return [];
}

/** First URL to try, or null when the cell is plain text. */
export const imageSrc = (cell) => imageSources(cell)[0] ?? null;

/** Flags have white areas that disappear on a white card, so they get a frame. */
export const needsFrame = (cell = '') => /^\s*flag of /i.test(cell);
