import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import App from './App.jsx';
import { DesignSystem } from './screens/DesignSystem.jsx';
import './styles/design-system.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {window.location.pathname.replace(/\/$/, '') === '/design' ? <DesignSystem /> : <App />}
  </React.StrictMode>,
);
