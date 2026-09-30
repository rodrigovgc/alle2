import { useRef, useState } from 'react';
import { useVisualViewport } from '../lib/useViewport.js';
import { useFocusIntoView } from '../lib/useFocusIntoView.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import { Logo } from '../components/Icon.jsx';
import { Button } from '../components/Button.jsx';
import { Field } from '../components/Sheet.jsx';

export function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSignUp = mode === 'signup';
  const typing = useVisualViewport(true);
  const rootRef = useRef(null);
  useFocusIntoView(rootRef);

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (!data.session) setNotice(`Check ${email} and confirm your account, then sign in.`);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(
        /invalid login/i.test(err.message)
          ? 'That email and password don’t match an account.'
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isConfigured) {
    return (
      <main className="auth">
        <div className="auth__brand"><Logo /></div>
        <p className="auth__lead">Add your Supabase keys to connect.</p>
        <p className="auth__hint">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in
          <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <main className={`auth ${typing ? 'is-typing' : ''}`} ref={rootRef}>
      <div className="auth__brand"><Logo /></div>
      <form className="auth__form" onSubmit={submit} noValidate>
        <h1 className="auth__title">{isSignUp ? 'Create your account' : 'Sign in'}</h1>
        <p className="auth__lead">
          {isSignUp
            ? 'Your decks and progress follow you to every device.'
            : 'Pick up where you left off.'}
        </p>
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint={isSignUp ? 'At least 6 characters.' : undefined}>
          <input
            className="input"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            enterKeyHint="go"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <Button type="submit" disabled={busy || !email || password.length < 6}>
          {busy ? 'One moment…' : isSignUp ? 'Create account' : 'Sign in'}
        </Button>
        <button
          type="button"
          className="text-btn"
          onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); setNotice(''); }}
        >
          {isSignUp ? 'Have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  );
}
