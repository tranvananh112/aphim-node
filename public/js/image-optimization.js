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

    // Helper: Normalize image URL to absolute OPhim CDN URL (img.ophim.live)
    resolveUrl(url, fallbackUrl = '') {
        let raw = url || fallbackUrl;
        if (!raw) return 'https://via.placeholder.com/400x600?text=No+Image';

        // Strip any repeated uploads/movies/ prefixes or domain prefix
        raw = raw.replace(/^(https?:\/\/[^\/]+\/)?(\/)?(uploads\/movies\/)+/i, '');
        raw = raw.replace(/^uploads\//i, '');

        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return 'https://img.ophim.live/uploads/movies/' + raw;
    }

    optimizeImageUrl(url, width = 400, quality = 80, isPriority = false, fallbackUrl = '') {
        return this.resolveUrl(url, fallbackUrl);
    }

    getProgressiveUrls(url) {
        const full = this.resolveUrl(url);
        return { placeholder: null, full };
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
        const fallbackHandler = "if(!this.dataset.triedOphimCdn && this.src.includes('img.ophim.live')){this.dataset.triedOphimCdn=1;this.src=this.src.replace('img.ophim.live','img.ophim1.com');}else{this.onerror=null;this.src='https://via.placeholder.com/400x600?text=No+Image';}";
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
