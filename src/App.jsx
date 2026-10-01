import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import * as api from './lib/api.js';
import { fetchDeckFromUrl } from './lib/csv.js';
import { SAMPLE_DECKS } from './lib/sampleDeck.js';
import { buildSession, collectCards, schedule } from './lib/srs.js';
import { Auth } from './screens/Auth.jsx';
import { Home } from './screens/Home.jsx';
import { Study } from './screens/Study.jsx';
import { Done } from './screens/Done.jsx';
import { Sheet, SheetActions } from './components/Sheet.jsx';
import { Button } from './components/Button.jsx';
import { AnimatePresence, motion } from 'framer-motion';


export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    if (!isConfigured) { setUser(null); return undefined; }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div className="boot" aria-busy="true" />;
  if (!user) return <Auth />;
  return <Library key={user.id} user={user} onUser={setUser} />;
}

function Library({ user, onUser }) {
  const ready = true;
  const [decks, setDecks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState({ name: 'home' });
  const [caughtUp, setCaughtUp] = useState(null); // decks to practise anyway
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
      setError(e.message);
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
    setScreen({ name: 'study', cards, id: Date.now() });
  }

  const review = useCallback((card, verdict) => {
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
    try { onUser(await api.updatePrefs(patch)); } catch (e) { setError(e.message); }
  }


  let view;
  if (screen.name === 'study') {
    view = (
      <Study
        cards={screen.cards}
        onReview={review}
        onExit={() => setScreen({ name: 'home' })}
        onFinish={(score) => setScreen({ name: 'done', ...score })}
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
        onAddSample={async (key) => {
          try {
            const created = await api.createDeck(SAMPLE_DECKS[key]);
            setDecks((all) => [...all, created]);
          } catch (e) { setError(e.message); }
        }}
        onColorMode={(mode) => setPrefs({ color_mode: mode })}
        onStudyDeck={(deck) => start([deck.id])}
        onShuffle={() => start(decks.map((d) => d.id), { mix: true })}
        onAddDeck={async (deck) => {
          const created = await api.createDeck(deck);
          setDecks((all) => [...all, created]);
        }}
        onUpdateDeck={async (id, patch) => {
          const updated = await api.updateDeck(id, patch);
          setDecks((all) => all.map((d) => (d.id === id ? updated : d)));
        }}
        onRemoveDeck={async (id) => {
          await api.removeDeck(id);
          setDecks((all) => all.filter((d) => d.id !== id));
          setProgress((all) => all.filter((p) => p.deck_id !== id));
        }}
        onResetProgress={async (id) => {
          try {
            await api.resetProgress(id);
            setProgress((all) => all.filter((p) => p.deck_id !== id));
          } catch (e) { setError(e.message); }
        }}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  return (
    <>
      {/* Screens cross-fade. The new one mounts straight away (so the study
          screen can still open the keyboard within the tap); the old one fades
          out on top without taking up space. */}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={screen.name === 'study' ? `study-${screen.id}` : screen.name}
          className="screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } }}
        >
          {view}
        </motion.div>
      </AnimatePresence>

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

      {error && (
        <div className="toast" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}
    </>
  );
}
