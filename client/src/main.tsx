import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker for desktop app download and auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('PWA Service Worker registered with scope:', registration.scope);
        // Force check for newest build from server
        registration.update().catch(() => {});

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New POS app version ready, reloading...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn('PWA Service Worker registration failed:', error);
      });
  });
}

