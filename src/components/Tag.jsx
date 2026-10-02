const LABELS = { correct: 'Correct', almost: 'Almost right', wrong: 'Not this time' };

export function Tag({ verdict }) {
  return <span className={`tag tag--${verdict}`}>{LABELS[verdict]}</span>;
}
