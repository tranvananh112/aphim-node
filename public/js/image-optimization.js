// Image Optimization & OPhim CDN Service
class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.loadingImages = new Set();
        this.isMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        }, { passive: true });
    }

    // Helper: Normalize image URL to absolute OPhim CDN URL (phimimg.com)
    resolveUrl(url, fallbackUrl = '') {
        let raw = url || fallbackUrl;
        if (!raw) return 'https://via.placeholder.com/400x600?text=No+Image';

        if (raw.startsWith('http')) return raw;
        
        if (!raw.startsWith('uploads/movies/')) {
            raw = 'uploads/movies/' + raw.replace(/^\//, '');
        }
        return 'https://phimimg.com/' + raw;
    }

        optimizeImageUrl(url, width = 400, quality = 80, isPriority = false) {
        if (!url) return 'https://via.placeholder.com/400x600?text=No+Image';
        
        let resolvedUrl = url;
        if (!resolvedUrl.startsWith('http')) {
            resolvedUrl = "https://phimimg.com/" + resolvedUrl.replace(/^\//, '');
        }
        if (resolvedUrl.includes('phimimg.com')) {
            return resolvedUrl;
        }


        if (!resolvedUrl.includes('localhost') && !resolvedUrl.includes('127.0.0.1')) {
            let targetWidth = width;
            let targetQuality = quality;

            if (typeof this.isMobile !== 'undefined' && !this.isMobile) {
                targetQuality = Math.min(quality || 85, 90);
                if (targetQuality < 80) targetQuality = 85;
                targetWidth = Math.max(width, 800);
                if (isPriority) {
                    targetWidth = Math.max(width, 1920);
                    targetQuality = 90;
                }
            } else {
                if (isPriority) {
                    targetWidth = Math.max(width, 1200); 
                    targetQuality = Math.max(quality || 90, 90); 
                } else {
                    targetWidth = Math.min(width, 600);
                    targetQuality = Math.min(quality || 75, 75);
                }
            }
            
            const cleanUrl = resolvedUrl.replace(/^https?:\/\//, '');
            return "https://i0.wp.com/" + cleanUrl + "?w=" + targetWidth + "&quality=" + targetQuality + "&strip=all";
        }

        return resolvedUrl;
    }

    getProgressiveUrls(url) {
        if (!url) return { placeholder: null, full: 'https://via.placeholder.com/400x600?text=No+Image' };

        let full = url;
        if (!full.startsWith('http')) {
            full = "https://phimimg.com/" + full.replace(/^\//, "");
        }

        if ((typeof this.isMobile !== 'undefined' && !this.isMobile) || (!full.includes('ophim') && !full.includes('opstream'))) {
            return { placeholder: null, full: full };
        }

        const cleanUrl = full.replace(/^https?:\/\//, '');
        return {
            placeholder: "https://i0.wp.com/" + cleanUrl + "?w=20&quality=20&strip=all",
            full: "https://i0.wp.com/" + cleanUrl + "?w=600&quality=82&strip=all"
        };
    }

    applyProgressiveLoad(imgEl, originalUrl) {
        const full = this.resolveUrl(originalUrl);
        imgEl.classList.add('img-desktop');
        imgEl.src = full;
    }

    setupProgressiveObserver() {
        document.querySelectorAll('img.img-progressive[data-original-src]').forEach(img => {
            this.applyProgressiveLoad(img, img.dataset.originalSrc);
        });
    }

    preloadImage(url) {
        const resolved = this.resolveUrl(url);
        if (this.imageCache.has(resolved)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(resolved, true);
                resolve();
            };
            img.onerror = reject;
            img.src = resolved;
        });
    }

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = this.resolveUrl(src);
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, { rootMargin: '100px' });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
            return imageObserver;
        }
    }

    async preloadImages(urls, batchSize = 5) {
        const batches = [];
        for (let i = 0; i < urls.length; i += batchSize) {
            batches.push(urls.slice(i, i + batchSize));
        }
        for (const batch of batches) {
            await Promise.allSettled(batch.map(url => this.preloadImage(url)));
        }
    }

    createProgressiveImgTag({ originalUrl, altText, extraClasses = '', extraAttrs = '' }) {
        const full = this.resolveUrl(originalUrl);
        const fallbackHandler = "if(!this.dataset.triedOphimCdn && this.src.includes('phimimg.com')){this.dataset.triedOphimCdn=1;this.src=this.src.replace('phimimg.com','img.phimapi.com');}else{this.onerror=null;this.src='https://via.placeholder.com/400x600?text=No+Image';}";
        return `<img
            alt="${altText}"
            class="img-progressive img-desktop ${extraClasses}"
            src="${full}"
            onerror="${fallbackHandler}"
            loading="lazy"
            ${extraAttrs}
        />`;
    }
}

const imageOptimizer = new ImageOptimizer();
window.imageOptimizer = imageOptimizer;

document.addEventListener('DOMContentLoaded', () => {
    imageOptimizer.setupLazyLoading();
});

const _progressiveMutationObserver = new MutationObserver(() => {
    imageOptimizer.setupLazyLoading();
    imageOptimizer.setupProgressiveObserver();
});

_progressiveMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
});

const mutationObserver = _progressiveMutationObserver;

