// Build-time only (see vite.config.js): turns the tour scenes into plain HTML
// for the website. Never part of the app bundle.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SCENES } from '../components/Scenes.jsx';

export function renderScenes() {
  return Object.fromEntries(Object.entries(SCENES).map(([key, Scene]) => [key, renderToStaticMarkup(createElement(Scene))]));
}
