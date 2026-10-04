import { useState } from 'react';
import { Button } from './Button.jsx';
import { Field, SheetActions } from './Sheet.jsx';
import { Segmented } from './Segmented.jsx';
import * as api from '../lib/api.js';
import { getThemePref, setThemePref } from '../lib/theme.js';

/*
 * Account settings: appearance, deck colour mode, password, sign out and a
 * clearly separated delete option. Shown in a sheet from the ··· menu.
 */
export function Account({ email, colorMode, onColorMode, onSignOut, onClose }) {
  const [theme, setTheme] = useState(getThemePref);
  const changeTheme = (t) => { setThemePref(t); setTheme(t); };

  const [emailValue, setEmailValue] = useState(email);
  const [emailState, setEmailState] = useState(null);
  async function saveEmail(e) {
    e.preventDefault();
    if (!emailValue || emailValue === email) return;
    setEmailState('saving');
    try { await api.changeEmail(emailValue); setEmailState('done'); }
    catch (err) { setEmailState(err.message); }
  }

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwState, setPwState] = useState(null); // null | 'saving' | 'done' | error string
  async function savePassword(e) {
    e.preventDefault();
    if (pw.length < 8 || pw !== pw2) return;
    setPwState('saving');
    try { await api.changePassword(pw); setPw(''); setPw2(''); setPwState('done'); }
    catch (err) { setPwState(err.message); }
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  return (
    <div className="sheet__body account">
      <form className="account__group" onSubmit={saveEmail}>
        <h3 className="account__label">Email</h3>
        <Field label="Email address" hint="We’ll send a confirmation link to the new address.">
          <input className="input" type="email" autoComplete="email" value={emailValue}
            onChange={(e) => { setEmailValue(e.target.value); setEmailState(null); }} />
        </Field>
        {typeof emailState === 'string' && emailState !== 'saving' && emailState !== 'done' && (
          <p className="form-error" role="alert">{emailState}</p>
        )}
        {emailState === 'done' && <p className="form-notice" role="status">Check your new inbox to confirm the change.</p>}
        <Button type="submit" variant="secondary" disabled={!emailValue || emailValue === email || emailState === 'saving'}>
          {emailState === 'saving' ? 'Saving…' : 'Update email'}
        </Button>
      </form>

      <section className="account__group">
        <h3 className="account__label" id="acc-theme">Appearance</h3>
        <Segmented
          labelledBy="acc-theme"
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Automatic' }]}
          value={theme}
          onChange={changeTheme}
        />
      </section>

      <section className="account__group">
        <h3 className="account__label" id="acc-color">Deck colours</h3>
        <Segmented
          labelledBy="acc-color"
          options={[{ value: 'colorful', label: 'Colorful' }, { value: 'monochrome', label: 'Monochrome' }]}
          value={colorMode}
          onChange={onColorMode}
        />
      </section>

      <form className="account__group" onSubmit={savePassword}>
        <h3 className="account__label">Change password</h3>
        <Field label="New password" hint="At least 8 characters.">
          <input className="input" type="password" autoComplete="new-password" value={pw}
            onChange={(e) => { setPw(e.target.value); setPwState(null); }} />
        </Field>
        <Field label="Repeat new password">
          <input className="input" type="password" autoComplete="new-password" value={pw2}
            onChange={(e) => { setPw2(e.target.value); setPwState(null); }} />
        </Field>
        {pw2 && pw !== pw2 && <p className="form-error">Those passwords don’t match.</p>}
        {typeof pwState === 'string' && pwState !== 'saving' && pwState !== 'done' && (
          <p className="form-error" role="alert">{pwState}</p>
        )}
        {pwState === 'done' && <p className="form-notice" role="status">Password updated.</p>}
        <Button type="submit" variant="secondary" disabled={pw.length < 8 || pw !== pw2 || pwState === 'saving'}>
          {pwState === 'saving' ? 'Saving…' : 'Update password'}
        </Button>
      </form>

      <SheetActions>
        <Button variant="secondary" onClick={onSignOut}>Sign out</Button>
        {!confirmDelete ? (
          <button type="button" className="text-btn account__delete" onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        ) : (
          <div className="account__confirm">
            <p className="sheet__text">This deletes your account, decks and progress for good. You can sign up again with the same email later.</p>
            {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
            <Button variant="danger" disabled={deleting} onClick={async () => {
              setDeleting(true); setDeleteError('');
              try { await api.deleteAccount(); } catch (err) { setDeleteError(err.message); setDeleting(false); }
            }}>
              {deleting ? 'Deleting…' : 'Delete everything'}
            </Button>
            <button type="button" className="text-btn" onClick={() => setConfirmDelete(false)}>Keep my account</button>
          </div>
        )}
      </SheetActions>
    </div>
  );
}
