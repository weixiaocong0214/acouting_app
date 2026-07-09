/* =========================================================
 * Service Worker —— 离线缓存
 * 原理：首次访问时缓存所有文件，之后断网也能用。
 * 更新策略：每次优先用缓存，后台静默更新。
 * ========================================================= */

// 缓存的名称（版本号，更新内容时改版本号即可刷新缓存）
const CACHE_NAME = "accounting-v1";

// 需要缓存的文件列表
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ============ 安装：预缓存所有文件 ============
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log("[SW] 正在缓存文件...");
      return cache.addAll(FILES_TO_CACHE);
    }).then(function() {
      // 强制激活新的 Service Worker（跳过等待）
      return self.skipWaiting();
    })
  );
});

// ============ 激活：清理旧缓存 ============
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          console.log("[SW] 删除旧缓存:", key);
          return caches.delete(key);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ============ 拦截请求：缓存优先策略 ============
self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 已有缓存：先用缓存，后台更新
        fetchAndUpdate(event.request);
        return cached;
      }
      // 没有缓存：从网络获取并缓存
      return fetchAndUpdate(event.request);
    })
  );
});

// 后台获取并更新缓存
function fetchAndUpdate(request) {
  return fetch(request).then(function(response) {
    // 只缓存成功的响应
    if (!response || response.status !== 200) {
      return response;
    }
    // 克隆响应（响应只能读取一次）
    var responseClone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(request, responseClone);
    });
    return response;
  }).catch(function() {
    // 网络失败 + 无缓存 → 返回空（首页已缓存所以不会到这里）
    return new Response("离线状态，请连接网络后重试");
  });
}
