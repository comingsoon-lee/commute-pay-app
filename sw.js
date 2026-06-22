const CACHE_NAME = 'commute-pay-v8';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './store.js',
  './app.js',
  './manifest.json',
  './icon-512.png'
];

// 서비스 워커 설치 및 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 기존 캐시 삭제 및 활성화
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 캐시 우선, 네트워크 폴백 전략
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // 유효한 응답이 아닌 경우 캐싱하지 않고 반환
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // 동적 캐싱 (원하는 경우 주석 해제하여 활성화)
        /*
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        */
        
        return response;
      });
    })
  );
});
