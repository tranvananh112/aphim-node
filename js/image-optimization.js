// Image Optimization & Lazy Loading + Progressive Blur-Up
class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.loadingImages = new Set();
        this.isMobile = window.innerWidth <= 768;
        // Re-check on resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        }, { passive: true });
    }

    // Optimize image URL with CDN parameters
    optimizeImageUrl(url, width = 400, quality = 80, isPriority = false) {
        if (!url) return 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22 style=%22background:%23111%22%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        let resolvedUrl = url;
        if (!resolvedUrl.startsWith('http')) {
            let filename = resolvedUrl.replace(/^\//, '');
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            resolvedUrl = "https://img.ophimimg.com/" + filename;
        }

        if (!resolvedUrl.includes('localhost') && !resolvedUrl.includes('127.0.0.1')) {
            // Bypass CDN cho thumbnail (giống Wesite Xem Phim Mới)
            if (isPriority === 'thumbnail') {
                return resolvedUrl;
            }

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
            return resolvedUrl;
        }

        return resolvedUrl;
    }

    getProgressiveUrls(url) {
        if (!url) return { placeholder: null, full: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22 style=%22background:%23111%22%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E' };

        let full = url;
        if (!full.startsWith('http')) {
            let filename = full.replace(/^\//, "");
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            full = "https://img.ophimimg.com/" + filename;
        }

        return { placeholder: null, full: full };
    }

    // ─────────────────────────────────────────────────────────────────
    // Apply progressive load lên một <img> element
    // imgEl: HTMLImageElement với class "img-progressive"
    // originalUrl: URL ảnh gốc (trước khi optimize)
    // ─────────────────────────────────────────────────────────────────
    applyProgressiveLoad(imgEl, originalUrl) {
        const { placeholder, full } = this.getProgressiveUrls(originalUrl);

        // Desktop hoặc không có placeholder → load thẳng, thêm class desktop
        if (!placeholder) {
            imgEl.classList.add('img-desktop');
            imgEl.src = full;
            return;
        }

        // Gán placeholder ngay lập tức → người dùng thấy nội dung tức thì
        imgEl.classList.add('img-loading');
        imgEl.src = placeholder;

        // Tải full-quality trong nền
        const fullImg = new Image();
        fullImg.onload = () => {
            // Swap sang full khi load xong
            imgEl.src = full;
            imgEl.classList.remove('img-loading');
            imgEl.classList.add('img-loaded');

            // Đánh dấu wrapper
            const wrap = imgEl.closest('.img-progressive-wrap');
            if (wrap) wrap.classList.add('img-wrap-loaded');
        };
        fullImg.onerror = () => {
            // Nếu lỗi: giữ placeholder hoặc fallback
            imgEl.classList.remove('img-loading');
            imgEl.classList.add('img-loaded');
        };
        fullImg.src = full;
    }

    // ─────────────────────────────────────────────────────────────────
    // Setup IntersectionObserver để trigger progressive load khi ảnh
    // vào viewport (kết hợp với lazy loading sẵn có)
    // ─────────────────────────────────────────────────────────────────
    setupProgressiveObserver() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load ngay tất cả
            document.querySelectorAll('img.img-progressive[data-original-src]').forEach(img => {
                this.applyProgressiveLoad(img, img.dataset.originalSrc);
            });
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const originalSrc = img.dataset.originalSrc;
                if (originalSrc && !img.dataset.progressiveStarted) {
                    img.dataset.progressiveStarted = '1';
                    this.applyProgressiveLoad(img, originalSrc);
                    obs.unobserve(img);
                }
            });
        }, {
            rootMargin: '80px 0px', // Bắt đầu load trước 80px khi vào viewport
            threshold: 0
        });

        document.querySelectorAll('img.img-progressive[data-original-src]').forEach(img => {
            observer.observe(img);
        });

        return observer;
    }

    // Preload image
    preloadImage(url) {
        if (this.imageCache.has(url)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, true);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Setup lazy loading for images
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;

                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px' // Start loading 50px before image enters viewport
            });

            // Observe all lazy-load images
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });

            return imageObserver;
        }
    }

    // Batch preload images
    async preloadImages(urls, batchSize = 5) {
        const batches = [];
        for (let i = 0; i < urls.length; i += batchSize) {
            batches.push(urls.slice(i, i + batchSize));
        }

        for (const batch of batches) {
            await Promise.allSettled(
                batch.map(url => this.preloadImage(url))
            );
        }
    }

    // Helper: tạo HTML img tag với progressive loading sẵn sàng
    // Dùng trong các section render card
    createProgressiveImgTag({ originalUrl, altText, extraClasses = '', extraAttrs = '' }) {
        const isMob = this.isMobile && originalUrl && originalUrl.includes('ophim.live');

        if (isMob) {
            // Mobile: dùng progressive, src ban đầu là empty, data-original-src để observer xử lý
            return `<img
                alt="${altText}"
                class="img-progressive img-loading ${extraClasses}"
                data-original-src="${originalUrl}"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                onerror="this.src='https://placehold.co/400x600?text=No+Image'"
                ${extraAttrs}
            />`;
        } else {
            // Desktop: load trực tiếp ảnh gốc
            return `<img
                alt="${altText}"
                class="img-progressive img-desktop ${extraClasses}"
                src="${originalUrl}"
                onerror="this.src='https://placehold.co/400x600?text=No+Image'"
                loading="lazy"
                ${extraAttrs}
            />`;
        }
    }
}

// Initialize image optimizer
const imageOptimizer = new ImageOptimizer();

// Setup lazy loading và progressive observer on page load
document.addEventListener('DOMContentLoaded', () => {
    imageOptimizer.setupLazyLoading();
});

// Observe DOM changes cho progressive images mới được inject vào DOM
const _progressiveMutationObserver = new MutationObserver(() => {
    // Setup lazy loading cho data-src images
    imageOptimizer.setupLazyLoading();
    // Setup progressive observer cho img.img-progressive mới
    imageOptimizer.setupProgressiveObserver();
});

_progressiveMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Legacy mutation observer (kept for backward compatibility)
const mutationObserver = _progressiveMutationObserver;



