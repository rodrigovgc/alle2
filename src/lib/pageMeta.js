// Title and description per view. The app is noindex (see index.html); these
// keep browser tabs, bookmarks and link previews accurate.
export const PAGE_META = {
  decks: ['Your Flashcard Decks | Alle', 'Open Alle to create and study your flashcard decks, track your progress and practise the cards that need more work.'],
  login: ['Log in to Alle', 'Log in to Alle to access your flashcard decks, continue studying and pick up where you left off.'],
  signup: ['Create Your Alle Account', 'Create a free Alle account and start learning with your own flashcard decks or choose a ready-made deck to get started.'],
};

export function setPageMeta(key) {
  const meta = PAGE_META[key];
  if (!meta) return;
  document.title = meta[0];
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta[1]);
}
