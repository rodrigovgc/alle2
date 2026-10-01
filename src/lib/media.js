// A card cell can be a picture: a Wikimedia Commons file name
// ("Belgian road sign A13.svg", "Flag of Belgium.svg") or a direct image link.

const IMAGE_EXT = /\.(svg|png|jpe?g|gif|webp)$/i;

/** Returns an image URL for a cell, or null when the cell is plain text. */
export function imageSrc(cell = '') {
  const v = cell.trim();
  if (!v || v.includes('|')) return null;
  if (/^https?:\/\//i.test(v)) {
    const path = v.split(/[?#]/)[0];
    return IMAGE_EXT.test(path) || /upload\.wikimedia\.org/i.test(v) ? v : null;
  }
  // A bare file name: let Wikimedia resolve it to the right file at a sensible size.
  if (IMAGE_EXT.test(v) && !/[\\/]/.test(v)) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(v.replace(/ /g, '_'))}?width=480`;
  }
  return null;
}
