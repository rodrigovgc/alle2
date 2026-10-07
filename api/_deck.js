// Shared by the share page and the cover image: look up a shared deck's cover.
const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const isCode = (c) => /^[0-9a-f-]{36}$/i.test(c || '');

export async function deckMeta(code) {
  if (!isCode(code) || !URL_ || !KEY) return null;
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/get_shared_deck_meta`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: code }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch { return null; }
}
