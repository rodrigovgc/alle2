// A card cell can be a picture: a Wikimedia Commons file name
// ("Belgian road sign A13.svg", "Flag of Belgium.svg") or a direct image link.

const IMAGE_EXT = /\.(svg|png|jpe?g|gif|webp)$/i;

/**
 * Several candidate URLs for a Wikimedia file name, best first. These are the
 * fast guesses; resolveImage() below gets the guaranteed one from the API.
 */
function wikimediaGuesses(fileName) {
  const enc = encodeURIComponent(fileName.replace(/ /g, '_'));
  const thumb = (w) => `https://commons.wikimedia.org/w/thumb.php?f=${enc}&width=${w}`;
  const filePath = `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}`;
  return [thumb(400), `${filePath}?width=400`, filePath];
}

/**
 * Image URLs to try for a cell, best first, or [] when the cell is plain text.
 * A direct link is used as-is; a bare Wikimedia file name gets guesses.
 */
export function imageSources(cell = '') {
  const v = cell.trim();
  if (!v || v.includes('|')) return [];
  if (/^https?:\/\//i.test(v)) {
    const path = v.split(/[?#]/)[0];
    return IMAGE_EXT.test(path) || /upload\.wikimedia\.org/i.test(v) ? [v] : [];
  }
  if (IMAGE_EXT.test(v) && !/[\\/]/.test(v)) return wikimediaGuesses(v);
  return [];
}

/** Bare Wikimedia file name in a cell (not a direct link), else null. */
export function wikimediaFile(cell = '') {
  const v = cell.trim();
  if (!v || v.includes('|') || /^https?:\/\//i.test(v)) return null;
  return IMAGE_EXT.test(v) && !/[\\/]/.test(v) ? v : null;
}

const _resolved = new Map();

/**
 * Ask Wikimedia's API for the real thumbnail URL of a file. The API sends CORS
 * headers and returns the exact upload.wikimedia.org path, so it loads where a
 * guessed URL is blocked or 404s. Cached per file; returns null if not found.
 */
export async function resolveImage(fileName, width = 400) {
  const key = `${fileName}@${width}`;
  if (_resolved.has(key)) return _resolved.get(key);
  const title = `File:${fileName.replace(/ /g, '_')}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*`
    + `&prop=imageinfo&iiprop=url&iiurlwidth=${width}&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    const info = page?.imageinfo?.[0];
    const out = info?.thumburl || info?.url || null;
    _resolved.set(key, out);
    return out;
  } catch {
    _resolved.set(key, null);
    return null;
  }
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
