// ══════════════════════════════════════════════════════════════
// BTC Stack — Service Worker
// Cache do app shell (cache-first) + cache de API com TTL de 5 min
// (network-first com fallback pro cache expirado quando offline) +
// checagem de alertas de preço em segundo plano (periodicsync/sync).
// ══════════════════════════════════════════════════════════════
'use strict';

const SW_VERSION     = 'v1.3'; // incremente para forçar atualização do cache
const CACHE_NAME     = SW_VERSION;
const SHELL_CACHE    = CACHE_NAME + '-shell';
const API_CACHE      = CACHE_NAME + '-api';

// Recursos do shell que devem ser sempre disponíveis offline.
// Inclui o próprio documento (captado via fetch da página atual).
const SHELL_URLS = [
    self.registration.scope,           // a URL raiz / index.html
];

// Origens de API — serão cacheadas com Network-First + TTL de 5 min.
const API_ORIGINS = [
    'https://api.coingecko.com',
    'https://api.binance.com',
    'https://api.alternative.me',
];

const API_TTL_MS = 5 * 60 * 1000;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL_URLS))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== SHELL_CACHE && k !== API_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);


    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http') && url.protocol !== 'file:') return;


    if (url.protocol === 'wss:' || url.protocol === 'ws:') return;

    const isApiCall = API_ORIGINS.some(o => request.url.startsWith(o));

    if (isApiCall) {



        event.respondWith(
            fetch(request.clone())
                .then(async response => {
                    if (!response || !response.ok) return response;
                    const cache = await caches.open(API_CACHE);

                    const headers = new Headers(response.headers);
                    headers.set('x-sw-cached-at', Date.now().toString());
                    const cloned = new Response(await response.clone().arrayBuffer(), {
                        status: response.status,
                        statusText: response.statusText,
                        headers,
                    });
                    cache.put(request, cloned);
                    return response;
                })
                .catch(async () => {

                    const cache    = await caches.open(API_CACHE);
                    const cached   = await cache.match(request);
                    if (!cached) return new Response(JSON.stringify({ error: 'offline' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    const cachedAt = parseInt(cached.headers.get('x-sw-cached-at') || '0');
                    if (Date.now() - cachedAt > API_TTL_MS) {

                        const staleHeaders = new Headers(cached.headers);
                        staleHeaders.set('x-sw-stale', 'true');
                        const body = await cached.clone().arrayBuffer();
                        return new Response(body, {
                            status: cached.status,
                            statusText: cached.statusText,
                            headers: staleHeaders,
                        });
                    }
                    return cached;
                })
        );
        return;
    }


    if (
        url.href === self.registration.scope ||
        url.href.endsWith('/') ||
        url.href.endsWith('.html') ||
        url.href.endsWith('BTC_Portfolio.html')
    ) {
        event.respondWith(
            caches.open(SHELL_CACHE).then(async cache => {
                const cached = await cache.match(request);

                if (cached) {
                    fetch(request).then(r => { if (r && r.ok) cache.put(request, r); }).catch(() => {});
                    return cached;
                }

                return fetch(request).then(r => {
                    if (r && r.ok) cache.put(request, r.clone());
                    return r;
                });
            })
        );
        return;
    }



});

self.addEventListener('message', event => {
    if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'clearApiCache') {
        caches.delete(API_CACHE).then(() =>
            event.source?.postMessage({ type: 'apiCacheCleared' })
        );
    }
    if (event.data?.type === 'GET_VERSION') {
        const port = event.ports && event.ports[0];
        if (port) port.postMessage({ version: SW_VERSION });
    }
});

// ══════════════════════════════════════════════════════════════
// ALERTAS DE PREÇO EM SEGUNDO PLANO
// Roda mesmo com o app fechado, disparado por:
//  • periodicsync — checagem periódica (Chrome/Edge Android, PWA
//    instalada; intervalo real decidido pelo navegador, sem garantia)
//  • sync         — checagem única quando a conexão volta, ou quando
//    a página pede um "catch-up" antes de ser fechada/minimizada
// Lê os alertas do IndexedDB (sincronizados pela página principal,
// já que o SW não tem acesso ao localStorage) e busca o preço atual
// direto na API da Binance.
// ══════════════════════════════════════════════════════════════
const BG_DB_NAME = 'btcport-bg-db';
const BG_STORE   = 'kv';
const BG_SYMBOL_MAP = { USD: 'BTCUSDT', BRL: 'BTCBRL', EUR: 'BTCEUR' };

function bgIdbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(BG_DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(BG_STORE)) {
                req.result.createObjectStore(BG_STORE, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function bgIdbGet(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readonly');
        const rq = tx.objectStore(BG_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror   = () => reject(rq.error);
    });
}

function bgIdbPut(db, obj) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readwrite');
        tx.objectStore(BG_STORE).put(obj);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

async function bgFetchPrices() {
    const out = {};
    await Promise.all(Object.keys(BG_SYMBOL_MAP).map(async cur => {
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + BG_SYMBOL_MAP[cur]);
            if (res.ok) {
                const data = await res.json();
                const p = parseFloat(data.price);
                if (p > 0) out[cur] = p;
            }
        } catch (e) { /* silencioso: tenta as outras moedas mesmo assim */ }
    }));
    return out;
}

async function checkPriceAlertsBg() {
    let db;
    try { db = await bgIdbOpen(); } catch (e) { return; }

    let alertsRec, notifiedRec;
    try {
        alertsRec   = await bgIdbGet(db, 'alerts');
        notifiedRec = await bgIdbGet(db, 'bgNotified');
    } catch (e) { db.close(); return; }

    const alerts = (alertsRec && alertsRec.data) || [];
    if (alerts.length === 0) { db.close(); return; }

    let bgNotified = new Set((notifiedRec && notifiedRec.data) || []);
    const prices = await bgFetchPrices();
    let changed = false;

    for (const a of alerts) {
        const price = prices[a.currency];
        if (!price) continue;
        const should = a.direction === 'up' ? price >= a.price : price <= a.price;

        if (should && !bgNotified.has(a.id)) {
            bgNotified.add(a.id);
            changed = true;
            const sym      = { USD: '$', BRL: 'R$', EUR: '€' }[a.currency] || '';
            const priceStr = a.price.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
            const dirText  = a.direction === 'up' ? 'passou de' : 'caiu abaixo de';
            try {
                await self.registration.showNotification('₿ Alerta BTC', {
                    body: 'BTC ' + dirText + ' ' + sym + priceStr + ' ' + a.currency,
                    tag: 'btc-alert-' + a.id,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    data: { url: self.registration.scope },
                    requireInteraction: false
                });
            } catch (e) { /* notificação pode falhar se permissão foi revogada */ }
        } else if (!should && bgNotified.has(a.id)) {
            bgNotified.delete(a.id);
            changed = true;
        }
    }

    if (changed) {
        try { await bgIdbPut(db, { key: 'bgNotified', data: [...bgNotified] }); } catch (e) {}
    }
    db.close();
}

self.addEventListener('periodicsync', event => {
    if (event.tag === 'btc-price-check') event.waitUntil(checkPriceAlertsBg());
});

self.addEventListener('sync', event => {
    if (event.tag === 'btc-price-check-sync') event.waitUntil(checkPriceAlertsBg());
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) { if ('focus' in c) return c.focus(); }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
