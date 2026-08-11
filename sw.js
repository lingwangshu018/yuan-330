// Service Worker 文件 (sw.js)
// 缓存策略：升级缓存版本，并确保已移除的登录验证脚本不会继续从旧缓存加载。

const CACHE_VERSION = 'v0.0.37';
const CACHE_NAME = `ephone-cache-${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  './index.html',
  './style.css',
  './online-app.css',
  './script.js',
  'https://unpkg.com/dexie/dist/dexie.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://phoebeboo.github.io/mewoooo/pp.js',
  'https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js',
  'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png'
];

self.addEventListener('install', event => {
  console.log('[SW] 安装新缓存版本:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('[SW] 部分预缓存资源失败，继续安装:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  const isApiRequest = url.includes('generativelanguage.googleapis.com') ||
                       url.includes('/v1/models') ||
                       url.includes('/v1/chat/completions') ||
                       url.includes('gemini.beijixingxing.com') ||
                       url.includes('api.imgbb.com') ||
                       url.includes(':generateContent');

  if (isApiRequest) return;

  // 关键修复：登录验证脚本曾被旧 SW 缓存。
  // 现在它必须网络优先，绝不再优先返回旧的账号/密码验证代码。
  const isAuthScript = url.includes('/js/auth-system.js');
  if (isAuthScript) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  const isImage = /\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url) ||
                  url.includes('postimg.cc') ||
                  url.includes('catbox.moe') ||
                  url.includes('sharkpan.xyz') ||
                  url.includes('meituan.net');

  const isFont = /\.(woff|woff2|ttf|otf|eot)(\?|$)/i.test(url);

  const isCDNResource = url.includes('unpkg.com') ||
                        url.includes('cdnjs.cloudflare.com') ||
                        url.includes('cdn.jsdelivr.net') ||
                        url.includes('phoebeboo.github.io');

  const isHTMLPage = url.includes('.html') ||
                     (!url.includes('.') && !url.includes('?')) ||
                     url.endsWith('/');

  if (isImage || isFont || isCDNResource) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        }).catch(() => caches.match(event.request));
      })
    );
  } else if (isHTMLPage) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => null);
        return cachedResponse || fetchPromise;
      })
    );
  }
});

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'EPhone';
  const options = {
    body: data.body || '您有新消息',
    icon: data.icon || 'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png',
    badge: data.badge || 'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const chatId = event.notification.data?.chatId;
  const urlToOpen = chatId ? `/?openChat=${chatId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(focusedClient => {
              if (chatId) focusedClient.postMessage({ type: 'OPEN_CHAT', chatId });
              return focusedClient;
            });
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});
