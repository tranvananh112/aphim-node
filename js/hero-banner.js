// ================================================================
// A PHIM — Hero Banner v10
// Interactive Slide System: Click Thumbnail + Swipe/Drag
// + Auto-return to Admin Banner sau 6 giây không tương tác
// ================================================================

// ── State ──────────────────────────────────────────────────────
let currentAdminBanner = null;   // Banner admin mặc định (index 0)
let heroSlides = [];     // [adminBanner, thumb1, thumb2, ...]
let currentSlideIndex = 0;
let isTransitioning = false;
let autoReturnTimer = null;   // Timer tự động về index 0
const AUTO_RETURN_DELAY = 6000;   // 6 giây sau khi không tương tác

// ── Entry Point ─────────────────────────────────────────────────
async function loadHeroBanner() {

    // 1. INSTANT: đọc cache LocalStorage hiển thị ngay
    try {
        const cachedBanner = localStorage.getItem('cinestream_active_banner');
        if (cachedBanner) {
            const cached = JSON.parse(cachedBanner);
            currentAdminBanner = convertBannerToMovie(cached);
            heroSlides = [currentAdminBanner];
            renderHeroBannerContent(currentAdminBanner, true);
        }
    } catch (e) { console.warn('Hero cache read error:', e); }

    // 2. BACKGROUND: fetch từ backend
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        if (!apiUrl) throw new Error('API URL undefined');

        const res = await fetch(`${apiUrl}/api/banners/active`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success && data.data) {
            localStorage.setItem('cinestream_active_banner', JSON.stringify(data.data));
            const newMovie = convertBannerToMovie(data.data);

            if (!currentAdminBanner || currentAdminBanner.slug !== newMovie.slug) {
                currentAdminBanner = newMovie;
                heroSlides[0] = currentAdminBanner;
                if (currentSlideIndex === 0) renderHeroBannerContent(currentAdminBanner, false);
            }
        } else {
            localStorage.removeItem('cinestream_active_banner');
            if (!currentAdminBanner) await loadFallbackBanner();
        }
    } catch (err) {
        console.error('Banner API error:', err);
        if (!currentAdminBanner) await loadFallbackBanner();
    }

    // 3. Load thumbnail movies (chạy ngầm)
    setTimeout(loadThumbnailMovies, 120);

    // 4. Gắn swipe handler
    attachSwipeHandler();
}

// ── Fallback từ ophim API ────────────────────────────────────────
async function loadFallbackBanner() {
    try {
        const res = await fetch('https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1', {
            headers: { accept: 'application/json' }
        });
        const data = await res.json();
        if (data.status === 'success' && data.data?.items?.length > 0) {
            currentAdminBanner = data.data.items[0];
            heroSlides[0] = currentAdminBanner;
            renderHeroBannerContent(currentAdminBanner, false);
        } else {
            showHeroText();
        }
    } catch (e) {
        console.error('Fallback banner error:', e);
        showHeroText();
    }
}

// ── Convert banner API format → movie format ────────────────────
function convertBannerToMovie(banner) {
    return {
        slug: banner.movieSlug || banner.slug,
        name: banner.name,
        origin_name: banner.originName || banner.origin_name,
        thumb_url: banner.thumbUrl || banner.thumb_url,
        poster_url: banner.posterUrl || banner.poster_url,
        content: banner.content,
        year: banner.year,
        quality: banner.quality,
        lang: banner.lang,
        episode_current: banner.episodeCurrent || banner.episode_current,
        category: banner.category || [],
        tmdb: banner.tmdb || {},
        imdb: banner.imdb || {}
    };
}

// ================================================================
// AUTO-RETURN TIMER — tự về Admin Banner sau N giây bỏ tương tác
// ================================================================
function startAutoReturnTimer() {
    clearAutoReturnTimer();
    // Chỉ đặt timer nếu đang ở slide khác 0
    if (currentSlideIndex !== 0) {
        autoReturnTimer = setTimeout(() => {
            if (currentSlideIndex !== 0) {
                switchHeroSlide(0, false, true); // isAutoReturn = true (smooth)
            }
        }, AUTO_RETURN_DELAY);
    }
}

function clearAutoReturnTimer() {
    if (autoReturnTimer) {
        clearTimeout(autoReturnTimer);
        autoReturnTimer = null;
    }
}

// ── Reset timer khi user tương tác ──────────────────────────────
function resetAutoReturn() {
    clearAutoReturnTimer();
    startAutoReturnTimer();
}

// ================================================================
// SLIDE SWITCHING — Core Logic (nâng cấp mượt mà)
// ================================================================
function switchHeroSlide(newIndex, skipThumbnailHighlight, isAutoReturn) {
    if (isTransitioning) return;
    if (newIndex === currentSlideIndex) return;
    if (newIndex < 0 || newIndex >= heroSlides.length) return;

    isTransitioning = true;

    if (!isAutoReturn) clearAutoReturnTimer();

    const movie = heroSlides[newIndex];

    // Preload ảnh mới NGAY (song song với fade out)
    const isMobile = window.innerWidth < 768;
    const rawUrl = movie.poster_url || movie.thumb_url;
    const optUrl = buildImageUrl(rawUrl, 1200);
    if (optUrl) {
        const preImg = new Image();
        preImg.src = optUrl; // bắt đầu tải ngay, không chờ
    }

    // ── PHASE 1: Fade OUT (nhanh hơn) ──
    const heroImage = document.getElementById('heroImage');
    const heroContent = document.getElementById('heroContent');
    if (heroImage) heroImage.classList.add('hero-img-out');
    if (heroContent) heroContent.classList.add('hero-content-out');

    // ── PHASE 2 (160ms — đủ để fade out, ngắn nhất có thể) ──
    setTimeout(() => {
        currentSlideIndex = newIndex;

        // Update text ngay (vẫn đang invisible)
        updateHeroBannerText(movie);
        updateHeroButtons(movie);
        setupHeroActions(movie);
        fetchLatestEpisodeCount(movie);

        if (!skipThumbnailHighlight) updateThumbnailActive(newIndex);

        // Update placeholder background immediately
        const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
        if (placeholder && movie) {
            const rawPlaceholderUrl = movie.poster_url || movie.thumb_url;
            const optPlaceholderUrl = buildImageUrl(rawPlaceholderUrl, 600);
            if (optPlaceholderUrl) {
                placeholder.style.backgroundImage = `url('${optPlaceholderUrl}')`;
                placeholder.style.opacity = '0.35';
            }
        }

        // ── Swap ảnh: không chờ load xong, swap và fade in luôn ──
        if (heroImage && optUrl) {
            heroImage.setAttribute('data-current-src', optUrl);

            // Kiểm tra ảnh đã cache chưa (nếu preload xong thì swap ngay)
            const cached = new Image();
            cached.onload = () => {
                heroImage.src = optUrl;
                heroImage.classList.remove('opacity-0', 'hero-img-out');
                heroImage.classList.add('hero-img-in');
                setTimeout(() => heroImage.classList.remove('hero-img-in'), 500);
            };
            cached.onerror = () => {
                heroImage.classList.remove('opacity-0', 'hero-img-out');
            };
            // src đã được preload song song → thường complete ngay
            cached.src = optUrl;
            if (cached.complete && cached.naturalWidth > 0) {
                // Ảnh đã có trong cache browser → hiện ngay
                heroImage.src = optUrl;
                heroImage.classList.remove('opacity-0', 'hero-img-out');
                heroImage.classList.add('hero-img-in');
                setTimeout(() => heroImage.classList.remove('hero-img-in'), 500);
            }
        } else if (heroImage) {
            heroImage.classList.remove('opacity-0', 'hero-img-out');
        }

        // ── Fade IN text ngay (không delay) ──
        if (heroContent) {
            heroContent.classList.remove('opacity-0', 'hero-content-out');
            heroContent.classList.add('hero-content-in');
            setTimeout(() => heroContent.classList.remove('hero-content-in'), 500);
        }

        setTimeout(() => {
            isTransitioning = false;
            if (!isAutoReturn && newIndex !== 0) startAutoReturnTimer();
        }, 350);

    }, 160);
}

// ── Build optimized image URL ────────────────────────────────────
function buildImageUrl(rawUrl, width) {
    if (!rawUrl) return '';
    if (typeof movieAPI !== 'undefined' && movieAPI.getImageURL) {
        return movieAPI.getImageURL(rawUrl, width, 90, true);
    }
    return rawUrl.startsWith('http')
        ? rawUrl
        : `https://img.ophim.live/uploads/movies/${rawUrl}`;
}

// ── Update chỉ phần text của hero banner ───────────────────────
function updateHeroBannerText(movie) {
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroBadges = document.getElementById('heroBadges');
    const heroGenres = document.getElementById('heroGenres');
    const heroDescription = document.getElementById('heroDescription');

    if (heroTitle) heroTitle.textContent = movie.name || '';
    if (heroSubtitle) heroSubtitle.textContent = movie.origin_name || '';

    if (heroBadges) {
        const rating = movie.tmdb?.vote_average ? movie.tmdb.vote_average.toFixed(1) : 'N/A';
        
        let epText = movie.episode_current || '';
        if (epText) {
            const lcText = epText.toLowerCase().trim();
            if (lcText === 'tập' || lcText === 'tập ' || lcText.includes('hoàn tất') || lcText.includes('full')) {
                epText = 'Full';
            }
        }

        heroBadges.innerHTML = `
            <span class="bg-white text-black px-3 md:px-4 py-1.5 rounded-md font-bold text-[13px] md:text-sm">IMDb ${rating}</span>
            <span class="border border-white/90 bg-transparent px-3 md:px-4 py-1.5 rounded-md text-white font-medium text-[13px] md:text-sm backdrop-blur-sm">${movie.year || '2024'}</span>
            ${epText
                ? `<span data-ep-badge class="border border-white/90 bg-transparent px-3 md:px-4 py-1.5 rounded-md text-white font-medium text-[13px] md:text-sm backdrop-blur-sm">${epText}</span>`
                : `<span data-ep-badge class="border border-white/90 bg-transparent px-3 md:px-4 py-1.5 rounded-md text-white font-medium text-[13px] md:text-sm backdrop-blur-sm hidden"></span>`}
            <span class="border border-white/90 bg-transparent px-3 md:px-4 py-1.5 rounded-md text-white font-medium text-[13px] md:text-sm backdrop-blur-sm">${movie.quality || 'HD'}</span>
        `;
    }

    if (heroGenres && movie.category) {
        heroGenres.innerHTML = movie.category.slice(0, 5).map(cat => `
            <button style="
                background: rgba(30,32,50,0.75);
                border: 1px solid rgba(255,255,255,0.25);
                padding: 6px 14px;
                border-radius: 8px;
                color: rgba(255,255,255,0.9);
                font-size: 13px;
                font-weight: 600;
                backdrop-filter: blur(8px);
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
                white-space: nowrap;
            "
            onmouseover="this.style.background='rgba(50,55,80,0.85)';this.style.borderColor='rgba(255,255,255,0.4)';"
            onmouseout="this.style.background='rgba(30,32,50,0.75)';this.style.borderColor='rgba(255,255,255,0.25)';">
                ${cat.name}
            </button>
        `).join('');
    }


    if (heroDescription) {
        heroDescription.textContent = movie.content
            ? movie.content.replace(/<[^>]*>/g, '').substring(0, 180) + '...'
            : 'Đang tải thông tin phim...';
    }
}

// ── Update href nút play + info ─────────────────────────────────
function updateHeroButtons(movie) {
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroInfoBtn = document.getElementById('heroInfoBtn');
    if (heroPlayBtn) heroPlayBtn.href = `/phim/${movie.slug}`;
    if (heroInfoBtn) heroInfoBtn.href = `/phim/${movie.slug}`;
}

// ── Highlight thumbnail active ───────────────────────────────────
function updateThumbnailActive(slideIndex) {
    const thumbItems = document.querySelectorAll('.hero-thumb-item');
    thumbItems.forEach((el, i) => {
        // slideIndex 0 = admin banner → không có thumbnail active nào
        if (slideIndex > 0 && i === slideIndex - 1) {
            el.classList.add('hero-thumb-active');
        } else {
            el.classList.remove('hero-thumb-active');
        }
    });
}

// ================================================================
// SWIPE / DRAG HANDLER
// ================================================================
function attachSwipeHandler() {
    const heroEl = document.querySelector('main.relative.h-screen');
    if (!heroEl) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let swipeDir = null; // 'h' = horizontal, 'v' = vertical, null = unknown
    const SWIPE_THRESHOLD = 45;
    const AXIS_LOCK_PX = 8;  // px di chuyển để xác định hướng

    // ── TOUCH (Mobile) ───────────────────────────────────
    heroEl.addEventListener('touchstart', (e) => {
        // Bỏ qua nếu chạm vào thumbnail hoặc mục quan tâm/section khác
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swipeDir = null;
        clearAutoReturnTimer();
    }, { passive: true });

    heroEl.addEventListener('touchmove', (e) => {
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section')) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        // Xác định hướng sau khi di chuyển AXIS_LOCK_PX
        if (!swipeDir && (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)) {
            swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        }

        // Chỉ parallax nếu đang swipe ngang
        if (swipeDir === 'h') {
            const heroImage = document.getElementById('heroImage');
            if (heroImage && Math.abs(dx) < 110) {
                heroImage.style.transform = `scale(1.05) translateX(${dx * 0.025}px)`;
                heroImage.style.transition = 'none';
            }
        }
    }, { passive: true });

    heroEl.addEventListener('touchend', (e) => {
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section')) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        // Reset parallax image
        const heroImage = document.getElementById('heroImage');
        if (heroImage) {
            heroImage.style.transform = '';
            heroImage.style.transition = '';
        }

        // Bỏ qua nếu đang cuộn dọc hoặc không đủ ngưỡng
        if (swipeDir !== 'h' || Math.abs(dx) < SWIPE_THRESHOLD) {
            startAutoReturnTimer();
            return;
        }

        if (dx < 0) {
            switchHeroSlide(currentSlideIndex + 1);
        } else {
            switchHeroSlide(currentSlideIndex - 1);
        }

        swipeDir = null;
    }, { passive: true });

    // ── MOUSE (Desktop) ─────────────────────────────────
    heroEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('a, button, .hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, section')) return;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        clearAutoReturnTimer();
        heroEl.style.cursor = 'grabbing';
    });

    heroEl.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const heroImage = document.getElementById('heroImage');
        if (heroImage && Math.abs(dx) < 120) {
            heroImage.style.transform = `scale(1.05) translateX(${dx * 0.025}px)`;
            heroImage.style.transition = 'none';
        }
    });

    heroEl.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        heroEl.style.cursor = '';

        const heroImage = document.getElementById('heroImage');
        if (heroImage) {
            heroImage.style.transform = '';
            heroImage.style.transition = '';
        }

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) * 0.85) {
            startAutoReturnTimer();
            return;
        }

        if (dx < 0) {
            switchHeroSlide(currentSlideIndex + 1);
        } else {
            switchHeroSlide(currentSlideIndex - 1);
        }
    });

    heroEl.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            heroEl.style.cursor = '';
            const heroImage = document.getElementById('heroImage');
            if (heroImage) {
                heroImage.style.transform = '';
                heroImage.style.transition = '';
            }
            startAutoReturnTimer();
        }
    });

    // ── Scroll xuống → bắt đầu đếm ngược auto-return ───────────
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        // Khi user bắt đầu scroll khỏi hero, đặt auto-return
        if (currentSlideIndex !== 0) {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                startAutoReturnTimer();
            }, 300);
        }
    }, { passive: true });
}

// ================================================================
// LOAD THUMBNAILS
// ================================================================
async function loadThumbnailMovies() {
    let hasCache = false;
    // 1. Instant từ cache
    try {
        const cached = localStorage.getItem('cinestream_thumbnail_movies');
        if (cached) {
            const movies = JSON.parse(cached);
            if (Array.isArray(movies) && movies.length > 0) {
                applyThumbnails(convertThumbnailsFromAPI(movies));
                hasCache = true;
            }
        }
    } catch (e) { }

    // 2. Fetch fresh từ backend
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        if (!apiUrl) throw new Error('API URL undefined');

        const res = await fetch(`${apiUrl}/api/banners/thumbnails`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            localStorage.setItem('cinestream_thumbnail_movies', JSON.stringify(data.data));
            applyThumbnails(convertThumbnailsFromAPI(data.data));
            return;
        }
    } catch (err) {
        console.warn('Thumbnail API error, fallback VN:', err);
    }

    // 3. Fallback: phim Việt Nam (chỉ khi không có cache)
    if (!hasCache) {
        loadVietnameseThumbnailsFallback();
    }
}

function convertThumbnailsFromAPI(banners) {
    return banners.map(b => ({
        slug: b.movieSlug,
        name: b.name,
        origin_name: b.originName,
        thumb_url: b.thumbUrl,
        poster_url: b.posterUrl,
        year: b.year,
        content: b.content,
        quality: b.quality,
        lang: b.lang,
        episode_current: b.episodeCurrent,
        category: b.category || [],
        tmdb: b.tmdb || {},
        imdb: b.imdb || {}
    }));
}

async function loadVietnameseThumbnailsFallback() {
    try {
        const res = await fetch('https://ophim1.com/v1/api/quoc-gia/viet-nam?page=1', {
            headers: { accept: 'application/json' }
        });
        const data = await res.json();
        if (data.status === 'success' && data.data?.items) {
            applyThumbnails(data.data.items.slice(0, 10));
        }
    } catch (e) { console.error('VN fallback error:', e); }
}

// ── Áp dụng danh sách thumbnail vào slide system + DOM ──────────
function applyThumbnails(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;

    const adminBannerSlide = heroSlides[0] || currentAdminBanner;
    heroSlides = [adminBannerSlide, ...movies];

    renderThumbnails(movies);
    updateThumbnailActive(currentSlideIndex);

    // Preload tất cả ảnh thumbnail ngay sau khi render
    // → khi user click, ảnh đã sẵn sàng trong browser cache
    preloadSlideImages(movies);
}

// ── Preload ảnh ngầm cho tất cả slides ──────────────────────────
function preloadSlideImages(movies) {
    // Delay nhẹ để không tranh băng thông với initial hero image
    setTimeout(() => {
        movies.forEach((movie, i) => {
            const isMobile = window.innerWidth < 768;
            const rawUrl = movie.poster_url || movie.thumb_url;
            if (!rawUrl) return;
            const url = buildImageUrl(rawUrl, 1200);
            if (url) {
                const img = new Image();
                img.src = url;
                // Không cần xử lý onload/onerror — chỉ cần trigger cache
            }
        });
    }, 800); // Delay 800ms để hero image đầu tiên load trước
}

// ── Render thumbnail DOM với click handler ───────────────────────
function renderThumbnails(movies) {
    const container = document.getElementById('heroThumbnails');
    if (!container || !Array.isArray(movies) || movies.length === 0) return;

    container.innerHTML = movies.map((movie, i) => {
        const imgSrc = (typeof imageOptimizer !== 'undefined')
            ? imageOptimizer.optimizeImageUrl(movie.thumb_url || movie.poster_url, 300, 75)
            : buildImageUrl(movie.thumb_url || movie.poster_url, 300);

        const slideIndex = i + 1; // +1 vì index 0 là admin banner

        return `
        <div class="hero-thumb-item flex-shrink-0 snap-start"
             data-slide-index="${slideIndex}"
             data-movie-index="${i}"
             role="button"
             tabindex="0"
             title="${movie.name || ''}"
             onclick="switchHeroSlide(${slideIndex})">
            <div class="hero-thumb-poster responsive-thumb-width aspect-video rounded-md overflow-hidden bg-gray-900">
                <img
                    alt="${movie.name || ''}"
                    class="w-full h-full object-cover object-center"
                    src="${imgSrc}"
                    onerror="this.src='https://via.placeholder.com/150x85?text=No+Image'"
                    loading="lazy" />
            </div>
            <div class="hero-thumb-glow"></div>
        </div>`;
    }).join('');

    // Keyboard navigation
    container.querySelectorAll('.hero-thumb-item').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchHeroSlide(parseInt(el.getAttribute('data-slide-index')));
            }
        });
    });

    // ── Cuộn về đầu: item đầu tiên luôn hiển thị trước ──────────
    // Dùng setTimeout 0 để đảm bảo DOM đã render xong
    setTimeout(() => {
        container.scrollLeft = 0;
    }, 0);

    // Hover preview removed per user request
}

// ================================================================
// THUMBNAIL HOVER PREVIEW
// ================================================================
function previewHeroPoster(movie) {
    const heroImage = document.getElementById('heroImage');
    if (!heroImage || !movie) return;

    // Use poster_url (large cover image) NOT thumb_url
    const isMobile = window.innerWidth < 768;
    const posterUrl = movie.poster_url || movie.thumb_url;
    if (!posterUrl) return;

    const optUrl = buildImageUrl(posterUrl, 1200);
    if (!optUrl) return;

    // Fade out current image
    heroImage.style.opacity = '0.3';

    // Preload new image
    const img = new Image();
    img.onload = () => {
        heroImage.src = optUrl;
        heroImage.style.opacity = '1';
    };
    img.src = optUrl;

    // Update text content
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
}

function returnToCurrentSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= heroSlides.length) return;
    const movie = heroSlides[slideIndex];
    if (!movie) return;

    // Restore original slide
    const heroImage = document.getElementById('heroImage');
    if (!heroImage) return;

    const isMobile = window.innerWidth < 768;
    const posterUrl = movie.poster_url || movie.thumb_url;
    if (!posterUrl) return;

    const optUrl = buildImageUrl(posterUrl, 1200);
    if (!optUrl) return;

    heroImage.style.opacity = '0.3';

    const img = new Image();
    img.onload = () => {
        heroImage.src = optUrl;
        heroImage.style.opacity = '1';
    };
    img.src = optUrl;

    updateHeroBannerText(movie);
    updateHeroButtons(movie);
}

// ================================================================
// INITIAL RENDER (first load)
// ================================================================
function renderHeroBannerContent(movie, isInstant) {
    // Hiện text ngay lập tức — không chờ ảnh
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
    setupHeroActions(movie);
    showHeroText();
    fetchLatestEpisodeCount(movie);

    const heroImage = document.getElementById('heroImage');
    const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
    if (!heroImage) return;

    if (placeholder && movie) {
        const rawPlaceholderUrl = movie.poster_url || movie.thumb_url;
        const optPlaceholderUrl = buildImageUrl(rawPlaceholderUrl, 600);
        if (optPlaceholderUrl) {
            placeholder.style.backgroundImage = `url('${optPlaceholderUrl}')`;
            placeholder.style.opacity = '0.35';
        }
    }

    const isMobile = window.innerWidth < 768;
    const rawUrl = movie.poster_url || movie.thumb_url;
    const optUrl = buildImageUrl(rawUrl, 1200);
    if (!optUrl) return;

    heroImage.setAttribute('data-current-src', optUrl);

    if (isInstant) {
        // Cache hit → gán src ngay, fade in khi load
        heroImage.src = optUrl;
        showHeroImage();
    } else {
        // Bắt đầu load ảnh ngay, hiện với độ mờ nhẹ lập tức để browser render dần
        heroImage.style.opacity = '0.85';
        heroImage.src = optUrl; 
        
        // Ẩn placeholder mờ ngay sau 150ms để tối ưu tốc độ nhận diện
        setTimeout(() => {
            showHeroImage();
        }, 150);
        
        heroImage.onload = () => showHeroImage();
        if (heroImage.complete && heroImage.naturalWidth > 0) showHeroImage();
    }
}

// ================================================================
// HERO SHOW HELPERS
// ================================================================
function showHeroText() {
    const el = document.getElementById('heroContent');
    if (el) el.style.opacity = '1';
}

function showHeroImage() {
    const heroImage = document.getElementById('heroImage');
    const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
    if (heroImage) {
        heroImage.style.opacity = '1';
    }
    if (placeholder) {
        placeholder.style.opacity = '0';
        placeholder.style.transition = 'opacity 0.25s ease-out';
    }
}

// ================================================================
// EPISODE COUNT BADGE
// ================================================================
async function fetchLatestEpisodeCount(movie) {
    if (!movie?.slug) return;
    try {
        const res = await fetch(`https://ophim1.com/v1/api/phim/${movie.slug}`, {
            headers: { accept: 'application/json' }
        });
        const data = await res.json();
        if (data.status !== 'success' || !data.data?.item) return;

        const item = data.data.item;

        // Sync and update real description from database/API
        if (item.content) {
            const cleanContent = item.content.replace(/<[^>]*>/g, '').trim();
            const heroDescription = document.getElementById('heroDescription');
            if (heroDescription) {
                heroDescription.textContent = cleanContent.length > 180 
                    ? cleanContent.substring(0, 180) + '...'
                    : cleanContent;
            }
            movie.content = item.content; // Save so we don't refetch
        }

        let latestEpLabel = item.episode_current || '';
        const eps = item.episodes;
        if (Array.isArray(eps) && eps.length > 0) {
            const serverData = eps[0]?.server_data;
            if (Array.isArray(serverData) && serverData.length > 0) {
                const count = serverData.length;
                
                const lcLabel = latestEpLabel.toLowerCase().trim();
                // Preserve 'Full' if it's a single movie or already labeled as Full
                if (item.type === 'single' || lcLabel.includes('full') || lcLabel.includes('hoàn tất')) {
                    latestEpLabel = 'Full';
                } else {
                    const match = latestEpLabel.match(/\d+/);
                    const storedNum = match ? parseInt(match[0]) : 0;
                    if (count > storedNum) {
                        latestEpLabel = `Tập ${count}`;
                    } else if (lcLabel === 'tập' || lcLabel === 'tập ') {
                        latestEpLabel = count > 0 ? `Tập ${count}` : 'Full';
                    }
                }
            }
        }
        if (!latestEpLabel) return;

        const badge = document.querySelector('#heroBadges [data-ep-badge]');
        if (badge && badge.textContent !== latestEpLabel) {
            badge.textContent = latestEpLabel;
            badge.classList.remove('hidden');
        }
    } catch (e) { /* silent */ }
}

// ================================================================
// HERO ACTION BUTTONS (Favorite + Info)
// ================================================================
function setupHeroActions(movie) {
    const favBtn = document.getElementById('heroFavBtn');
    const infoBtn = document.getElementById('heroInfoBtn');

    if (!movie) return;
    if (infoBtn) infoBtn.href = `/phim/${movie.slug}`;

    if (favBtn && typeof userService !== 'undefined') {
        const icon = favBtn.querySelector('span');

        const updateFavUI = () => {
            const isFav = userService.isFavorite(movie.slug);
            if (icon) {
                icon.textContent = isFav ? 'favorite' : 'favorite_border';
                icon.classList.toggle('text-red-500', isFav);
                icon.classList.toggle('text-white/90', !isFav);
            }
        };

        updateFavUI();

        favBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
                if (typeof showAuthModal === 'function') showAuthModal('login');
                else alert('Vui lòng đăng nhập để lưu phim');
                return;
            }
            if (userService.isFavorite(movie.slug)) {
                userService.removeFromFavorites(movie.slug);
                if (typeof showNotification === 'function') showNotification('Đã xóa khỏi danh sách yêu thích', 'info');
            } else {
                userService.addToFavorites({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year || '' });
                if (typeof showNotification === 'function') showNotification('Đã thêm vào danh sách yêu thích', 'success');
            }
            updateFavUI();
        };
    }
}

// ── Expose globally ──────────────────────────────────────────────
window.switchHeroSlide = switchHeroSlide;

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadHeroBanner();
});
