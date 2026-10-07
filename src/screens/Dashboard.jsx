import { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { Logo } from '../components/Icon.jsx';

/*
 * Owner-only insights at my.allecards.app/dashboard.
 * One call to dash_insights() (supabase/009_insights.sql), which returns
 * nothing unless the signed-in account is the owner (is_owner()).
 */

const RANGES = [7, 30, 90];
const SOURCE_LABEL = {
  ready_made: 'Ready-made',
  library: 'Website library',
  sheet: 'Google Sheet',
  ai_or_paste: 'AI or pasted',
  shared: 'Shared copy',
};

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-GB'));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function ago(iso) {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
const dateShort = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–');
const LANG = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;
const langName = (code) => { try { return (LANG && code && code !== '?' && LANG.of(code.split('-')[0])) || code; } catch { return code; } };
const minutes = (m) => (m == null ? '–' : m >= 90 ? `${(m / 60).toFixed(1)} h` : `${Math.round(m)} min`);

export function Dashboard() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ loading: true });

  async function load(d = days) {
    setState((s) => ({ ...s, loading: true }));
    if (!isConfigured) { setState({ noauth: true }); return; }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setState({ noauth: true }); return; }
    const { data, error } = await supabase.rpc('dash_insights', { days: d });
    if (error) setState({ error: /dash_insights/.test(error.message) ? 'missing' : error.message });
    else if (!data) setState({ notOwner: true, email: sess.session.user.email });
    else setState({ data });
  }
  useEffect(() => { document.title = 'Insights | Alle'; load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.noauth) return <Shell><p className="ins-note">Sign in to Alle first, then open this page again.</p></Shell>;
  if (state.notOwner) return <Shell><p className="ins-note">This page is only for the owner. You’re signed in as {state.email}.</p></Shell>;
  if (state.error === 'missing') return <Shell><p className="ins-note">Run <code>supabase/009_insights.sql</code> in Supabase to turn on this dashboard.</p></Shell>;
  if (state.error) return <Shell><p className="ins-note">Couldn’t load: {state.error}</p></Shell>;
  if (!state.data) return <Shell><p className="ins-note">Loading…</p></Shell>;

  const d = state.data;
  const k = d.kpis;
  return (
    <Shell
      right={(
        <>
          <div className="ins-range" role="tablist" aria-label="Period">
            {RANGES.map((r) => (
              <button key={r} type="button" role="tab" aria-selected={days === r} className={days === r ? 'is-on' : ''} onClick={() => setDays(r)}>{r} days</button>
            ))}
          </div>
          <button type="button" className="ins-refresh" onClick={() => load(days)} disabled={state.loading}>
            {state.loading ? 'Updating…' : `Updated ${ago(d.generated_at)}`}
          </button>
        </>
      )}
    >
      <section className="ins-kpis">
        <Kpi label="People" value={fmt(k.users)} sub={`+${fmt(k.users_new)} new`} now={k.users_new} prev={k.users_new_prev} spark={d.daily.map((x) => x.signups)} />
        <Kpi label="Active" value={fmt(k.active)} sub={`of ${fmt(k.users)} people`} now={k.active} prev={k.active_prev} spark={d.daily.map((x) => x.active)} />
        <Kpi label="Decks created" value={fmt(k.decks_new)} sub={`${fmt(k.decks)} in total`} now={k.decks_new} prev={k.decks_new_prev} spark={d.daily.map((x) => x.decks)} />
        <Kpi label="Cards reviewed" value={fmt(k.reviews)} sub={`${fmt(k.sessions)} sessions`} now={k.reviews} prev={k.reviews_prev} spark={d.daily.map((x) => x.reviews)} />
        <Kpi label="Study time" value={minutes(k.minutes)} sub={k.active ? `${minutes(k.minutes / k.active)} per active person` : 'timed from now on'} now={k.minutes} prev={k.minutes_prev} />
        <Kpi label="Finished sessions" value={`${pct(k.sessions, k.sessions + k.sessions_left)}%`} sub={`${fmt(k.sessions_left)} left early`} />
      </section>

      <section className="ins-grid">
        <Card title="Daily activity" wide>
          <ActivityChart daily={d.daily} />
        </Card>

        <Card title="From sign-up to habit">
          <Funnel steps={d.funnel} />
        </Card>

        <Card title="Where decks come from">
          <Bars rows={d.sources.map((s) => ({ label: SOURCE_LABEL[s.source] || s.source, n: s.decks, note: `${s.people} ${s.people === 1 ? 'person' : 'people'}` }))} />
        </Card>

        <Card title="Ready-made decks added">
          {d.ready_made.length ? <Bars rows={d.ready_made.map((r) => ({ label: r.title, n: r.people, note: 'people' }))} /> : <Empty />}
        </Card>

        <Card title="AI deck subjects">
          {d.ai_subjects.length ? <Bars rows={d.ai_subjects.map((r) => ({ label: r.subject, n: r.n }))} /> : <Empty />}
        </Card>

        <Card title="Languages">
          <Bars rows={d.languages.map((r) => ({ label: langName(r.lang), n: r.n }))} />
        </Card>

        <Card title="Study sessions">
          <div className="ins-stats">
            <Stat label="Average session" value={k.sessions ? minutes(k.minutes / (k.sessions + k.sessions_left)) : '–'} />
            <Stat label="Answers right" value={k.reviews_scored ? `${pct(k.correct, k.reviews_scored)}%` : '–'} note={k.reviews_scored ? null : 'counted from now on'} />
            <Stat label="Left early" value={fmt(k.sessions_left)} note={`of ${fmt(k.sessions + k.sessions_left)} started`} />
            <Stat label="Cards known well" value={fmt(k.cards_known)} note="in the top boxes" />
          </div>
        </Card>

        <Card title="Decks people made" wide>
          <DeckTable rows={d.recent_decks} cols={['title', 'labels', 'cards', 'source', 'who', 'created_at']} />
        </Card>

        <Card title="Most studied decks" wide>
          <DeckTable rows={d.top_decks} cols={['title', 'reviews', 'cards', 'source', 'who']} />
        </Card>

        <Card title={`People (${fmt(d.users.length)})`} wide>
          <People users={d.users} />
        </Card>

        <Card title="Website" wide>
          <p className="ins-note">Visitors, search terms and rankings live in Google Analytics and Search Console for now. They can be brought into this page later.</p>
          <div className="ins-links">
            <a href="https://analytics.google.com/" target="_blank" rel="noreferrer">Google Analytics</a>
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console</a>
          </div>
        </Card>
      </section>
    </Shell>
  );
}

function Shell({ right, children }) {
  return (
    <main className="ins">
      <header className="ins-head">
        <div className="ins-brand"><Logo /><span>Insights</span></div>
        <div className="ins-head__right">{right}</div>
      </header>
      {children}
    </main>
  );
}

function Card({ title, wide, children }) {
  return (
    <div className={`ins-card ${wide ? 'ins-card--wide' : ''}`}>
      <h2 className="ins-card__title">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="ins-stat">
      <span>{label}</span>
      <b>{value}</b>
      {note && <small>{note}</small>}
    </div>
  );
}

const Empty = () => <p className="ins-note">Nothing yet.</p>;

function Trend({ now, prev }) {
  if (now == null || prev == null) return null;
  if (!prev) return now ? <span className="ins-trend up">new</span> : null;
  if (prev < 5) return null; // percentages on tiny numbers are just noise
  const change = Math.round(((now - prev) / prev) * 100);
  if (!change) return <span className="ins-trend">±0%</span>;
  return <span className={`ins-trend ${change > 0 ? 'up' : 'down'}`}>{change > 0 ? '↑' : '↓'} {Math.abs(change)}%</span>;
}

function Spark({ values }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 120; const h = 32;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg className="ins-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Kpi({ label, value, sub, now, prev, spark }) {
  return (
    <div className="ins-kpi">
      <div className="ins-kpi__top"><span>{label}</span><Trend now={now} prev={prev} /></div>
      <div className="ins-kpi__value">{value}</div>
      <div className="ins-kpi__sub">{sub}</div>
      <Spark values={spark} />
    </div>
  );
}

function ActivityChart({ daily }) {
  const [hover, setHover] = useState(null);
  const maxR = Math.max(1, ...daily.map((x) => x.reviews));
  const maxA = Math.max(1, ...daily.map((x) => x.active));
  const W = 900; const H = 220; const pad = 28;
  const bw = (W - pad * 2) / daily.length;
  const y = (v, m) => H - pad - (v / m) * (H - pad * 2);
  const line = daily.map((x, i) => `${pad + i * bw + bw / 2},${y(x.active, maxA)}`).join(' ');
  const every = Math.ceil(daily.length / 8);
  const h = hover != null ? daily[hover] : null;
  return (
    <div className="ins-chart">
      <div className="ins-legend">
        <span><i className="sw sw--bar" /> Cards reviewed</span>
        <span><i className="sw sw--line" /> Active people</span>
        {h && <span className="ins-legend__hover">{dateShort(h.day)}: {h.reviews} reviews · {h.active} active · {h.signups} sign-ups · {h.decks} decks</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ins-chart__svg" onMouseLeave={() => setHover(null)}>
        {daily.map((x, i) => (
          <g key={x.day} onMouseEnter={() => setHover(i)}>
            <rect x={pad + i * bw} y={pad} width={bw} height={H - pad * 2} fill="transparent" />
            <rect x={pad + i * bw + bw * 0.18} y={y(x.reviews, maxR)} width={bw * 0.64} height={Math.max(0, H - pad - y(x.reviews, maxR))} rx="3" className={`bar ${hover === i ? 'is-hover' : ''}`} />
            {x.signups > 0 && <circle cx={pad + i * bw + bw / 2} cy={H - pad + 10} r="3.5" className="signup" />}
            {i % every === 0 && <text x={pad + i * bw + bw / 2} y={H - 2} textAnchor="middle" className="axis">{dateShort(x.day)}</text>}
          </g>
        ))}
        <polyline points={line} className="line" />
      </svg>
      <p className="ins-note ins-note--small">Dots under the axis mark days with new sign-ups.</p>
    </div>
  );
}

function Funnel({ steps }) {
  const top = steps[0]?.n || 0;
  return (
    <div className="ins-funnel">
      {steps.map((s) => (
        <div key={s.step} className="ins-funnel__row">
          <div className="ins-funnel__label"><span>{s.step}</span><b>{fmt(s.n)} <em>{pct(s.n, top)}%</em></b></div>
          <div className="ins-bar"><i style={{ width: `${Math.max(2, pct(s.n, top))}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="ins-bars">
      {rows.slice(0, 10).map((r) => (
        <div key={r.label} className="ins-bars__row">
          <div className="ins-funnel__label"><span>{r.label}</span><b>{fmt(r.n)}{r.note ? <em> {r.note}</em> : null}</b></div>
          <div className="ins-bar"><i style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

const COL = {
  title: ['Deck', (r) => <b>{r.title}</b>],
  labels: ['Sides', (r) => r.labels || '–'],
  cards: ['Cards', (r) => fmt(r.cards)],
  reviews: ['Reviews', (r) => fmt(r.reviews)],
  source: ['From', (r) => SOURCE_LABEL[r.source] || r.source],
  who: ['By', (r) => r.who],
  created_at: ['Created', (r) => ago(r.created_at)],
};

function DeckTable({ rows, cols }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="ins-table-wrap">
      <table className="ins-table">
        <thead><tr>{cols.map((c) => <th key={c}>{COL[c][0]}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{COL[c][1](r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const PEOPLE_COLS = [
  ['name', 'Person'], ['joined', 'Joined'], ['last_active', 'Last active'], ['active_days', 'Active days'],
  ['decks', 'Decks'], ['reviews', 'Reviews'], ['minutes', 'Study time'],
];

function People({ users }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(['last_active', -1]);
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter((u) => !needle || `${u.name} ${u.email}`.toLowerCase().includes(needle));
    const [key, dir] = sort;
    const val = (u) => (key === 'name' ? (u.name || u.email).toLowerCase()
      : ['joined', 'last_active'].includes(key) ? new Date(u[key] || 0).getTime() : Number(u[key] || 0));
    return [...list].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
  }, [users, q, sort]);
  const by = (key) => setSort(([k, d]) => [key, k === key ? -d : -1]);
  return (
    <>
      <input className="ins-search" type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="ins-table-wrap">
        <table className="ins-table ins-table--people">
          <thead>
            <tr>{PEOPLE_COLS.map(([key, label]) => (
              <th key={key}><button type="button" onClick={() => by(key)} className={sort[0] === key ? 'is-sorted' : ''}>
                {label}{sort[0] === key ? (sort[1] < 0 ? ' ↓' : ' ↑') : ''}
              </button></th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <PersonRow key={u.email} u={u} open={open === u.email} onToggle={() => setOpen(open === u.email ? null : u.email)} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PersonRow({ u, open, onToggle }) {
  return (
    <>
      <tr className={`ins-person ${open ? 'is-open' : ''}`} onClick={onToggle}>
        <td><b>{u.name || '—'}</b><small>{u.email}</small></td>
        <td>{dateShort(u.joined)}</td>
        <td>{ago(u.last_active)}</td>
        <td>{fmt(u.active_days)}</td>
        <td>{fmt(u.decks)}</td>
        <td>{fmt(u.reviews)}</td>
        <td>{minutes(u.minutes)}</td>
      </tr>
      {open && (
        <tr className="ins-person__decks">
          <td colSpan={7}>
            {u.deck_list.length ? (
              <ul>
                {u.deck_list.map((dk, i) => (
                  <li key={i}>
                    <b>{dk.title}</b>
                    <span>{dk.labels || ''}</span>
                    <span>{fmt(dk.cards)} cards</span>
                    <span>{SOURCE_LABEL[dk.source] || dk.source}</span>
                    {dk.shared && <span className="ins-pill">shared</span>}
                    <span>{dateShort(dk.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <span className="ins-note">No decks yet. Last sign-in {ago(u.last_sign_in)}.</span>}
          </td>
        </tr>
      )}
    </>
  );
}
