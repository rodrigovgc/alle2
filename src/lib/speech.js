import { alternatives } from './csv.js';

export const LANGUAGES = [
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'en-US', label: 'English' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
];

/** Guess the spoken language from the back-column header. Dutch → nl-NL, otherwise en-US. */
export function inferLang(label = '') {
  const l = label.toLowerCase();
  if (/dutch|nederlands|vlaams|flemish/.test(l)) return 'nl-NL';
  if (/portugu/.test(l)) return 'pt-BR';
  if (/fran|french/.test(l)) return 'fr-FR';
  if (/german|deutsch/.test(l)) return 'de-DE';
  if (/spanish|español|espanol/.test(l)) return 'es-ES';
  if (/ital/.test(l)) return 'it-IT';
  return 'en-US';
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(backCell, lang = 'en-US') {
  if (!canSpeak()) return;
  const text = alternatives(backCell)[0].replace(/•/g, '. ');
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const base = lang.split('-')[0];
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(base)) || null;
  u.rate = 0.92;
  synth.speak(u);
}
