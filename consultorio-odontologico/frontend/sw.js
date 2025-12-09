// Service Worker básico para el Consultorio Odontológico
// Este archivo se crea para evitar errores 404, pero está deshabilitado por ahora

const CACHE_NAME = 'consultorio-odontologico-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/css/styles.css',
    '/css/calendar.css',
    '/js/app.js',
    '/js/api.js',
    '/js/admin.js',
    '/js/auth.js',
    '/js/appointments.js',
    '/js/calendar.js',
    '/js/error-handler.js',
    '/images/logo-blanco.png',
    '/images/nuevo logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker: Activado');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Limpiar caches antiguos
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Intercepción de requests (fetch)
self.addEventListener('fetch', function(event) {
    // Solo manejar requests GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // No cachear requests de API
    if (event.request.url.includes('/api/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Si está en cache, devolverlo
                if (response) {
                    return response;
                }
                
                // Si no está en cache, hacer fetch normal
                return fetch(event.request).then(function(response) {
                    // Verificar que la response sea válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clonar la response para poder usarla
                    const responseToCache = response.clone();
                    
                    // Agregar al cache
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
    );
});

// Manejo de errores
self.addEventListener('error', function(event) {
    console.error('❌ Service Worker Error:', event.error);
});

console.log('🦷 Service Worker del Consultorio Odontológico cargado');