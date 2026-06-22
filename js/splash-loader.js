// Splash Screen Loader - Hỗ trợ thiết kế mới
(function () {
    'use strict';
    
    // Record start time just in case other scripts check it
    window.splashStartTime = Date.now();

    var pageEnabled = false;

    function enablePage() {
        if (pageEnabled) return;
        pageEnabled = true;

        if (document.body && !document.body.classList.contains('splash-ready')) {
            document.body.classList.add('splash-ready');
        }
        
        // Find the splashLoader element
        var loader = document.getElementById('splashLoader');
        if (loader && !loader.classList.contains('splash-fade-out')) {
            var progressText = document.getElementById('splashProgressText');
            var progressBar = document.getElementById('splashProgressBar');
            
            var startTime = Date.now();
            var duration = 1200; // Wait for 1.2s to show off the splash screen
            
            function updateProgress() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(elapsed / duration, 1);
                // Non-linear easing for cooler effect (eases out)
                var easeProgress = 1 - Math.pow(1 - progress, 3);
                var percent = Math.floor(easeProgress * 100);
                
                if (progressText) progressText.innerText = percent + '%';
                if (progressBar) progressBar.style.width = percent + '%';
                
                if (progress < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    setTimeout(function() {
                        loader.classList.add('splash-fade-out');
                    }, 50);
                }
            }
            
            requestAnimationFrame(updateProgress);
        }
    }

    // Try to enable page as early as possible
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        enablePage();
    } else {
        document.addEventListener('DOMContentLoaded', enablePage);
        window.addEventListener('load', enablePage);
    }

    // Fallback: Force enable after 3 seconds no matter what
    setTimeout(enablePage, 3000);
})();
