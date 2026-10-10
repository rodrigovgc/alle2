// "Changes saved": any part of the app that saves a change on its own (no
// Save button) calls announceSaved(); App shows one short toast for it.
export const SAVED_EVENT = 'alle-saved';
export function announceSaved() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}
