// my.allecards.app/s/<code>: the address people share.
// Preview bots (WhatsApp, iMessage, Slack…) read this page's tags to show the
// deck's cover; people are sent straight on to the app, which offers to add it.
import { deckMeta, isCode } from './_deck.js';

export const config = { runtime: 'edge' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const origin = `${url.protocol}//${url.host}`;
  const app = `${origin}/?share=${encodeURIComponent(code)}`;
  if (!isCode(code)) return Response.redirect(`${origin}/`, 302);

  const deck = await deckMeta(code);
  const title = deck ? `${deck.title} · Alle` : 'A flashcard deck on Alle';
  const labels = deck && deck.front_label && deck.back_label ? `${deck.front_label} → ${deck.back_label}, ` : '';
  const desc = deck
    ? `A flashcard deck shared with you: ${labels}${deck.card_count} ${deck.card_count === 1 ? 'card' : 'cards'}. Add it to Alle and start learning.`
    : 'Open Alle to add this deck and start learning.';
  const image = `${origin}/api/og?code=${encodeURIComponent(code)}`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Alle">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(`${origin}/s/${code}`)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(app)}">
</head><body><script>location.replace(${JSON.stringify(app)})</script>
<p><a href="${esc(app)}">Open this deck in Alle</a></p></body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' },
  });
}
