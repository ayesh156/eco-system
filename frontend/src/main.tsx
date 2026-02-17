import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerServiceWorker, precacheCriticalRoutes } from './lib/serviceWorker'

// Remove the loading screen once React is ready
const removeLoader = () => {
  if (typeof window !== 'undefined' && (window as any).__removeLoader) {
    (window as any).__removeLoader();
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Post-render: Register Service Worker & prefetch critical routes
requestIdleCallback(() => {
  removeLoader();
  registerServiceWorker().then(() => {
    precacheCriticalRoutes();
  });
}, { timeout: 2000 });

// Polyfill requestIdleCallback for Safari
if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  (window as any).requestIdleCallback = (cb: Function, opts?: { timeout: number }) => {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, opts?.timeout ? Math.min(opts.timeout, 1) : 1);
  };
}
