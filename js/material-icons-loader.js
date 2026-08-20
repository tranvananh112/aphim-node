// Material Icons Font Loader - Optimized for Mobile
(function () {
    'use strict';

    let fontsLoaded = false;

    // Check if Material Icons font is loaded
    function checkFontLoaded() {
        if (fontsLoaded) return true;

        if (document.fonts && document.fonts.check) {
            // Modern browsers with Font Loading API
            const loaded = document.fonts.check('24px "Material Icons Round"') ||
                document.fonts.check('24px "Material Icons"');
            if (loaded) fontsLoaded = true;
            return loaded;
        }
        return false;
    }

    // Add loaded class to all material icons
    function markIconsAsLoaded() {
        const icons = document.querySelectorAll('.material-icons-round, .material-icons, .material-icons-outlined, .material-symbols-outlined');
        console.log(`📦 Marking ${icons.length} icons as loaded`);
        icons.forEach(icon => {
            icon.classList.add('material-icons-loaded');
        });
        fontsLoaded = true;
    }

    // Force mark icons as loaded (fallback)
    function forceMarkLoaded() {
        if (!fontsLoaded) {
            console.log('⚠️ Font loading timeout - forcing icons to show');
            markIconsAsLoaded();
        }
    }

    // Wait for fonts to load
    function waitForFonts() {
        if (checkFontLoaded()) {
            markIconsAsLoaded();
            return;
        }

        if (document.fonts && document.fonts.ready) {
            // Set a shorter timeout as fallback (500ms instead of 1500ms)
            const timeout = setTimeout(forceMarkLoaded, 500);

            document.fonts.ready.then(() => {
                clearTimeout(timeout);
                markIconsAsLoaded();
            }).catch(() => {
                clearTimeout(timeout);
                forceMarkLoaded();
            });
        } else {
            // Fallback for older browsers - faster timeout
            setTimeout(forceMarkLoaded, 300);
        }
    }

    // Observer for dynamically added icons
    function observeNewIcons() {
        const observer = new MutationObserver((mutations) => {
            if (!fontsLoaded && !checkFontLoaded()) return;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the node itself is an icon
                        if (node.classList && (
                            node.classList.contains('material-icons-round') ||
                            node.classList.contains('material-icons') ||
                            node.classList.contains('material-icons-outlined') ||
                            node.classList.contains('material-symbols-outlined')
                        )) {
                            node.classList.add('material-icons-loaded');
                        }

                        // Check for icon children
                        const icons = node.querySelectorAll && node.querySelectorAll('.material-icons-round, .material-icons, .material-icons-outlined, .material-symbols-outlined');
                        if (icons && icons.length > 0) {
                            icons.forEach(icon => icon.classList.add('material-icons-loaded'));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize immediately
    function init() {
        waitForFonts();
        observeNewIcons();
    }

    // Start as early as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also check on window load as a final fallback
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!fontsLoaded) {
                console.log('🔄 Window loaded - final check');
                forceMarkLoaded();
            }
        }, 500);
    });
})();
