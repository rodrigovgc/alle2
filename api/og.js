// my.allecards.app/api/og?code=<code>: the cover image for a shared deck's link preview.
import { ImageResponse } from '@vercel/og';
import { deckMeta } from './_deck.js';
import { coverElement } from './_cover.js';

export const config = { runtime: 'edge' };

const regular = fetch(new URL('./fonts/inter-400.woff', import.meta.url)).then((r) => r.arrayBuffer());
const bold = fetch(new URL('./fonts/inter-700.woff', import.meta.url)).then((r) => r.arrayBuffer());

export default async function handler(req) {
  const code = new URL(req.url).searchParams.get('code') || '';
  const deck = await deckMeta(code);
  return new ImageResponse(coverElement(deck), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: await regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: await bold, weight: 700, style: 'normal' },
    ],
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
