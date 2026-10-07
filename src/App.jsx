import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import * as api from './lib/api.js';
import { fetchDeckFromUrl } from './lib/csv.js';
import { SAMPLE_DECKS, LIBRARY } from './lib/sampleDeck.js';
import { answerMode } from './lib/srs.js';
import { pickDeckLook } from './styles/tokens.js';
import { track } from './lib/analytics.js';
import { buildSession, collectCards, schedule } from './lib/srs.js';
import { Auth, NewPassword } from './screens/Auth.jsx';
import { handleEmailLink } from './lib/emailLink.js';
import { setPageMeta } from './lib/pageMeta.js';
import { readIntent, resolveIntent, clearIntent } from './lib/intent.js';
import { DeckPreview } from './components/DeckCard.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Home } from './screens/Home.jsx';
import { Study } from './screens/Study.jsx';
import { Done } from './screens/Done.jsx';
import { Sheet, SheetActions } from './components/Sheet.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Button } from './components/Button.jsx';
import { motion } from 'framer-motion';


// Where a new deck came from, as stored on the deck (for the dashboard).
const SOURCES = { ready_made: 'ready_made', library: 'library', sheet: 'sheet', ai_or_paste: 'ai_or_paste', shared: 'shared' };

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [linkNotice, setLinkNotice] = useState('');
  const [intentTitle, setIntentTitle] = useState('');
  useEffect(() => {
    const intent = readIntent();
    if (!intent) return;
    // Shared decks can only be read once signed in, so name ready-made ones only.
    if (intent.type === 'share') { setIntentTitle('__shared__'); return; }
    resolveIntent(intent).then((r) => r && setIntentTitle(r.title)).catch(() => {});
  }, []);
  const [choosingPassword, setChoosingPassword] = useState(false);

  useEffect(() => {
    if (!isConfigured) { setUser(null); return undefined; }
    let alive = true;
    (async () => {
      // An email link? Finish it first (confirm, change email or reset password).
      const link = await handleEmailLink();
      if (!alive) return;
      if (link?.error) {
        setLinkNotice('That link has expired or was already used. Sign in, or ask for a new email.');
      } else if (link?.type === 'recovery') {
        setChoosingPassword(true);
      }
      const { data } = await supabase.auth.getSession();
      if (alive) setUser(data.session?.user ?? null);
    })();
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  if (user === undefined) return <div className="boot" aria-busy="true" />;
  if (!user) {
    return (
      <Auth notice={linkNotice || (
        intentTitle === '__shared__' ? 'Sign in or create an account to add the deck someone shared with you.'
          : intentTitle ? `Sign in or create an account to add “${intentTitle}” to your decks.`
            : '')} />
    );
  }
  if (choosingPassword) return <NewPassword onDone={() => setChoosingPassword(false)} />;
  return <Library key={user.id} user={user} onUser={setUser} />;
}

function Library({ user, onUser }) {
  const ready = true;
  const [decks, setDecks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState({ name: 'home' });
  const [caughtUp, setCaughtUp] = useState(null); // decks to practise anyway
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // Save a new deck. If the sign-in has lapsed, keep the deck on this device,
  // ask to sign in again, and save it straight after.
  const saveNewDeck = useCallback(async (deck, source) => {
    try {
      const created = await api.createDeck({ ...deck, source: SOURCES[source] ?? deck.source ?? null });
      setDecks((all) => [...all, created]);
      track('deck_added', { source, lang: deck.lang });
      return created;
    } catch (e) {
      if (e instanceof api.SignedOutError) {
        try { localStorage.setItem('alle-pending-deck', JSON.stringify(deck)); } catch { /* full */ }
        sessionStorage.setItem('alle-auth-notice', `Your sign-in expired. Sign in again and we’ll save “${deck.title}” for you.`);
        await supabase.auth.signOut();
        return null;
      }
      throw e;
    }
  }, []);

  const addReadyMade = async (key) => {
    try {
      const sample = SAMPLE_DECKS[key];
      if (sample) {
        // Keep the sample's own colour if it's free; otherwise a free one.
        await saveNewDeck({ ...sample, ...pickDeckLook(decks) }, 'ready_made');
        return;
      }
      // A library deck from the website: read its published sheet.
      const lib = LIBRARY[key];
      if (!lib) return;
      const parsed = await fetchDeckFromUrl(lib.csv_url);
      await saveNewDeck({
        ...lib,
        front_label: parsed.frontLabel || lib.front_label,
        back_label: parsed.backLabel || lib.back_label,
        cards: parsed.cards,
        answer_mode: 'choice',
        is_sample: true,
        ...pickDeckLook(decks),
      }, 'library');
    } catch (e) { setError(api.friendlyError(e)); }
  };

  useEffect(() => { setPageMeta('decks'); }, []);

  // "Opened the app today": once a day per person, for last-active and active days.
  useEffect(() => {
    const key = `alle-open:${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem(key) === today) return; localStorage.setItem(key, today); } catch { /* storage off */ }
    track('app_open', {});
  }, [user.id]);

  // First-run tour: once per account (saved to the account, so other devices skip it).
  const [touring, setTouring] = useState(() => {
    if (user.user_metadata?.onboarded) return false;
    try { return localStorage.getItem(`alle-onboarded:${user.id}`) !== '1'; } catch { return true; }
  });
  function finishTour() {
    setTouring(false);
    try { localStorage.setItem(`alle-onboarded:${user.id}`, '1'); } catch { /* storage off */ }
    if (!user.user_metadata?.onboarded) {
      supabase.auth.updateUser({ data: { onboarded: true } }).then(({ data }) => data?.user && onUser(data.user)).catch(() => {});
    }
  }

  // Opened from a share or "add" link: offer to add that deck.
  const [incoming, setIncoming] = useState(null);
  useEffect(() => {
    const intent = readIntent();
    if (!intent) return;
    resolveIntent(intent).then((r) => {
      if (r) setIncoming(r);
      else { clearIntent(); setError('That deck link isn’t available anymore.'); }
    });
  }, []);
  async function acceptIncoming() {
    const r = incoming;
    setIncoming(null); clearIntent();
    try {
      if (r.kind === 'ready') { await addReadyMade(r.key); return; }
      const d = r.deck;
      const created = await saveNewDeck({
        title: d.title, front_label: d.front_label, back_label: d.back_label, lang: d.lang,
        csv_url: d.csv_url, cards: d.cards, answer_mode: d.answer_mode ?? 'choice',
        ...pickDeckLook(decks),
      }, 'shared');
      if (created) setNotice(`Added “${created.title}” to your decks.`);
    } catch (e) { setError(api.friendlyError(e)); }
  }

  // A deck kept safe while signed out: save it now.
  useEffect(() => {
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem('alle-pending-deck') || 'null'); } catch { /* bad data */ }
    if (!pending) return;
    localStorage.removeItem('alle-pending-deck');
    saveNewDeck({ ...pending, user_id: undefined }, 'restored')
      .then((d) => d && setNotice(`Saved “${d.title}”, the deck you were making.`))
      .catch((e) => setError(api.friendlyError(e)));
  }, [saveNewDeck]);
  const [error, setError] = useState('');
  const refreshed = useRef(false);

  const prefs = user.user_metadata || {};
  const colorMode = prefs.color_mode === 'monochrome' ? 'monochrome' : 'colorful';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.listDecks();
      setDecks(d);
      setProgress(await api.listProgress(d.map((x) => x.id)));
      return d;
    } catch (e) {
      setError(api.friendlyError(e));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load, then quietly re-read each linked sheet so edits in Google Sheets show up.
  useEffect(() => {
    if (!ready) return;
    load().then(async (d) => {
      if (refreshed.current) return;
      refreshed.current = true;
      for (const deck of d.filter((x) => x.csv_url)) {
        try {
          const fresh = await fetchDeckFromUrl(deck.csv_url);
          const changed =
            JSON.stringify(fresh.cards) !== JSON.stringify(deck.cards) ||
            fresh.frontLabel !== deck.front_label || fresh.backLabel !== deck.back_label;
          if (changed) {
            const updated = await api.updateDeck(deck.id, {
              cards: fresh.cards, front_label: fresh.frontLabel, back_label: fresh.backLabel,
            });
            setDecks((all) => all.map((x) => (x.id === updated.id ? updated : x)));
          }
        } catch { /* offline or unpublished: keep the cached copy */ }
      }
    });
  }, [ready, load]);

  const allCards = useMemo(() => collectCards(decks, progress), [decks, progress]);

  const dueByDeck = useMemo(() => {
    const now = new Date();
    const out = {};
    for (const c of allCards) {
      if (c.progress && new Date(c.progress.due_at) <= now) out[c.deckId] = (out[c.deckId] || 0) + 1;
    }
    return out;
  }, [allCards]);

  function start(deckIds, { mix = false, practice = false } = {}) {
    const pool = allCards.filter((c) => deckIds.includes(c.deckId));
    const cards = buildSession(pool, { mix, practice });
    if (!cards.length) { setCaughtUp({ deckIds, mix }); return; }
    setCaughtUp(null);
    answered.current = 0;
    track('session_started', { cards: cards.length, decks: deckIds.length, mix });
    setScreen({ name: 'study', cards, id: Date.now() });
  }
  // Study time for the dashboard: seconds since the session started, capped so
  // a session left open in the background doesn't count as hours of study.
  const answered = useRef(0);
  const sessionSeconds = () => Math.min(45 * 60, Math.round((Date.now() - (screen.id || Date.now())) / 1000));

  const review = useCallback((card, verdict) => {
    answered.current += 1;
    const row = {
      user_id: user.id,
      deck_id: card.deckId,
      card_hash: card.hash,
      ...schedule(card.progress, verdict),
    };
    setProgress((all) => [
      ...all.filter((p) => !(p.deck_id === row.deck_id && p.card_hash === row.card_hash)),
      row,
    ]);
    api.saveProgress(row).catch((e) => setError(`Progress didn’t save: ${e.message}`));
  }, [user.id]);

  async function setPrefs(patch) {
    onUser({ ...user, user_metadata: { ...prefs, ...patch } }); // optimistic
    try { onUser(await api.updatePrefs(patch)); } catch (e) { setError(api.friendlyError(e)); }
  }


  let view;
  if (screen.name === 'study') {
    view = (
      <Study
        cards={screen.cards}
        onReview={review}
        onExit={() => {
          track('session_left', { total: answered.current, of: screen.cards.length, duration_s: sessionSeconds() });
          setScreen({ name: 'home' });
        }}
        onFinish={(score) => {
          track('session_finished', { total: score.total, correct: score.correct, duration_s: sessionSeconds() });
          setScreen({ name: 'done', ...score });
        }}
      />
    );
  } else if (screen.name === 'done') {
    view = <Done correct={screen.correct} total={screen.total} onDone={() => setScreen({ name: 'home' })} />;
  } else {
    view = (
      <Home
        decks={decks}
        loading={loading || !ready}
        dueByDeck={dueByDeck}
        colorMode={colorMode}
        onAddSample={addReadyMade}
        onColorMode={(mode) => setPrefs({ color_mode: mode })}
        onStudyDeck={(deck) => start([deck.id])}
        onShuffle={(ids) => start(ids && ids.length ? ids : decks.map((d) => d.id), { mix: true })}
        onAddDeck={async (deck) => {
          // New decks start as multiple choice (easier to begin with).
          const created = await saveNewDeck({ answer_mode: 'choice', ...deck }, deck.csv_url ? 'sheet' : 'ai_or_paste');
          if (created && answerMode(created) === 'choice') {
            setNotice('This deck uses multiple choice. You can switch to typing anytime in Edit deck.');
          }
        }}
        onUpdateDeck={async (id, patch) => {
          await api.updateDeck(id, patch);
          // Merge the change into what's on screen (keeps ready-made decks current).
          setDecks((all) => all.map((d) => (d.id === id ? { ...d, ...patch } : d)));
        }}
        onRemoveDeck={async (id) => {
          await api.removeDeck(id);
          setDecks((all) => all.filter((d) => d.id !== id));
          setProgress((all) => all.filter((p) => p.deck_id !== id));
        }}
        onRefresh={load}
        onHelp={() => setTouring(true)}
        onShareDeck={async (deck) => {
          const r = await api.shareDeck(deck);
          setDecks((all) => all.map((d) => (d.id === deck.id ? { ...d, share_id: r.id } : d)));
          track('deck_shared', {});
          return r;
        }}
        onStopSharing={async (id) => {
          await api.stopSharing(id);
          setDecks((all) => all.map((d) => (d.id === id ? { ...d, share_id: null } : d)));
        }}
        onRainbow={() => {
          // Repaint decks in order, one after another, so it ripples down the list.
          const RAINBOW = ['yellow', 'green', 'blue', 'red', 'purple', 'lime', 'pink'];
          if (colorMode === 'monochrome') setPrefs({ color_mode: 'colorful' });
          decks.forEach((deck, i) => {
            const color = RAINBOW[i % RAINBOW.length];
            if (deck.color === color) return;
            setTimeout(() => {
              setDecks((all) => all.map((d) => (d.id === deck.id ? { ...d, color } : d)));
            }, i * 90);
            api.updateDeck(deck.id, { color }).catch(() => {});
          });
          track('rainbow_used', {});
        }}
        onReorder={async (ordered) => {
          setDecks(ordered); // show the new order straight away
          try {
            setDecks(await api.saveOrder(ordered));
          } catch (e) {
            setError(/position/.test(e.message)
              ? 'Saving the order needs one database update. Run supabase/004_position.sql in Supabase.'
              : e.message);
          }
        }}
        onResetProgress={async (id) => {
          try {
            await api.resetProgress(id);
            setProgress((all) => all.filter((p) => p.deck_id !== id));
          } catch (e) { setError(api.friendlyError(e)); }
        }}
        onSignOut={() => supabase.auth.signOut()}
        user={user}
        onUserUpdated={onUser}
      />
    );
  }

  return (
    <>
      {/* One screen mounted at a time. It fades in on change; the previous one
          is never kept around, so finishing a session can't leave two screens
          fighting (which wedged the Done button). */}
      <motion.div
        key={screen.name === 'study' ? `study-${screen.id}` : screen.name}
        className="screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <ErrorBoundary key={screen.name} onReset={() => setScreen({ name: 'home' })}>
          {view}
        </ErrorBoundary>
      </motion.div>

      <Sheet open={!!caughtUp} onClose={() => setCaughtUp(null)} title="All caught up" variant="dialog">
        <div className="sheet__body">
          <p className="sheet__text">
            Nothing is due right now and there are no new cards left. You can review the cards coming up next anyway.
          </p>
          <SheetActions>
            <Button onClick={() => start(caughtUp.deckIds, { mix: caughtUp.mix, practice: true })}>
              Practise anyway
            </Button>
            <Button variant="secondary" onClick={() => setCaughtUp(null)}>Not now</Button>
          </SheetActions>
        </div>
      </Sheet>

      {touring && <Onboarding onDone={finishTour} />}

      <Sheet open={!!incoming && !touring} onClose={() => { setIncoming(null); clearIntent(); }} title="Add this deck?" variant="dialog">
        {incoming && (
          <div className="sheet__body">
            <DeckPreview deck={{
              title: incoming.title,
              front_label: incoming.deck?.front_label || '', back_label: incoming.deck?.back_label || '',
              ...pickDeckLook(decks),   // the colour it will really get
              cards: incoming.deck?.cards || [],
            }} />
            <p className="sheet__text">
              {incoming.kind === 'shared'
                ? 'Someone shared this deck with you. Add a copy to your decks to start studying it.'
                : 'Add this ready-made deck to your decks.'}
            </p>
            <SheetActions>
              <Button onClick={acceptIncoming}>Add to my decks</Button>
              <Button variant="secondary" onClick={() => { setIncoming(null); clearIntent(); }}>Not now</Button>
            </SheetActions>
          </div>
        )}
      </Sheet>

      {error && (
        <div className="toast" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}
      {!error && notice && (
        <div className="toast toast--notice" role="status" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}
    </>
  );
}
