// public/sw.js
// Service Worker — offline-first for field agents
// Caches critical routes, queues offline mutations, syncs when online.
// Registered in app/layout.tsx via navigator.serviceWorker.register('/sw.js')

const CACHE_VERSION = 'asas-v1'
const STATIC_CACHE  = `${CACHE_VERSION}-static`
const API_CACHE     = `${CACHE_VERSION}-api`

// Routes to cache for offline access
const STATIC_ROUTES = [
  '/',
  '/leads',
  '/deals',
  '/offline',
  '/_next/static/',
]

// API routes that can be served stale (read-only, non-critical)
const STALE_WHILE_REVALIDATE_ROUTES = [
  '/api/deals',
  '/api/leads',
  '/api/agents/kpis',
]

// Mutation routes that must be queued when offline
const OFFLINE_QUEUEABLE_ROUTES = [
  '/api/leads',       // POST create lead
  '/api/deals',       // POST create deal
  '/api/activities',  // POST log activity
]

// =============================================================================
// SERVICE WORKER LIFECYCLE
// =============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ROUTES.filter((r) => !r.includes('_next')))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('asas-') && k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// =============================================================================
// FETCH STRATEGY
// =============================================================================

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Skip non-GET for caching (handle mutations separately)
  if (req.method !== 'GET') {
    if (isQueueable(url.pathname) && req.method === 'POST') {
      event.respondWith(handleOfflineMutation(req))
    }
    return
  }

  // Static assets — cache first
  if (url.pathname.startsWith('/_next/static') || url.pathname.match(/\.(js|css|png|jpg|ico|woff2)$/)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE))
    return
  }

  // API reads — stale-while-revalidate
  if (isStaleWhileRevalidate(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, API_CACHE))
    return
  }

  // Navigation — network first, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(req))
    return
  }
})

// =============================================================================
// CACHE STRATEGIES
// =============================================================================

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req)
  if (cached) return cached
  const response = await fetch(req)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(req, response.clone())
  }
  return response
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(req)

  const fetchPromise = fetch(req).then((response) => {
    if (response.ok) cache.put(req, response.clone())
    return response
  }).catch(() => null)

  return cached ?? await fetchPromise ?? new Response('Offline', { status: 503 })
}

async function networkFirstWithFallback(req) {
  try {
    const response = await fetch(req)
    return response
  } catch {
    const cached = await caches.match(req)
    return cached ?? await caches.match('/offline') ?? new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// =============================================================================
// OFFLINE MUTATION QUEUE
// Stores failed/offline POST requests in IndexedDB
// =============================================================================

let offlineDB = null

async function getOfflineDB() {
  if (offlineDB) return offlineDB
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('asas-offline', 1)
    req.onupgradeneeded = (event) => {
      const db    = event.target.result
      db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true })
        .createIndex('status', 'status')
      db.createObjectStore('config')
    }
    req.onsuccess = (event) => {
      offlineDB = event.target.result
      resolve(offlineDB)
    }
    req.onerror = () => reject(req.error)
  })
}

async function queueMutation(req) {
  const body     = await req.text()
  const db       = await getOfflineDB()
  const mutation = {
    url:         req.url,
    method:      req.method,
    headers:     Object.fromEntries(req.headers.entries()),
    body,
    status:      'pending',
    capturedAt:  new Date().toISOString(),
    tempId:      `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  }

  return new Promise((resolve, reject) => {
    const tx    = db.transaction('mutations', 'readwrite')
    const store = tx.objectStore('mutations')
    const req2  = store.add(mutation)
    req2.onsuccess = () => resolve(req2.result)
    req2.onerror   = () => reject(req2.error)
  })
}

async function handleOfflineMutation(req) {
  try {
    // Try live request first
    const response = await fetch(req.clone())
    return response
  } catch {
    // Offline — queue for later sync
    await queueMutation(req.clone())
    return new Response(
      JSON.stringify({
        queued:  true,
        message: 'Operation saved offline — will sync when connected',
        offline: true,
      }),
      {
        status:  202,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// =============================================================================
// BACKGROUND SYNC — flush queue when online
// =============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'asas-offline-sync') {
    event.waitUntil(flushOfflineQueue())
  }
})

async function flushOfflineQueue() {
  const db = await getOfflineDB()

  const mutations = await new Promise((resolve) => {
    const tx    = db.transaction('mutations', 'readonly')
    const store = tx.objectStore('mutations')
    const idx   = store.index('status')
    const req   = idx.getAll('pending')
    req.onsuccess = () => resolve(req.result)
  })

  const deviceId = await getDeviceId()
  const agentId  = await getAgentId()

  if (!mutations.length) return

  const operations = mutations.map((m) => ({
    tempId:     m.tempId,
    entityType: inferEntityType(m.url),
    operation:  m.method === 'POST' ? 'create' : m.method === 'PATCH' ? 'update' : 'delete',
    payload:    JSON.parse(m.body || '{}'),
    capturedAt: m.capturedAt,
    version:    1,
  }))

  try {
    const resp = await fetch('/api/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ deviceId, agentId, operations }),
    })

    if (resp.ok) {
      // Mark synced in IndexedDB
      const tx    = db.transaction('mutations', 'readwrite')
      const store = tx.objectStore('mutations')
      for (const m of mutations) {
        store.put({ ...m, status: 'synced', syncedAt: new Date().toISOString() })
      }

      // Notify all clients
      const clients = await self.clients.matchAll()
      for (const client of clients) {
        client.postMessage({ type: 'SYNC_COMPLETE', count: mutations.length })
      }
    }
  } catch (err) {
    console.error('[SW] Sync failed:', err)
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function isQueueable(pathname) {
  return OFFLINE_QUEUEABLE_ROUTES.some((r) => pathname.startsWith(r))
}

function isStaleWhileRevalidate(pathname) {
  return STALE_WHILE_REVALIDATE_ROUTES.some((r) => pathname.startsWith(r))
}

function inferEntityType(url) {
  if (url.includes('/leads'))     return 'lead'
  if (url.includes('/deals'))     return 'deal'
  if (url.includes('/activities')) return 'activity'
  return 'unknown'
}

async function getDeviceId() {
  const db = await getOfflineDB()
  return new Promise((resolve) => {
    const tx = db.transaction('config', 'readonly')
    const store = tx.objectStore('config')
    const req = store.get('device-id')
    req.onsuccess = () => {
      if (req.result) resolve(req.result)
      else {
        const id = crypto.randomUUID()
        const tx2 = db.transaction('config', 'readwrite')
        tx2.objectStore('config').put(id, 'device-id')
        resolve(id)
      }
    }
  })
}

async function getAgentId() {
  const db = await getOfflineDB()
  return new Promise((resolve) => {
    const tx = db.transaction('config', 'readonly')
    const store = tx.objectStore('config')
    const req = store.get('agent-id')
    req.onsuccess = () => resolve(req.result ?? 'unknown')
  })
}
