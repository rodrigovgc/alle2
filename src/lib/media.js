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
    const file = v.replace(/ /g, '_');
    const enc = encodeURIComponent(file);
    // Wikimedia's thumbnail renderer returns a PNG of any SVG with CORS headers,
    // which works where the raw SVG (via Special:FilePath) is blocked.
    const thumb = (w) => `https://commons.wikimedia.org/w/thumb.php?f=${enc}&width=${w}`;
    const filePath = `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}`;
    if (/\.svg$/i.test(v)) return [thumb(320), `${filePath}?width=320`, filePath];
    return [thumb(320), `${filePath}?width=320`, filePath];
  }
  return [];
}

/** First URL to try, or null when the cell is plain text. */
export const imageSrc = (cell) => imageSources(cell)[0] ?? null;

/** Flags have white areas that disappear on a white card, so they get a frame. */
export const needsFrame = (cell = '') => /^\s*flag of /i.test(cell);

/**
 * A drawn clock instead of an image. A cell like "clock 6:30" shows an analog
 * clock at that time, so clock decks need no image files. Returns { h, m } in
 * 12-hour terms, or null.
 */
export function clockTime(cell = '') {
  const m = cell.trim().match(/^clock\s+(\d{1,2})[:.h](\d{2})$/i);
  if (!m) return null;
  let hours = Number(m[1]) % 12;
  const mins = Number(m[2]);
  if (mins > 59) return null;
  return { h: hours, m: mins };
}
