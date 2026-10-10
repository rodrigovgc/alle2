import { DeckShape, Icon } from './Icon.jsx';

/*
 * The tour's small looping scenes. They are plain markup; all motion lives in
 * CSS (styles/scenes.css). The same scenes are published for the website at
 * /embed/scenes.json + /embed/scenes.css when the app builds (see
 * vite.config.js), so the Help page and homepage always match the app.
 */

function MiniDeck({ title, color, shape, meta }) {
  return (
    <div className="mini-deck" style={{ '--deck-fill': `var(--deck-${color})`, '--deck-deep': `var(--deck-${color}-deep)` }}>
      {meta && <span className="mini-deck__meta">{meta}</span>}
      <span className="mini-deck__title">{title}</span>
      <span className="mini-deck__shape"><DeckShape shape={shape || color} /></span>
    </div>
  );
}

function WelcomeScene() {
  return (
    <div className="sc sc-welcome">
      <div className="sc-card sc-card--back2" />
      <div className="sc-card sc-card--back1" />
      <div className="sc-flip">
        <div className="sc-face sc-face--front"><small>English</small><b>to go</b><span className="sc-type">Type answer…</span></div>
        <div className="sc-face sc-face--back"><small>Dutch</small><b>gaan</b><span className="sc-tag sc-tag--ok">Correct</span></div>
      </div>
    </div>
  );
}

function ReadyScene() {
  return (
    <div className="sc sc-ready">
      <MiniDeck title="Numbers in Portuguese" color="red" meta="Digit → Portuguese" />
      <MiniDeck title="Road signs" color="yellow" meta="Sign → Meaning" />
      <MiniDeck title="Organic chemistry" color="green" shape="lime" meta="Formula → Name" />
      <span className="sc-tap" />
    </div>
  );
}

function SheetScene() {
  const rows = [['to go', 'gaan'], ['the house', 'het huis'], ['thank you', 'dank je']];
  return (
    <div className="sc sc-sheet">
      <div className="sc-spin">
        <div className="sc-gsheet">
          <div className="sc-gsheet__bar"><i /> Dutch words</div>
          <div className="sc-gsheet__row sc-gsheet__head"><span>English</span><span>Dutch</span></div>
          {rows.map(([a, b], n) => (
            <div key={a} className={`sc-gsheet__row sc-row${n + 1}`}><span>{a}</span><span>{b}</span></div>
          ))}
        </div>
        <div className="sc-spin__back">
          <div className="big-deck" style={{ '--deck-fill': 'var(--deck-blue)', '--deck-deep': 'var(--deck-blue-deep)' }}>
            <span className="mini-deck__meta">English → Dutch</span>
            <span className="big-deck__title">Dutch words</span>
            <span className="big-deck__count">3 cards</span>
            <span className="big-deck__shape"><DeckShape shape="blue" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiScene() {
  return (
    <div className="sc sc-ai">
      <div className="sc-bubble sc-bubble--me">Make 20 flashcards for learning Dutch…</div>
      <div className="sc-bubble sc-bubble--ai"><span className="sc-dots"><i /><i /><i /></span><span className="sc-csv">English,Dutch<br />to go,gaan<br />the house,het huis</span></div>
      <div className="sc-ai__deck"><MiniDeck title="Dutch words" color="blue" meta="English → Dutch" /></div>
    </div>
  );
}

function PrioritySign() {
  return (
    <svg className="sc-sign" viewBox="0 0 100 100" role="img" aria-label="Priority road sign">
      <rect x="18" y="18" width="64" height="64" rx="6" transform="rotate(45 50 50)" fill="#fff" stroke="#1d1d1b" strokeWidth="2.5" />
      <rect x="29" y="29" width="42" height="42" rx="2" transform="rotate(45 50 50)" fill="#F5C400" />
    </svg>
  );
}

function StudyScene() {
  return (
    <div className="sc sc-study">
      <div className="sc-qcard"><small>Sign</small><PrioritySign /></div>
      <div className="sc-opts">
        <span className="sc-opt">Give way</span>
        <span className="sc-opt sc-opt--right">Priority road</span>
        <span className="sc-opt">End of priority road</span>
      </div>
    </div>
  );
}

const APPS = [
  { name: 'Mail', bg: '#2F7CF6', glyph: 'M3 6h18v12H3z M3 7l9 6 9-6' },
  { name: 'Phone', bg: '#34C759', glyph: 'M7 4c1 0 2 2.5 2.5 4L8 9.5c1 2.4 3 4.5 5.5 5.5L15 13.5c1.5.5 4 1.5 4 2.5 0 2-2 4-4 4C9 20 4 15 4 8c0-2 2-4 3-4z' },
  { name: 'Camera', bg: '#8E8E93', glyph: 'M4 8h4l2-2h4l2 2h4v10H4z M12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { name: 'Messages', bg: '#30B85A', glyph: 'M4 6h16v10H9l-5 4z' },
  { name: 'Music', bg: '#F2445C', glyph: 'M10 6l9-2v11a2.5 2.5 0 1 1-2-2.4V7.5l-5 1.1V17a2.5 2.5 0 1 1-2-2.4z' },
  { name: 'Maps', bg: '#E9E3D3', glyph: 'M12 3a6 6 0 0 1 6 6c0 4.5-6 11-6 11S6 13.5 6 9a6 6 0 0 1 6-6z M12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', dark: true },
  { name: 'Photos', bg: '#FFFFFF', glyph: 'M12 4a4 4 0 0 1 0 8 4 4 0 0 1 0-8z M5 18c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5z', dark: true },
];

function AppIcon({ app }) {
  return (
    <span className="sc-app">
      <span className="sc-app__icon" style={{ background: app.bg }}>
        <svg viewBox="0 0 24 24"><path d={app.glyph} fill="none" stroke={app.dark ? '#3a3a3c' : '#fff'} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
      </span>
      {app.name && <small>{app.name}</small>}
    </span>
  );
}

function HomeScene() {
  const grid = APPS.filter((a) => ['Mail', 'Camera', 'Maps', 'Photos', 'Music'].includes(a.name));
  const dock = APPS.filter((a) => ['Phone', 'Messages'].includes(a.name));
  return (
    <div className="sc sc-home">
      <div className="iphone">
        <span className="iphone__island" />
        {/* 1. Alle in Safari */}
        <div className="iphone__screen scr-safari">
          <div className="scr-status"><b>9:41</b></div>
          <div className="scr-page">
            <span className="scr-page__logo"><i /><i /> Alle</span>
            <span className="scr-page__deck" style={{ background: 'var(--deck-yellow)' }} />
            <span className="scr-page__deck" style={{ background: 'var(--deck-green)' }} />
            <span className="scr-page__deck" style={{ background: 'var(--deck-blue)' }} />
          </div>
          <div className="scr-toolbar">
            <span className="scr-url">my.allecards.app</span>
            <span className="sc-share"><Icon name="share" /></span>
          </div>
          <div className="sc-sheetmenu">
            <span>Copy</span>
            <span className="sc-sheetmenu__hl">Add to Home Screen</span>
            <span>Add Bookmark</span>
          </div>
        </div>
        {/* 2. The home screen, with Alle on it */}
        <div className="iphone__screen scr-home">
          <div className="scr-status scr-status--light"><b>9:41</b></div>
          <div className="sc-apps">
            {grid.map((a) => <AppIcon key={a.name} app={a} />)}
            <span className="sc-app sc-appicon">
              <span className="sc-app__icon sc-appicon__img"><i /><i /></span>
              <small>Alle</small>
            </span>
          </div>
          <div className="scr-dock">
            {dock.map((a) => <AppIcon key={a.name} app={{ ...a, name: '' }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SCENES = {
  welcome: WelcomeScene,
  ready: ReadyScene,
  sheets: SheetScene,
  ai: AiScene,
  study: StudyScene,
  home: HomeScene,
};
