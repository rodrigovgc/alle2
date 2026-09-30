import { Icon } from './Icon.jsx';

export function SampleBanner({ onDismiss }) {
  return (
    <aside className="banner" aria-label="Getting started">
      <div className="banner__body">
        <p className="banner__lead">
          This is a sample deck. Delete it and import your own CSV to get started.
        </p>
        <ol className="banner__steps">
          <li>In Google Sheets, open <b>File → Share → Publish to web</b>. Put the front in column A and the back in column B, with headers in row 1.</li>
          <li>Pick <b>Comma-separated values (.csv)</b>, publish, and paste the link here with <b>+</b>.</li>
        </ol>
      </div>
      <button type="button" className="banner__close" aria-label="Dismiss" onClick={onDismiss}>
        <Icon name="close" />
      </button>
    </aside>
  );
}
