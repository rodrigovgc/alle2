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
export async function loadDashboard() {
  const call = (fn) => supabase.rpc(fn).then(({ data, error }) => (error ? [] : data || []));
  const [overview, funnel, readyMade, events, activity] = await Promise.all([
    call('dash_overview'), call('dash_funnel'), call('dash_ready_made'),
    call('dash_events'), call('dash_activity'),
  ]);
  return { overview: overview[0] || null, funnel: funnel[0] || null, readyMade, events, activity };
}
