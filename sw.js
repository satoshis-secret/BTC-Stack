// ══════════════════════════════════════════════════════════════
// BTC Stack — Service Worker
// Cache do app shell (cache-first) + cache de API com TTL de 5 min
// (network-first com fallback pro cache expirado quando offline) +
// checagem de alertas em segundo plano (periodicsync/sync).
//
// Cobertura offline por tipo de alerta:
//  • Halving  — 100% offline, mesmo sem rede nenhuma (estimativa por
//    tempo, sem depender de nenhuma API).
//  • Preço / Variação % — exigem a cotação atual do BTC; com o
//    dispositivo totalmente offline não há como avaliar a condição
//    (limitação real, não uma falha de implementação). Ainda assim,
//    disparam assim que a conexão volta, via Background Sync.
//  • Ciclo (Fear & Greed / MVRV) — dependem de um índice externo;
//    mesma limitação de preço/variação.
// ══════════════════════════════════════════════════════════════
'use strict';

const SW_VERSION     = 'v1.1.0'; // incremente para forçar atualização do cache
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

// ══════════════════════════════════════════════════════════════
// DOWNLOAD NATIVO (Content-Disposition) — usado pelo Backup e pelo
// Exportar Log dentro de apps empacotados (Median.co e afins).
// A página guarda o arquivo aqui via postMessage antes de navegar
// para /__dl__/<token>/<nomeDoArquivo>; o handler de fetch abaixo
// responde essa navegação com um header Content-Disposition real,
// que é o formato que o interceptador nativo de downloads do
// wrapper (Median) reconhece — abrindo a tela do sistema para
// escolher a pasta e concedendo a permissão de armazenamento nela,
// mesmo sem nenhuma requisição de rede verdadeira ter ocorrido.
// Em memória apenas: se o SW for encerrado entre o postMessage e a
// navegação (raro, é quase instantâneo), o download simplesmente
// cai nos métodos de fallback já existentes na página.
// ══════════════════════════════════════════════════════════════
const pendingDownloads = new Map();
const PENDING_DOWNLOAD_TTL_MS = 2 * 60 * 1000;

function pruneOldPendingDownloads() {
    const now = Date.now();
    for (const [token, entry] of pendingDownloads) {
        if (now - entry.ts > PENDING_DOWNLOAD_TTL_MS) pendingDownloads.delete(token);
    }
}

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

    // ── Interceptação de download nativo (ver bloco pendingDownloads acima) ──
    const dlMatch = url.pathname.match(/\/__dl__\/([a-zA-Z0-9_-]+)\/([^/]+)$/);
    if (dlMatch) {
        const token = dlMatch[1];
        event.respondWith((async () => {
            const entry = pendingDownloads.get(token);
            if (!entry) {
                return new Response('Download expirado ou não encontrado. Volte ao app e tente exportar novamente.', {
                    status: 404,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
            pendingDownloads.delete(token);
            return new Response(entry.buffer, {
                status: 200,
                headers: {
                    'Content-Type': entry.mimeType || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${entry.fileName}"`,
                    'Content-Length': String(entry.buffer.byteLength),
                    'Cache-Control': 'no-store',
                },
            });
        })());
        return;
    }

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
    if (event.data?.type === 'CLAIM_CLIENT') self.clients.claim();
    if (event.data === 'clearApiCache') {
        caches.delete(API_CACHE).then(() =>
            event.source?.postMessage({ type: 'apiCacheCleared' })
        );
    }
    if (event.data?.type === 'GET_VERSION') {
        const port = event.ports && event.ports[0];
        if (port) port.postMessage({ version: SW_VERSION });
    }
    if (event.data?.type === 'STORE_BLOB_FOR_DOWNLOAD') {
        pruneOldPendingDownloads();
        const { token, fileName, mimeType, buffer } = event.data;
        pendingDownloads.set(token, { fileName, mimeType, buffer, ts: Date.now() });
        const port = event.ports && event.ports[0];
        if (port) port.postMessage({ ok: true, token });
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

// ── Halving: estimativa 100% offline ──
// Mesma lógica usada pela página (estimateBlockFromTime), duplicada aqui
// porque o Service Worker não tem acesso ao código da página. Não depende
// de nenhuma requisição de rede — é só aritmética sobre a data do último
// halving conhecido — então continua funcionando mesmo com o app fechado
// e o dispositivo sem internet.
const HALVING_LAST_BLOCK   = 840000;
const HALVING_LAST_DATE    = new Date('2024-04-20T00:00:00Z').getTime();
const HALVING_NEXT_BLOCK   = 1050000;
const HALVING_AVG_BLOCK_MS = 10 * 60 * 1000;

function bgHalvingDaysRemaining() {
    const elapsedMs      = Date.now() - HALVING_LAST_DATE;
    const blocksSince    = Math.floor(elapsedMs / HALVING_AVG_BLOCK_MS);
    const currentBlockEst = HALVING_LAST_BLOCK + Math.max(0, blocksSince);
    const blocksRemaining = Math.max(0, HALVING_NEXT_BLOCK - currentBlockEst);
    const msRemaining     = blocksRemaining * HALVING_AVG_BLOCK_MS;
    return Math.floor(msRemaining / (1000 * 60 * 60 * 24));
}

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

// ── Histórico de preço em segundo plano (alertas de variação %) ──
// Mesma estrutura usada pela página (chave 'priceHistory' no IndexedDB
// compartilhado). A cada checagem em segundo plano, adiciona uma
// amostra e poda entradas com mais de 8 dias — assim o histórico
// continua evoluindo mesmo com o app fechado, em navegadores com
// suporte a periodicsync.
const BG_HISTORY_MAX_MS    = 8 * 24 * 60 * 60 * 1000;
const BG_HISTORY_SAMPLE_MS = 5 * 60 * 1000;
const BG_HISTORY_TOLERANCE = 30 * 60 * 1000;

async function bgUpdatePriceHistory(db, prices) {
    let rec;
    try { rec = await bgIdbGet(db, 'priceHistory'); } catch (e) { rec = null; }
    const hist = (rec && rec.data) || { USD: [], BRL: [], EUR: [] };
    const now  = Date.now();
    for (const cur of ['USD', 'BRL', 'EUR']) {
        if (!hist[cur]) hist[cur] = [];
        if (prices[cur]) {
            const last = hist[cur][hist[cur].length - 1];
            if (!last || (now - last.ts) >= BG_HISTORY_SAMPLE_MS) hist[cur].push({ ts: now, price: prices[cur] });
        }
        const cutoff = now - BG_HISTORY_MAX_MS;
        hist[cur] = hist[cur].filter(p => p.ts >= cutoff);
    }
    try { await bgIdbPut(db, { key: 'priceHistory', data: hist }); } catch (e) {}
    return hist;
}

function bgPctChange(hist, currency, windowH, currentPrice) {
    const arr = (hist && hist[currency]) || [];
    if (arr.length === 0 || !currentPrice) return null;
    const cutoff = Date.now() - windowH * 60 * 60 * 1000;
    let base = null;
    for (const p of arr) { if (p.ts >= cutoff) { base = p; break; } }
    if (!base) base = arr[0];
    if (!base || base.ts > cutoff + BG_HISTORY_TOLERANCE || !base.price) return null;
    return ((currentPrice - base.price) / base.price) * 100;
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
    const hist   = await bgUpdatePriceHistory(db, prices);
    let changed = false;

    for (const a of alerts) {
        const type = a.type || 'price';

        if (type === 'halving') {
            // Funciona mesmo sem rede nenhuma: pura estimativa por tempo.
            const daysRemaining = bgHalvingDaysRemaining();
            const should = daysRemaining <= a.days;

            if (should && !bgNotified.has(a.id)) {
                bgNotified.add(a.id);
                changed = true;
                try {
                    await self.registration.showNotification('₿ Alerta BTC', {
                        body: `Faltam ${daysRemaining} dia(s) para o halving do Bitcoin! 🎉`,
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
            continue;
        }

        if (type === 'cycle') {
            // Fear & Greed / MVRV vêm de um índice externo — sem rede,
            // não há como saber o valor atual. Não é possível checar offline.
            continue;
        }

        if (type === 'percent') {
            const currentPrice = prices[a.currency];
            const pct = bgPctChange(hist, a.currency, a.windowH, currentPrice);
            if (pct === null) continue; // histórico ainda insuficiente para essa janela
            const should = a.direction === 'down' ? pct <= -a.percent : pct >= a.percent;

            if (should && !bgNotified.has(a.id)) {
                bgNotified.add(a.id);
                changed = true;
                const sym      = { USD: '$', BRL: 'R$', EUR: '€' }[a.currency] || '';
                const winLabel = { 1: '1h', 24: '24h', 168: '7 dias' }[a.windowH] || (a.windowH + 'h');
                const dirText  = a.direction === 'down' ? 'caiu' : 'subiu';
                try {
                    await self.registration.showNotification('₿ Alerta BTC', {
                        body: 'BTC ' + dirText + ' ' + Math.abs(pct).toFixed(1) + '% em ' + winLabel + ' (' + sym + ' ' + a.currency + ')',
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
            continue;
        }

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
