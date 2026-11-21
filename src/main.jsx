import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

// Register Service Worker for instant PWA installation & seamless background updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if there was already an active controller BEFORE registration
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Auto-check for updates
        registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('⚡ New update installed, activating in background...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('SW registration warning:', err);
      });

    // Auto-reload ONLY when an existing active controller is replaced by an update
    // (Never reload on the initial visit when the controller was first claimed)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
