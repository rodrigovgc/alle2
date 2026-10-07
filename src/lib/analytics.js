import { supabase } from './supabase.js';

/**
 * Record a lightweight event. No card content, no free text: just a name and a
 * few low-cardinality properties (source, subject, language, light/dark…).
 * Fire-and-forget; analytics must never break the app.
 */
export function track(name, props = {}) {
  try {
    if (!supabase?.from) return;
    supabase.from('events').insert({ name, props }).then(() => {}, () => {});
  } catch { /* ignore */ }
}

/** Owner-only dashboard reads, via the gated functions in 005_analytics.sql. */
