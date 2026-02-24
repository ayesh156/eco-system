/**
 * Service Worker Registration & Management
 * Registers the SW on app startup and handles updates
 */

const SW_URL = '/sw.js';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported');
    return null;
  }

  // Don't register in development — the SW caches Vite source files and
  // breaks HMR / WebSocket connections.
  if (import.meta.env.DEV) {
    console.log('[SW] Skipping registration in development mode');
    // Unregister any previously registered SW so stale cached files
    // don't keep being served from the cache.
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const r of registrations) {
      await r.unregister();
    }
    // Also clear caches left over from a previous production SW
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    if (registrations.length || cacheNames.length) {
      console.log('[SW] Cleaned up previous SW registrations & caches');
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
    });

    console.log('[SW] Service Worker registered successfully');

    // Check for updates periodically (every 30 minutes)
    setInterval(() => {
      registration.update().catch(() => {});
    }, 30 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available - auto-activate on next navigation
          console.log('[SW] New version available, will activate on next visit');
          newWorker.postMessage('SKIP_WAITING');
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker and clear all caches
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }

  // Clear all caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));

  console.log('[SW] Service Worker unregistered and caches cleared');
}

/**
 * Pre-cache critical routes for faster navigation
 * Call after initial app load to cache commonly visited pages
 */
export async function precacheCriticalRoutes(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

  // Wait for SW to be ready
  await navigator.serviceWorker.ready;

  // The SW will automatically cache these as users navigate
  // This function prefetches key JS chunks for common pages
  const criticalModules = [
    () => import('../pages/Products'),
    () => import('../pages/Invoices'),
    () => import('../pages/GoodsReceived'),
    () => import('../pages/Customers'),
  ];

  // Prefetch in background after initial render
  setTimeout(() => {
    criticalModules.forEach((loader) => {
      loader().catch(() => {}); // Silently prefetch
    });
  }, 3000); // Wait 3 seconds after page load
}
