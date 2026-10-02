import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import App from './App.jsx';
import { initTheme } from './lib/theme.js';
import { DesignSystem } from './screens/DesignSystem.jsx';
import { Dashboard } from './screens/Dashboard.jsx';
import './styles/design-system.css';

initTheme();

function route(path) {
  const p = path.replace(/\/$/, '');
  if (p === '/design') return <DesignSystem />;
  if (p === '/dashboard') return <Dashboard />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {route(window.location.pathname)}
  </React.StrictMode>,
);
