// Local-only stand-in for the Supabase client, enabled with VITE_DEMO=true.
// Implements just the calls Alle makes, persisted to localStorage. Never used in production.

const KEY = 'alle-demo-db';
const load = () => JSON.parse(localStorage.getItem(KEY) || '{"users":{},"session":null,"decks":[],"progress":[]}');
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

const listeners = new Set();
const emit = (session) => listeners.forEach((fn) => fn('AUTH', session));

function query(table) {
  const state = { filters: [], op: 'select', payload: null, single: false, order: null };
  const api = {
    select() { return api; },
    order(col, { ascending = true } = {}) { state.order = { col, ascending }; return api; },
    eq(col, val) { state.filters.push((r) => r[col] === val); return api; },
    in(col, vals) { state.filters.push((r) => vals.includes(r[col])); return api; },
    single() { state.single = true; return api; },
    insert(row) { state.op = 'insert'; state.payload = row; return api; },
    update(patch) { state.op = 'update'; state.payload = patch; return api; },
    upsert(row) { state.op = 'upsert'; state.payload = row; return api; },
    delete() { state.op = 'delete'; return api; },
    then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); },
  };

  function run() {
    const db = load();
    const user = db.session?.user;
    if (!user) return { data: null, error: { message: 'Not signed in' } };
    const mine = (r) => r.user_id === user.id;
    const match = (r) => mine(r) && state.filters.every((f) => f(r));
    let rows = db[table] || [];
    let data;

    if (state.op === 'insert') {
      const row = { id: uid(), user_id: user.id, created_at: new Date().toISOString(), ...state.payload };
      rows.push(row); data = row;
    } else if (state.op === 'update') {
      rows = rows.map((r) => (match(r) ? { ...r, ...state.payload } : r));
      data = rows.find(match);
    } else if (state.op === 'upsert') {
      const p = state.payload;
      const i = rows.findIndex((r) => r.user_id === p.user_id && r.deck_id === p.deck_id && r.card_hash === p.card_hash);
      if (i >= 0) rows[i] = { ...rows[i], ...p }; else rows.push(p);
    } else if (state.op === 'delete') {
      const gone = rows.filter(match).map((r) => r.id);
      rows = rows.filter((r) => !match(r));
      if (table === 'decks') db.progress = db.progress.filter((p) => !gone.includes(p.deck_id));
    } else {
      data = rows.filter(match);
      if (state.order) {
        const { col, ascending } = state.order;
        data.sort((a, b) => (a[col] > b[col] ? 1 : -1) * (ascending ? 1 : -1));
      }
    }
    db[table] = rows;
    save(db);
    return { data: state.single && Array.isArray(data) ? data[0] : data ?? null, error: null };
  }
  return api;
}

export const demoClient = {
  from: query,
  auth: {
    async getSession() { return { data: { session: load().session } }; },
    async getUser() { return { data: { user: load().session?.user ?? null } }; },
    onAuthStateChange(fn) {
      listeners.add(fn);
      return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
    },
    async signUp({ email, password, options }) {
      const db = load();
      if (db.users[email]) return { data: {}, error: { message: 'An account with this email already exists.' } };
      const user = { id: uid(), email, user_metadata: { ...(options?.data || {}) } };
      // Demo only: an address containing "+confirm" behaves like a real
      // account that must confirm its email before it can sign in.
      const needsConfirm = email.includes('+confirm');
      db.users[email] = { password, user, confirmed: !needsConfirm };
      if (needsConfirm) { save(db); return { data: { session: null, user }, error: null }; }
      db.session = { user };
      save(db); emit(db.session);
      return { data: { session: db.session, user }, error: null };
    },
    async resend() { return { data: {}, error: null }; },
    async resetPasswordForEmail() { return { data: {}, error: null }; },
    // Demo: "demo-<email>" is a valid token that signs that person in.
    async verifyOtp({ token_hash }) {
      const db = load();
      const email = token_hash.startsWith('demo-') ? token_hash.slice(5) : null;
      const u = email && db.users[email];
      if (!u) return { data: {}, error: { message: 'Token has expired or is invalid' } };
      u.confirmed = true;
      db.session = { user: u.user };
      save(db); emit(db.session);
      return { data: { session: db.session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const db = load();
      const u = db.users[email];
      if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      if (u.confirmed === false) return { data: {}, error: { message: 'Email not confirmed' } };
      db.session = { user: u.user };
      save(db); emit(db.session);
      return { data: { session: db.session }, error: null };
    },
    async updateUser({ data: meta, password }) {
      const db = load();
      if (password) { db.users[db.session.user.email].password = password; save(db); return { data: { user: db.session.user }, error: null }; }
      const user = { ...db.session.user, user_metadata: { ...db.session.user.user_metadata, ...meta } };
      db.session.user = user;
      db.users[user.email].user = user;
      save(db);
      return { data: { user }, error: null };
    },
    async signOut() {
      const db = load(); db.session = null; save(db); emit(null);
      return { error: null };
    },
  },
  // Database functions (demo stand-ins)
  async rpc(name) {
    const db = load();
    if (name === 'delete_own_account') {
      const user = db.session?.user;
      if (!user) return { data: null, error: { message: 'Not signed in' } };
      db.decks = db.decks.filter((d) => d.user_id !== user.id);
      db.progress = db.progress.filter((p) => p.user_id !== user.id);
      delete db.users[user.email];
      save(db);
      return { data: null, error: null };
    }
    if (name === 'dash_insights') return { data: (typeof window !== 'undefined' && window.__DASH_SAMPLE) || null, error: null };
    if (name === 'get_shared_group') {
      if (!db.session) return { data: null, error: null };
      const g = (db.deck_groups || []).find((x) => x.share_id && x.share_id === arguments[1]?.sid);
      return { data: g ? { title: g.title, decks: db.decks.filter((d) => d.group_id === g.id) } : null, error: null };
    }
    if (name === 'get_shared_deck') {
      if (!db.session) return { data: [], error: null }; // signed-in only, like the real one
      const d = db.decks.find((x) => x.share_id && x.share_id === arguments[1]?.sid);
      return { data: d ? [d] : [], error: null };
    }
    return { data: [], error: null };
  },
};
