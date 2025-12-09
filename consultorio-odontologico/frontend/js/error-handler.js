// Script de manejo de errores global y recuperación automática
(function() {
    'use strict';
    
    // Contador de errores para evitar loops infinitos
    let errorCount = 0;
    const MAX_ERRORS = 5;
    
    // Función para manejar errores de carga de scripts
    function handleScriptError(event) {
        errorCount++;
        
        if (errorCount > MAX_ERRORS) {
            console.warn('🚨 Demasiados errores de script, deteniendo intentos de recuperación');
            return;
        }
        
        const failedScript = event.target || event.srcElement;
        const scriptSrc = failedScript.src;
        
        console.error('❌ Error cargando script:', scriptSrc);
        
        // Si es un CDN externo, intentar con un CDN alternativo
        if (scriptSrc.includes('cdn.jsdelivr.net')) {
            console.log('🔄 Intentando CDN alternativo para:', scriptSrc);
            retryScriptWithAlternativeCDN(failedScript);
        } else if (scriptSrc.includes('cdnjs.cloudflare.com')) {
            console.log('🔄 Intentando CDN alternativo para:', scriptSrc);
            retryScriptWithJsDelivrCDN(failedScript);
        } else {
            // Para scripts locales, intentar recargar
            console.log('🔄 Reintentando cargar script local:', scriptSrc);
            retryLocalScript(failedScript);
        }
    }
    
    function retryScriptWithAlternativeCDN(failedScript) {
        const originalSrc = failedScript.src;
        let alternativeSrc = null;
        
        // Bootstrap
        if (originalSrc.includes('bootstrap')) {
            alternativeSrc = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js';
        }
        // Chart.js
        else if (originalSrc.includes('chart.js')) {
            alternativeSrc = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.min.js';
        }
        
        if (alternativeSrc) {
            loadScriptWithFallback(alternativeSrc, failedScript);
        }
    }
    
    function retryScriptWithJsDelivrCDN(failedScript) {
        const originalSrc = failedScript.src;
        let alternativeSrc = null;
        
        // Bootstrap
        if (originalSrc.includes('bootstrap')) {
            alternativeSrc = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
        }
        // Chart.js
        else if (originalSrc.includes('Chart.js')) {
            alternativeSrc = 'https://cdn.jsdelivr.net/npm/chart.js';
        }
        
        if (alternativeSrc) {
            loadScriptWithFallback(alternativeSrc, failedScript);
        }
    }
    
    function retryLocalScript(failedScript) {
        // Para scripts locales, intentar recargar después de un breve delay
        setTimeout(() => {
            const newScript = document.createElement('script');
            newScript.src = failedScript.src + '?retry=' + Date.now();
            newScript.onerror = handleScriptError;
            newScript.onload = () => {
                console.log('✅ Script local recargado exitosamente:', failedScript.src);
            };
            
            failedScript.parentNode.replaceChild(newScript, failedScript);
        }, 1000);
    }
    
    function loadScriptWithFallback(src, originalScript) {
        const newScript = document.createElement('script');
        newScript.src = src;
        newScript.onerror = handleScriptError;
        newScript.onload = () => {
            console.log('✅ Script cargado desde CDN alternativo:', src);
        };
        
        originalScript.parentNode.replaceChild(newScript, originalScript);
    }
    
    // Función para verificar si los servicios críticos están disponibles
    function checkCriticalServices() {
        // Verificar Bootstrap
        if (typeof bootstrap === 'undefined') {
            console.warn('⚠️ Bootstrap no está disponible');
        }
        
        // Verificar Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js no está disponible');
        }
        
        // Verificar API personalizada
        if (typeof ServicioAPI === 'undefined') {
            console.warn('⚠️ ServicioAPI no está disponible');
        }
    }
    
    // Función para mostrar notificación de error al usuario
    function showUserNotification(message, type = 'warning') {
        // Solo si hay una función showError/showWarning disponible
        if (typeof showError === 'function' && type === 'error') {
            showError(message);
        } else if (typeof showWarning === 'function' && type === 'warning') {
            showWarning(message);
        } else {
            // Fallback: crear notificación simple
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#f8d7da' : '#fff3cd'};
                color: ${type === 'error' ? '#721c24' : '#856404'};
                padding: 15px;
                border-radius: 5px;
                border: 1px solid ${type === 'error' ? '#f5c6cb' : '#ffeaa7'};
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = 'float: right; background: none; border: none; font-size: 18px; cursor: pointer;';
            closeButton.addEventListener('click', function() {
                notification.remove();
            });
            
            notification.innerHTML = `
                <strong>${type === 'error' ? '❌ Error' : '⚠️ Advertencia'}</strong><br>
                ${message}
            `;
            notification.appendChild(closeButton);
            
            document.body.appendChild(notification);
            
            // Auto-remover después de 10 segundos
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 10000);
        }
    }
    
    // Capturar errores globales de JavaScript
    window.addEventListener('error', function(event) {
        if (event.target !== window) {
            // Es un error de carga de recurso (script, imagen, CSS, etc.)
            handleScriptError(event);
        } else {
            // Es un error de JavaScript en tiempo de ejecución
            console.error('🐛 Error de JavaScript:', event.error);
            
            if (event.error && event.error.message.includes('404')) {
                showUserNotification(
                    'Algunos recursos no se pudieron cargar. La funcionalidad puede estar limitada.',
                    'warning'
                );
            }
        }
    });
    
    // Verificar servicios críticos después de que la página haya cargado
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(checkCriticalServices, 2000);
    });
    
    // Función de utilidad para recargar la página si hay demasiados errores
    window.reloadIfTooManyErrors = function() {
        if (errorCount >= MAX_ERRORS) {
            if (confirm('Se detectaron múltiples errores de carga. ¿Desea recargar la página?')) {
                window.location.reload();
            }
        }
    };
    
    console.log('🛡️ Sistema de manejo de errores de scripts iniciado');
})();