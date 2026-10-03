import { useEffect, useRef, useState } from 'react';
import { wikimediaFile, resolveImage } from '../lib/media.js';

/**
 * A picture on the card. Tries each source in turn; if none loads, reports it
 * so the session can drop the card (a question without its picture can't be answered).
 */
export function CardPicture({ cell, sources, framed, onBroken }) {
  // Try the quick guesses first; if they all fail, ask Wikimedia's API for the
  // real URL before giving up. A plain broken card is dropped from the session.
  const file = wikimediaFile(cell);
  const [list, setList] = useState(sources);
  const [i, setI] = useState(0);
  const triedApi = useRef(false);

  useEffect(() => { setList(sources); setI(0); triedApi.current = false; }, [cell]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onError() {
    if (i + 1 < list.length) { setI(i + 1); return; }
    if (file && !triedApi.current) {
      triedApi.current = true;
      const url = await resolveImage(file);
      if (url) { setList([url]); setI(0); return; }
    }
    onBroken?.();
  }

  if (i >= list.length) return <div className="study-card__picture-wrap" />;
  return (
    <div className="study-card__picture-wrap">
      <img
        key={list[i]}
        className={`study-card__picture ${framed ? 'is-framed' : ''}`}
        src={list[i]}
        alt="Picture to identify"
        decoding="async"
        draggable={false}
        onError={onError}
      />
    </div>
  );
}

