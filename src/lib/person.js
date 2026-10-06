/** Display helpers for the signed-in person. Names live in user_metadata. */
export function fullName(user) {
  const m = user?.user_metadata || {};
  return [m.first_name, m.last_name].filter(Boolean).join(' ').trim();
}
export function initials(user) {
  const m = user?.user_metadata || {};
  const a = (m.first_name || '').trim()[0] || '';
  const b = (m.last_name || '').trim()[0] || '';
  const fromName = (a + b).toUpperCase();
  return fromName || (user?.email || '?')[0].toUpperCase();
}
