import { useEffect, useState } from 'react';
import { loadDashboard } from '../lib/analytics.js';
import { supabase, isConfigured } from '../lib/supabase.js';

/*
 * Owner-only usage dashboard at /dashboard. Every number is an aggregate from
 * Supabase views gated by is_owner() — no way to see who did what. If you're
 * not the owner, the views return nothing and the page says so.
 */
export function Dashboard() {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    if (!isConfigured) { setState({ loading: false, noauth: true }); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setState({ loading: false, noauth: true }); return; }
      try { setState({ loading: false, data: await loadDashboard() }); }
      catch (e) { setState({ loading: false, error: e.message }); }
    });
  }, []);

  if (state.loading) return <main className="dash"><p className="dash__muted">Loading…</p></main>;
  if (state.noauth) return <main className="dash"><p className="dash__muted">Sign in to the app first, then open this page.</p></main>;
  const d = state.data;
  if (!d || !d.overview) {
    return (
      <main className="dash">
        <h1 className="dash__title">Dashboard</h1>
        <p className="dash__muted">No data, or this account isn’t the owner. Set your email in <code>supabase/005_analytics.sql</code> and run it.</p>
      </main>
    );
  }

  const o = d.overview;
  const f = d.funnel || {};
  const pct = (n) => (f.signed_up ? Math.round((n / f.signed_up) * 100) : 0);
  const maxReviews = Math.max(1, ...d.activity.map((a) => a.reviews));
  const langCounts = tally(d.events.filter((e) => e.name === 'deck_added' && e.props?.lang), (e) => e.props.lang, (e) => e.n);
  const subjCounts = tally(d.events.filter((e) => e.name === 'ai_deck_created'), (e) => e.props?.subject || 'other', (e) => e.n);
  const themeCounts = tally(d.events.filter((e) => e.name === 'theme_set'), (e) => e.props?.pref || 'light', (e) => e.n);

  return (
    <main className="dash">
      <h1 className="dash__title">Dashboard</h1>
      <p className="dash__muted">Aggregate usage. No personal data.</p>

      <section className="dash__cards">
        <Stat label="Users" value={o.users} />
        <Stat label="Decks" value={o.decks} />
        <Stat label="Active · 14 days" value={o.active_14d} />
        <Stat label="Ready-made added" value={o.ready_made_decks} />
        <Stat label="From Google Sheets" value={o.sheet_decks} />
        <Stat label="From AI / paste" value={o.ai_or_pasted_decks} />
      </section>

      <Panel title="Activation funnel">
        <Bar label="Signed up" n={f.signed_up} total={f.signed_up} />
        <Bar label="Made own deck" n={f.made_own_deck} pctText={`${pct(f.made_own_deck)}%`} total={f.signed_up} />
        <Bar label="Imported a sheet" n={f.imported_sheet} pctText={`${pct(f.imported_sheet)}%`} total={f.signed_up} />
        <Bar label="Created with AI" n={f.created_ai} pctText={`${pct(f.created_ai)}%`} total={f.signed_up} />
      </Panel>

      <div className="dash__two">
        <Panel title="Ready-made decks">
          {d.readyMade.length ? d.readyMade.map((r) => <Row key={r.title} label={r.title} value={r.adds} />) : <Empty />}
        </Panel>
        <Panel title="AI deck subjects">
          {subjCounts.length ? subjCounts.map((r) => <Row key={r.key} label={r.key} value={r.n} />) : <Empty />}
        </Panel>
      </div>

      <div className="dash__two">
        <Panel title="Languages learned">
          {langCounts.length ? langCounts.map((r) => <Row key={r.key} label={r.key} value={r.n} />) : <Empty />}
        </Panel>
        <Panel title="Appearance chosen">
          {themeCounts.length ? themeCounts.map((r) => <Row key={r.key} label={r.key} value={r.n} />) : <Empty />}
        </Panel>
      </div>

      <Panel title="Reviews · last 14 days">
        <div className="dash__spark">
          {d.activity.length ? d.activity.map((a) => (
            <span key={a.day} className="dash__bar" style={{ height: `${Math.max(4, (a.reviews / maxReviews) * 100)}%` }} title={`${a.day}: ${a.reviews} reviews, ${a.people} people`} />
          )) : <Empty />}
        </div>
      </Panel>
    </main>
  );
}

function tally(rows, keyOf, countOf) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r); if (!k) continue;
    m.set(k, (m.get(k) || 0) + (countOf ? countOf(r) : 1));
  }
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
}

const Stat = ({ label, value }) => (
  <div className="dash__stat"><span className="dash__stat-value">{value ?? 0}</span><span className="dash__stat-label">{label}</span></div>
);
const Panel = ({ title, children }) => (
  <section className="dash__panel"><h2 className="dash__panel-title">{title}</h2>{children}</section>
);
const Row = ({ label, value }) => (
  <div className="dash__row"><span>{label}</span><span className="dash__row-n">{value}</span></div>
);
const Bar = ({ label, n, total, pctText }) => (
  <div className="dash__funnel">
    <div className="dash__funnel-head"><span>{label}</span><span className="dash__row-n">{n ?? 0}{pctText ? ` · ${pctText}` : ''}</span></div>
    <div className="dash__track"><span className="dash__fill" style={{ width: `${total ? ((n || 0) / total) * 100 : 0}%` }} /></div>
  </div>
);
const Empty = () => <p className="dash__muted">No data yet.</p>;
