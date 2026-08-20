/**
 * Fix Placeholder Timeout & Dynamic Image Fallback
 * Tự động lấy ảnh từ PhimAPI nếu ảnh Ophim bị lỗi.
 */

(function () {
    'use strict';

    // Local SVG placeholder
    const PLACEHOLDER = {
        poster: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%231e202c" width="400" height="600"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E',
        backdrop: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect fill="%231e202c" width="640" height="360"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
    };

    const imageCache = new Map(); // slug -> Promise<url|null>

    function getSlugFromImg(img) {
        if (img.dataset.tmdbSlug) return img.dataset.tmdbSlug;
        const a = img.closest('a');
        if (a && a.href) {
            try {
                const url = new URL(a.href, window.location.origin);
                if (url.searchParams.has('slug')) return url.searchParams.get('slug');
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length > 0) return parts[parts.length - 1];
            } catch (e) {}
        }
        return null;
    }

    async function getPhimApiImage(slug, isBackdrop) {
        if (imageCache.has(slug)) return imageCache.get(slug);

        const promise = fetch(`https://phimapi.com/phim/${slug}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.status && data.movie) {
                    const thumb = data.movie.thumb_url || '';
                    const poster = data.movie.poster_url || '';
                    
                    let targetImg = isBackdrop ? (poster || thumb) : (thumb || poster);
                    if (!targetImg) return null;
                    
                    return targetImg.startsWith('http') ? targetImg : \`https://phimimg.com/\${targetImg}\`;
                }
                return null;
            })
            .catch(() => null);

        imageCache.set(slug, promise);
        return promise;
    }

    // Fix tất cả images có onerror
    function fixPlaceholders() {
        document.querySelectorAll('img[onerror]').forEach(img => {
            // Remove the inline onerror attribute so we control it entirely
            img.removeAttribute('onerror');
            
            // Wait until it actually errors
            img.addEventListener('error', async function fallbackHandler() {
                // Prevent infinite loop
                if (this.dataset.fallbackTried === '2') {
                    return;
                }

                const isBackdrop = this.classList.contains('backdrop') ||
                    this.closest('.aspect-video') !== null ||
                    this.width > this.height;

                const fallbackSvg = isBackdrop ? PLACEHOLDER.backdrop : PLACEHOLDER.poster;
                const slug = getSlugFromImg(this);

                if (!this.dataset.fallbackTried && slug) {
                    this.dataset.fallbackTried = '1';
                    // Try fetching from PhimAPI
                    try {
                        const newUrl = await getPhimApiImage(slug, isBackdrop);
                        if (newUrl) {
                            this.src = newUrl;
                            return;
                        }
                    } catch (e) {}
                }

                // If PhimAPI fails or no slug found, use SVG
                this.dataset.fallbackTried = '2';
                this.src = fallbackSvg;
            }, { once: false }); // Allow running again if the new URL also fails
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixPlaceholders);
    } else {
        fixPlaceholders();
    }

    // Watch for dynamically added images
    const observer = new MutationObserver(() => {
        fixPlaceholders();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('✅ Dynamic Image Fallback loaded - Will try PhimAPI on error!');
})();
