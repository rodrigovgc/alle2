import { supabase } from './supabase.js';

/**
 * Email links (confirm sign-up, change email, reset password) point to this app
 * as /auth/confirm?token_hash=…&type=…, so the link's domain matches the
 * sender's (better for spam filters). Here the app completes the step itself.
 * Mail scanners that "pre-click" links don't run this code, so they can't use
 * up a link before the person does.
 *
 * Returns null when the address isn't an email link, otherwise { type, error }.
 */
export async function handleEmailLink() {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (!tokenHash || !type) return null;
  window.history.replaceState(null, '', '/'); // tidy the address straight away
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return { type, error };
}
