// Watch Page Script
let currentMovie = null;
let currentEpisode = null;
let player = null;
let currentServerIndex = 0; // Track the current server index for failover

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');
    let episodeSlug = urlParams.get('episode');

    if (!slug && window.location.pathname.startsWith('/xem-phim/')) {
        const parts = window.location.pathname.split('/').filter(Boolean); // ["xem-phim", "slug", "episode"]
        if (parts.length >= 2) {
            slug = parts[1];
            episodeSlug = parts[2] || null;
            
            // clean ep prefix if it is tap-1
            if (episodeSlug && episodeSlug.startsWith('tap-')) {
                episodeSlug = episodeSlug.replace('tap-', '');
            }
        }
    }

    if (!slug) {
        window.location.href = '/';
        return;
    }

    await loadMovieAndPlay(slug, episodeSlug);
    setupVideoPlayer();
    loadRecommendations();
});

// Load movie and play
async function loadMovieAndPlay(slug, episodeSlug) {
    try {
        console.log('🎬 Loading movie:', slug);
        const response = await movieAPI.getMovieDetail(slug);
        console.log('📦 API Response:', response);

        if (response && response.status === 'success' && response.data) {
            currentMovie = response.data.item;
            console.log('✅ Movie loaded:', currentMovie.name);
            console.log('📺 Episodes:', currentMovie.episodes);

            // Find episode
            if (currentMovie.episodes && currentMovie.episodes.length > 0) {
                // Initialize default server index to 0
                currentServerIndex = 0;
                const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
                console.log('📋 Server data:', serverData);

                currentEpisode = episodeSlug
                    ? serverData.find(ep => ep.slug === episodeSlug)
                    : serverData[0];

                if (!currentEpisode) currentEpisode = serverData[0];

                console.log('▶️ Current episode:', currentEpisode);
                console.log('🔗 Video URL:', currentEpisode.link_m3u8);
            }

            renderMovieInfo(currentMovie, currentEpisode);
            renderEpisodeList(currentMovie.episodes);
            renderPlayerPlaceholder(currentEpisode); // 🛡️ Anti-Bot Gate: Render interactive placeholder first
            setupActionButtons();
            injectVideoSchema(currentMovie, currentEpisode); // 🔍 SEO: VideoObject JSON-LD

            // Add to watch history
            userService.addToHistory(currentMovie, currentEpisode?.name);
        } else {
            console.error('❌ Invalid response:', response);
            showError('Không thể tải thông tin phim');
        }
    } catch (error) {
        console.error('❌ Error loading movie:', error);
        showError('Đã xảy ra lỗi khi tải phim: ' + error.message);
    }
}

// ─── SEO: VideoObject JSON-LD Schema ────────────────────────────────────────
// Giúp Google index video trên trang watch — fix lỗi "videos from being indexed"
function injectVideoSchema(movie, episode) {
    try {
        // Xóa schema cũ nếu có (khi đổi tập)
        const old = document.getElementById('video-schema-ld');
        if (old) old.remove();

        const slug = movie.slug;
        const epSlug = episode ? episode.slug : '';
        const pageUrl = 'https://aphim.io.vn/xem-phim/' + encodeURIComponent(slug)
                        + (epSlug ? '/tap-' + encodeURIComponent(epSlug) : '');
        const canonicalUrl = 'https://aphim.io.vn/phim/' + encodeURIComponent(slug);

        const thumbUrl = movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 600, 85, true);
        const videoUrl = (episode && (episode.link_m3u8 || episode.link_embed)) || pageUrl;
        const epName = episode ? episode.name : '';
        const fullName = epName ? (movie.name + ' - ' + epName) : movie.name;
        const description = (movie.content || movie.description || movie.name)
                            .replace(/<[^>]+>/g, '') // strip HTML tags
                            .substring(0, 300);

        // uploadDate: dùng năm phát hành, format ISO (có timezone)
        const uploadDate = (movie.year ? movie.year + '-01-01T00:00:00+07:00' : new Date().getFullYear() + '-01-01T00:00:00+07:00');

        const schema = {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            'name': fullName,
            'description': description,
            'thumbnailUrl': thumbUrl,
            'uploadDate': uploadDate,
            'contentUrl': videoUrl,
            'embedUrl': pageUrl,
            'url': canonicalUrl,
            'inLanguage': 'vi',
            'publisher': {
                '@type': 'Organization',
                'name': 'APhim',
                'url': 'https://aphim.io.vn',
                'logo': {
                    '@type': 'ImageObject',
                    'url': 'https://aphim.io.vn/apple-touch-icon.png'
                }
            }
        };

        // Thêm duration nếu có (format PT1H30M)
        if (movie.time) {
            const timeStr = movie.time.replace(/phút/gi,'').trim();
            const mins = parseInt(timeStr);
            if (!isNaN(mins) && mins > 0) schema.duration = 'PT' + mins + 'M';
        }

        const script = document.createElement('script');
        script.id = 'video-schema-ld';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    } catch (e) {
        console.warn('[SEO] VideoObject schema inject failed:', e);
    }
}

// Render movie info
function renderMovieInfo(movie, episode) {
    // 🚀 INJECT DYNAMIC SEO - Overrides meta & title immediately
    if (typeof SEO !== 'undefined') {
        SEO.updateMovieSEO(movie, episode);
    } else {
        document.title = `${movie.name} - ${episode?.name || ''} - APhim`;
    }

    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.textContent = movie.name;
    }

    // ✅ Update breadcrumb in watch.html
    const breadcrumb = document.getElementById('breadcrumb-movie-name');
    if (breadcrumb) {
        breadcrumb.textContent = movie.name + (episode ? ` - ${episode.name}` : '');
        
        if (!document.getElementById('breadcrumb-category')) {
            let categoryName = '';
            let categoryLink = '';
            
            // Xử lý breadcrumb thông minh: nhớ trang trước đó (referrer) hoặc lấy từ sessionStorage do movie-detail.html truyền sang
            const savedName = sessionStorage.getItem('breadcrumbName');
            const savedLink = sessionStorage.getItem('breadcrumbLink');
            
            const referrer = document.referrer;
            let refMatched = false;
            
            if (savedName && savedLink) {
                categoryName = savedName;
                categoryLink = savedLink;
                refMatched = true;
            } else {
                try {
                    if (referrer && referrer.includes(window.location.host)) {
                        const refUrl = new URL(referrer);
                        
                        if (referrer.includes('phim-theo-quoc-gia.html')) {
                            categoryName = (movie.country && movie.country.length > 0) ? movie.country[0].name : 'Quốc Gia';
                            categoryLink = referrer;
                            refMatched = true;
                        } else if (referrer.includes('phim-theo-the-loai.html')) {
                            categoryName = (movie.category && movie.category.length > 0) ? movie.category[0].name : 'Thể Loại';
                            categoryLink = referrer;
                            refMatched = true;
                        } else if (referrer.includes('search.html')) {
                            categoryName = 'Tìm Kiếm';
                            categoryLink = referrer;
                            refMatched = true;
                        } else if (referrer.includes('danh-sach.html')) {
                            const listParam = refUrl.searchParams.get('list');
                            const listMap = {
                                'phim-moi': 'Phim Mới',
                                'phim-bo': 'Phim Bộ',
                                'phim-le': 'Phim Lẻ',
                                'tv-shows': 'TV Shows',
                                'hoat-hinh': 'Hoạt Hình',
                                'phim-vietsub': 'Phim Vietsub',
                                'phim-thuyet-minh': 'Thuyết Minh',
                                'phim-long-tien': 'Lồng Tiếng',
                                'phim-bo-dang-chieu': 'Đang Chiếu',
                                'phim-bo-hoan-thanh': 'Đã Hoàn Thành',
                                'phim-sap-chieu': 'Sắp Chiếu'
                            };
                            if (listParam && listMap[listParam]) {
                                categoryName = listMap[listParam];
                                categoryLink = referrer;
                                refMatched = true;
                            }
                        }
                    }
                } catch(e) {
                    console.warn('Could not parse referrer URL for breadcrumb', e);
                }
            }
            
            // Fallback nếu không có referrer (vào thẳng link)
            if (!refMatched) {
                if (movie.type === 'series') {
                    categoryName = 'Phim Bộ';
                    categoryLink = '/danh-sach?list=phim-bo';
                } else if (movie.type === 'single') {
                    categoryName = 'Phim Lẻ';
                    categoryLink = '/danh-sach?list=phim-le';
                } else if (movie.type === 'hoathinh') {
                    categoryName = 'Hoạt Hình';
                    categoryLink = '/danh-sach?list=hoat-hinh';
                } else if (movie.type === 'tvshows') {
                    categoryName = 'TV Shows';
                    categoryLink = '/danh-sach?list=tv-shows';
                }
            }
            
            if (categoryName) {
                const separator = document.createElement('span');
                separator.className = 'material-icons-round text-base';
                separator.textContent = 'chevron_right';
                
                const categoryElement = document.createElement('a');
                categoryElement.id = 'breadcrumb-category';
                categoryElement.className = 'hover:text-white transition-colors whitespace-nowrap';
                categoryElement.href = categoryLink;
                categoryElement.textContent = categoryName;
                
                breadcrumb.parentNode.insertBefore(categoryElement, breadcrumb);
                breadcrumb.parentNode.insertBefore(separator, breadcrumb);
            }
        }
    }

    // Populate new Netflix-style inline meta badges under player
    const metaYearBadge = document.getElementById('meta-year-badge');
    if (metaYearBadge) metaYearBadge.textContent = movie.year;

    const metaRatingVal = document.getElementById('meta-rating-val');
    if (metaRatingVal) {
        const avgRating = ratingService.getAverageRating(movie.slug);
        metaRatingVal.textContent = avgRating;
    }

    const metaGenre = document.getElementById('meta-genre');
    if (metaGenre && movie.category) {
        metaGenre.textContent = movie.category.map(c => c.name).join(', ');
    }

    const metaDuration = document.getElementById('meta-duration');
    if (metaDuration) metaDuration.textContent = movie.time || '-- phút';

    // 🌟 Render Sidebar Premium Movie Card Details
    const sidebarPoster = document.getElementById('sidebar-poster');
    if (sidebarPoster) {
        sidebarPoster.src = movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 300, 85, true);
        sidebarPoster.alt = movie.name;
    }

    const sidebarName = document.getElementById('sidebar-movie-name');
    if (sidebarName) sidebarName.textContent = movie.name;

    const sidebarOrigin = document.getElementById('sidebar-movie-origin');
    if (sidebarOrigin) sidebarOrigin.textContent = `${movie.origin_name} (${movie.year})`;

    const sidebarQuality = document.getElementById('sidebar-quality');
    if (sidebarQuality) sidebarQuality.textContent = movie.quality || 'HD';

    const sidebarLang = document.getElementById('sidebar-lang');
    if (sidebarLang) sidebarLang.textContent = movie.lang || 'Vietsub';

    const sidebarMetadataCards = document.getElementById('sidebar-metadata-cards');
    if (sidebarMetadataCards) {
        const metadataHTML = `
            <!-- Thể Loại -->
            ${movie.category && movie.category.length > 0 ? `
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#4A9EFF;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(74,158,255,0.6)"></span>
                        <h4 style="color: #60a5fa; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Thể loại</h4>
                    </div>
                    <span style="background-color: rgba(59,130,246,0.25); color: #eff6ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">${movie.category.length}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${movie.category.map(cat => `
                        <a href="/search?category=${cat.slug}" style="border-color: rgba(59,130,246,0.3); color: #93c5fd; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="px-2.5 py-0.5 border rounded-lg text-[11px] font-medium hover:bg-blue-500/30 transition-colors">
                            ${cat.name}
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- Quốc Gia -->
            ${movie.country && movie.country.length > 0 ? `
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#A855F7;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(168,85,247,0.6)"></span>
                        <h4 style="color: #c084fc; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Quốc gia</h4>
                    </div>
                    <span style="background-color: rgba(168,85,247,0.25); color: #faf5ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">${movie.country.length}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${movie.country.map(c => `
                        <a href="/search?country=${c.slug}" style="border-color: rgba(168,85,247,0.3); color: #d8b4fe; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="px-2.5 py-0.5 border rounded-lg text-[11px] font-medium hover:bg-purple-500/30 transition-colors">
                            ${c.name}
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Thông Tin -->
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); grid-column: span 2;" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#22C55E;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(34,197,94,0.6)"></span>
                        <h4 style="color: #4ade80; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Thông tin</h4>
                    </div>
                    <span style="background-color: rgba(34,197,94,0.25); color: #f0fdf4;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">${movie.status === 'completed' ? 'Full' : movie.status === 'ongoing' ? 'ongoing' : 'Trailer'}</span>
                </div>
                <div class="space-y-2 text-[11px]">
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Thời lượng:</span>
                        <span class="text-white font-semibold">${movie.time || 'Đang cập nhật'}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Tập hiện tại:</span>
                        <span style="color: #4ade80;" class="font-bold text-[12px]">${movie.episode_current || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- TMDB & IMDB Group -->
            ${(movie.tmdb && movie.tmdb.id) || (movie.imdb && movie.imdb.id) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; grid-column: span 2;">
                <!-- TMDB -->
                ${movie.tmdb && movie.tmdb.id ? `
                <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <span style="background:#01B4E4;color:white;font-size:10px;font-weight:900;padding:2px 5px;border-radius:3px;margin-right:6px;letter-spacing:0.5px">TMDB</span>
                        </div>
                        <span style="background-color: rgba(14,165,233,0.25); color: #f0f9ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">${movie.tmdb.type || 'tv'}</span>
                    </div>
                    <div class="space-y-2 text-[11px]">
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>ID:</span>
                            <span class="text-white font-semibold">${movie.tmdb.id}</span>
                        </div>
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>Điểm số:</span>
                            <span class="text-white font-semibold"><span style="color: #38bdf8;" class="font-bold text-[12px]">${movie.tmdb.vote_average || 'N/A'}</span> /10</span>
                        </div>
                    </div>
                </div>
                ` : '<div></div>'}

                <!-- IMDB -->
                ${movie.imdb && movie.imdb.id ? `
                <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <span style="background:#F5C518;color:#000000;font-size:10px;font-weight:900;padding:2px 5px;border-radius:3px;margin-right:6px;letter-spacing:0.5px">IMDb</span>
                        </div>
                        <span style="background-color: rgba(234,179,8,0.25); color: #fefce8;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">Rating</span>
                    </div>
                    <div class="space-y-2 text-[11px]">
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>ID:</span>
                            <span class="text-white font-semibold">${movie.imdb.id}</span>
                        </div>
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>Điểm số:</span>
                            <span class="text-white font-semibold"><span style="color: #fde047;" class="font-bold text-[12px]">N/A</span> /10</span>
                        </div>
                    </div>
                </div>
                ` : '<div></div>'}
            </div>
            ` : ''}
        `;
        sidebarMetadataCards.innerHTML = metadataHTML;
    }

    // 🎭 Render Cast (Diễn viên) circular avatars in sidebar (limit to max 5-6)
    const sidebarCastSection = document.getElementById('sidebar-cast-section');
    const sidebarCast = document.getElementById('sidebar-cast');
    if (sidebarCast && movie.actor && movie.actor.length > 0) {
        if (sidebarCastSection) sidebarCastSection.classList.remove('hidden');
        
        sidebarCast.innerHTML = movie.actor.slice(0, 6).map((actor, index) => {
            const colors = ['from-red-500 to-red-700', 'from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-yellow-500 to-yellow-700', 'from-purple-500 to-purple-700', 'from-pink-500 to-pink-700', 'from-indigo-500 to-indigo-700', 'from-teal-500 to-teal-700'];
            const colorClass = colors[index % colors.length];
            const initial = actor.charAt(0).toUpperCase();

            return `
                <div class="flex-shrink-0 w-16 text-center group cursor-pointer" data-actor-name="${actor}">
                    <div class="relative mb-1.5">
                        <div class="actor-avatar-container w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-sm font-black border border-white/10 group-hover:border-primary transition-all duration-300 group-hover:scale-105 overflow-hidden shadow-lg">
                            ${initial}
                        </div>
                    </div>
                    <p class="text-gray-300 text-[11px] font-semibold truncate w-16 group-hover:text-primary transition-colors leading-tight">${actor}</p>
                </div>
            `;
        }).join('');

        // Trigger TMDB actor avatar loading in the background
        if (typeof loadActorImagesFromTMDB === 'function') {
            setTimeout(() => {
                const actorElements = document.querySelectorAll('[data-actor-name]');
                if (actorElements.length > 0) {
                    loadActorImagesFromTMDB(movie).catch(err => {
                        console.warn('⚠️ Failed to load actor images:', err);
                    });
                }
            }, 500);
        }
    } else if (sidebarCastSection) {
        sidebarCastSection.classList.add('hidden');
    }

    // Tích hợp Các bản chiếu
    renderVersions(movie);

    // Load movie gallery
    loadMovieGallery(movie);
}

// Render "Các bản chiếu" trên trang Xem Phim
function renderVersions(movie) {
    const episodeSection = document.getElementById('episode-list');
    if (!episodeSection) return;
    const parentContainer = episodeSection.parentElement;

    let displayLang = 'Phụ đề / Vietsub';
    if (movie && movie.lang) {
        displayLang = movie.lang;
    }

    const currentDomain = window.location.hostname;
    const isSvap1 = currentDomain.includes('aphim.top') || currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    const isSvap2 = currentDomain.includes('aphim1.io.vn');
    const isSvap3 = currentDomain.includes('aphim.io.vn') && !isSvap2;

    // Load Lottie web component script if not present
    if (!document.getElementById('dotlottie-script')) {
        const script = document.createElement('script');
        script.id = 'dotlottie-script';
        script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
        script.type = "module";
        document.body.appendChild(script);
    }

    const versionsHTML = `
        <div class="w-full mb-6 mt-2">
            <!-- Banner Notification -->
            <div style="background: linear-gradient(to right, #4f46e5, #d946ef);" class="rounded-xl p-4 mb-5 flex items-center gap-4 shadow-lg">
                <div style="background-color: #1e3a8a;" class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                    <span class="material-icons-round text-[#fcd576] text-xl">notifications_active</span>
                </div>
                <div>
                    <p class="text-white font-bold text-sm leading-tight" style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Click chọn SVAP1, SVAP2 hoặc SVAP3 nếu phim không xem được.</p>
                </div>
            </div>

            <!-- Server Buttons -->
            <div class="flex flex-wrap items-center justify-center gap-3 w-full">
                <button onclick="changeVersion('aphim.top')" style="background-color: #fcd576; color: black; box-shadow: ${isSvap1 ? '0 0 15px rgba(252,213,118,0.8)' : '0 4px 12px rgba(252,213,118,0.3)'}; ${isSvap1 ? 'transform: scale(1.05); border: 2px solid white;' : ''}" class="relative overflow-visible flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg transition-all text-sm font-bold hover:-translate-y-1 hover:brightness-95">
                    ${isSvap1 ? '<span class="material-icons-round text-[16px]">check_circle</span><span>Đang xem (SVAP1)</span>' : '<span>' + displayLang + ' (SVAP1)</span>'}
                    
                    <!-- Lottie Crown SVAP1 VIP -->
                    <div style="position: absolute; top: -14px; right: -14px; z-index: 20; pointer-events: none; width: 40px; height: 40px; transform: rotate(15deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                        <dotlottie-wc src="https://lottie.host/3d743490-d86f-4cc7-9170-2fefdb01db16/8A8VL5a8T2.lottie" style="width: 100%; height: 100%;" autoplay loop></dotlottie-wc>
                    </div>
                </button>
                <button onclick="changeVersion('aphim1.io.vn')" style="background-color: #c8407a; color: white; box-shadow: ${isSvap2 ? '0 0 15px rgba(200,64,122,0.8)' : '0 4px 12px rgba(200,64,122,0.3)'}; ${isSvap2 ? 'transform: scale(1.05); border: 2px solid white;' : ''}" class="relative overflow-visible flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg transition-all text-sm font-bold hover:-translate-y-1 hover:brightness-110">
                    ${isSvap2 ? '<span class="material-icons-round text-[16px]">check_circle</span><span>Đang xem (SVAP2)</span>' : '<span>' + displayLang + ' (SVAP2)</span>'}
                </button>
                <button onclick="changeVersion('aphim.io.vn')" style="background-color: #299573; color: white; box-shadow: ${isSvap3 ? '0 0 15px rgba(41,149,115,0.8)' : '0 4px 12px rgba(41,149,115,0.3)'}; ${isSvap3 ? 'transform: scale(1.05); border: 2px solid white;' : ''}" class="relative overflow-visible flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg transition-all text-sm font-bold hover:-translate-y-1 hover:brightness-110">
                    ${isSvap3 ? '<span class="material-icons-round text-[16px]">check_circle</span><span>Đang xem (SVAP3)</span>' : '<span>' + displayLang + ' (SVAP3)</span>'}
                </button>
            </div>
        </div>
    `;

    const oldVersions = document.getElementById('watch-versions-container');
    if (oldVersions) oldVersions.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'watch-versions-container';
    wrapper.className = 'w-full';
    wrapper.innerHTML = versionsHTML;

    // Chèn vào trước tiêu đề "Danh sách tập"
    parentContainer.insertBefore(wrapper, parentContainer.firstChild);
}

// Logic chuyển hướng linh hoạt giữa Node và HTML
window.changeVersion = function(domain) {
    const currentDomain = window.location.hostname;
    
    // Nếu domain mục tiêu trùng với domain hiện tại
    if (currentDomain.includes(domain) || (domain === 'aphim.top' && (currentDomain === 'localhost' || currentDomain === '127.0.0.1'))) {
        if (typeof showToast === 'function') {
            showToast('Bạn đang xem bản chiếu này rồi!', 'info');
        } else {
            alert('Bạn đang xem bản chiếu này rồi!');
        }
        return; // Ngừng thực hiện load lại trang
    }

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const params = new URLSearchParams(currentSearch);
    
    let slug = '';
    let episode = '';
    let isWatchPage = false;
    
    // Ưu tiên đọc từ biến toàn cục nếu đang ở trang xem phim (bảo đảm luôn lấy đúng tập hiện tại)
    if (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.slug) {
        slug = currentMovie.slug;
        if (typeof currentEpisode !== 'undefined' && currentEpisode && currentEpisode.slug) {
            episode = currentEpisode.slug;
            isWatchPage = true;
        } else if (currentPath.includes('/xem-phim/') || currentPath.includes('watch.html')) {
            isWatchPage = true;
        }
    }
    
    // Fallback: Đọc từ URL nếu không có biến toàn cục
    if (!slug) {
        if (currentPath.includes('/phim/')) {
            slug = currentPath.split('/phim/')[1].replace('/', '');
        } else if (currentPath.includes('/xem-phim/')) {
            isWatchPage = true;
            const parts = currentPath.split('/xem-phim/')[1].split('/');
            slug = parts[0];
            if (parts.length > 1) {
                episode = parts[1];
            }
        } else if (currentPath.includes('movie-detail.html')) {
            slug = params.get('slug');
        } else if (currentPath.includes('watch.html')) {
            isWatchPage = true;
            slug = params.get('slug');
            episode = params.get('episode');
        }
    }
    
    // Chuẩn hóa biến tập phim (bỏ "tap-" đi để ghép lại cho chuẩn, tránh lỗi tap-tap-5)
    if (episode) {
        episode = episode.replace(/^tap-/, '');
    }

    if (!slug) {
        window.location.href = "https://" + domain + currentPath + currentSearch;
        return;
    }
    
    // Xây dựng URL đích
    const isNodeDomain = domain === 'aphim.top';
    let newUrl = 'https://' + domain;
    
    if (isNodeDomain) {
        if (isWatchPage) {
            newUrl += '/xem-phim/' + slug;
            if (episode) {
                 if (episode.toLowerCase() === 'full') {
                     newUrl += '/full';
                 } else {
                     newUrl += '/tap-' + episode;
                 }
            }
        } else {
            newUrl += '/phim/' + slug;
        }
    } else {
        if (isWatchPage) {
            newUrl += '/watch.html?slug=' + slug;
            if (episode) {
                 if (episode.toLowerCase() === 'full') {
                     newUrl += '&episode=full';
                 } else {
                     newUrl += '&episode=tap-' + episode;
                 }
            }
        } else {
            newUrl += '/movie-detail.html?slug=' + slug;
        }
    }
    
    window.location.href = newUrl;
};

// Load movie gallery from API
async function loadMovieGallery(movie) {
    const galleryContainer = document.getElementById('movie-gallery-container');
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const galleryCount = document.getElementById('movie-gallery-count');
    if (!galleryContainer || !scrollContainer) return;

    try {
        const url = `https://ophim1.com/v1/api/phim/${movie.slug}/images`;
        const options = {method: 'GET', headers: {accept: 'application/json'}};
        
        const res = await fetch(url, options);
        if (!res.ok) return;
        
        const json = await res.json();
        
        if (json.success && json.data && json.data.images && json.data.images.length > 0) {
            const backdrops = json.data.images.filter(img => img.type === 'backdrop' || img.aspect_ratio > 1);
            
            if (backdrops.length > 0) {
                window.movieGalleryImageUrls = backdrops.map(img => `https://image.tmdb.org/t/p/w1280${img.file_path}`);
                galleryContainer.classList.remove('hidden');
                galleryCount.textContent = `(${backdrops.length} ảnh)`;
                
                scrollContainer.innerHTML = backdrops.map((img, index) => `
                    <div class="flex-shrink-0 w-[200px] md:w-[280px] aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:border-white/30 transition-colors relative cursor-pointer" onclick="openLightbox(window.movieGalleryImageUrls, ${index})">
                        <img src="https://wsrv.nl/?url=image.tmdb.org/t/p/w780${img.file_path}" alt="Cảnh phim ${movie.name}" loading="lazy" class="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110">
                    </div>
                `).join('');
                
                setupGalleryScroll();
            }
        }
    } catch (err) {
        console.warn('Lỗi tải hình ảnh phim:', err);
    }
}

function setupGalleryScroll() {
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const btnLeft = document.getElementById('btn-scroll-left');
    const btnRight = document.getElementById('btn-scroll-right');
    
    if (!scrollContainer || !btnLeft || !btnRight) return;
    
    btnLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -400, behavior: 'smooth' });
    });
    
    btnRight.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: 400, behavior: 'smooth' });
    });
    
    const checkScroll = () => {
        btnLeft.style.opacity = scrollContainer.scrollLeft > 10 ? '1' : '0';
        btnRight.style.opacity = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10) ? '1' : '0';
        
        btnLeft.style.pointerEvents = scrollContainer.scrollLeft > 10 ? 'auto' : 'none';
        btnRight.style.pointerEvents = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10) ? 'auto' : 'none';
    };
    
    scrollContainer.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    setTimeout(checkScroll, 500);
}

if (typeof window.openLightbox === 'undefined') {
    window.openLightbox = function(images, index) {
      let current = index;
      const isMobile = window.innerWidth <= 768;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.97);z-index:99999;display:flex;align-items:center;justify-content:center';
      
      const img = document.createElement('img');
      img.style.cssText = isMobile ? 'max-width:92vw;max-height:70vh;object-fit:contain;border-radius:8px' : 'max-width:70vw;max-height:75vh;object-fit:contain;border-radius:8px';
      img.src = images[current];
      
      const counter = document.createElement('div');
      counter.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:white;font-size:14px';
      counter.textContent = (current+1)+' / '+images.length;
      
      const btnClose = document.createElement('button');
      btnClose.innerHTML = '✕';
      btnClose.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;z-index:1';
      
      const btnPrev = document.createElement('button');
      btnPrev.innerHTML = '‹';
      btnPrev.style.cssText = isMobile ? 'position:absolute;left:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;left:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
      
      const btnNext = document.createElement('button');
      btnNext.innerHTML = '›';
      btnNext.style.cssText = isMobile ? 'position:absolute;right:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
      
      function update() { img.src = images[current]; counter.textContent = (current+1)+' / '+images.length; }
      btnPrev.onclick = () => { current = (current-1+images.length)%images.length; update(); };
      btnNext.onclick = () => { current = (current+1)%images.length; update(); };
      btnClose.onclick = () => document.body.removeChild(overlay);
      overlay.onclick = (e) => { if(e.target===overlay) document.body.removeChild(overlay); };
      document.addEventListener('keydown', function escHandler(e) {
        if(e.key==='Escape') { if(document.body.contains(overlay)) { document.body.removeChild(overlay); document.removeEventListener('keydown', escHandler); } }
        if(e.key==='ArrowLeft') { current=(current-1+images.length)%images.length; update(); }
        if(e.key==='ArrowRight') { current=(current+1)%images.length; update(); }
      });
      
      overlay.appendChild(img);
      overlay.appendChild(counter);
      overlay.appendChild(btnClose);
      overlay.appendChild(btnPrev);
      overlay.appendChild(btnNext);
      document.body.appendChild(overlay);
    }
}

// 🛡️ PHASE 1: RENDER INTERACTIVE PLAYER PLACEHOLDER (Anti-DMCA Gate)
function renderPlayerPlaceholder(episode) {
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;

    // Use thumb_url (horizontal banner) instead of poster_url (vertical) for 16:9 video player
    const posterUrl = currentMovie ? movieAPI.getImageURL(currentMovie.thumb_url || currentMovie.poster_url, 1200, 90, true) : '';
    const movieName = currentMovie ? currentMovie.name : 'Đang tải...';
    
    // Thông minh hóa tên tập: Nếu là số thì thêm chữ "Tập", nếu là chữ (Full, Trailer...) thì giữ nguyên
    let epName = 'Full HD';
    if (episode && episode.name) {
        if (episode.name.toLowerCase().includes('tập')) {
            epName = episode.name;
        } else if (!isNaN(episode.name)) {
            epName = `Tập ${episode.name}`;
        } else {
            epName = episode.name;
        }
    }
    
    const quality = currentMovie ? currentMovie.quality : 'Full HD';
    const lang = currentMovie ? currentMovie.lang : 'Vietsub';
    
    playerContainer.innerHTML = `
        <div id="playerPlaceholder" class="absolute inset-0 w-full h-full cursor-pointer overflow-hidden rounded-xl group/overlay" 
             style="transform: translate3d(0,0,0); -webkit-transform: translate3d(0,0,0); border-radius: 12px;"
             onclick="window.startActualPlayback()">
            <!-- Background Layer 1: Cinematic Ambient Blur (Covers everything with soft colors) -->
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transform-gpu scale-105" 
                 style="background-image: url('${posterUrl}'); filter: brightness(0.25) blur(15px); border-radius: 12px; overflow: hidden;"></div>
            
            <!-- Background Layer 2: Sharp Centered Image (Cover - fills the ENTIRE horizontal frame perfectly) -->
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1.5s] ease-out group-hover/overlay:scale-103" 
                 style="background-image: url('${posterUrl}'); filter: brightness(0.6) contrast(1.05); border-radius: 12px; overflow: hidden;"></div>
            
            <!-- Netflix/Disney+ Premium Double Gradients -->
            <!-- Top Gradient (Fade out header backdrop) -->
            <div class="absolute inset-0 bg-gradient-to-b from-black/95 via-black/30 to-transparent opacity-95" style="border-radius: 12px;"></div>
            <!-- Bottom Gradient (Fade out text backdrop - cinematic) -->
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent opacity-95" style="border-radius: 12px;"></div>
            
            <!-- Central Play Button (Dead Centered - Absolute Horizontal & Vertical Center) -->
            <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div id="play-btn" class="w-[55px] h-[55px] sm:w-[80px] sm:h-[80px] pointer-events-auto transition-transform duration-500 transform group-hover/overlay:scale-110 filter drop-shadow-[0_10px_35px_rgba(252,211,77,0.35)]" style="cursor: pointer;"></div>
            </div>
            
            <!-- Netflix-Style Bottom-Left Cinematic Movie Info & Meta -->
            <div class="absolute z-20 flex flex-col gap-2.5 sm:gap-3.5 transition-all duration-500 transform group-hover/overlay:translate-x-1 bottom-3 left-4 sm:bottom-6 sm:left-6"
                 style="position: absolute !important; top: auto !important; right: auto !important; pointer-events: none; -webkit-user-select: none; user-select: none;">
                
                <!-- Badges / Tags (Stacked on Mobile, Horizontal on Desktop - Perfectly Left-Aligned & Spacious) -->
                <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                    <span class="text-[10px] md:text-[11px] text-[#fcd576] font-black uppercase tracking-[0.15em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">APhim Studio</span>
                    <span class="hidden sm:inline text-white/40 text-xs">|</span>
                    <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
                        <span class="text-[9px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            ${quality} • ${lang}
                        </span>
                    </div>
                </div>

                <!-- Movie Title & Episode Name (Premium layout with extra top margin) -->
                <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mt-1.5">
                    <h3 class="text-white font-extrabold text-base sm:text-2xl md:text-3xl tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-[65vw] sm:max-w-[450px] md:max-w-[600px] truncate leading-tight">
                        ${movieName}
                    </h3>
                    <span class="text-[#fcd576] font-bold text-xs sm:text-sm md:text-base tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                        ${epName}
                    </span>
                </div>
            </div>
        </div>
    `;

    // 🎬 Step 4 — Initialize Lottie Animation (Load from /icons/play.json)
    if (typeof lottie !== 'undefined') {
        const anim = lottie.loadAnimation({
            container: document.getElementById('play-btn'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/icons/play.json'
        });

        const placeholder = document.getElementById('playerPlaceholder');
        if (placeholder) {
            placeholder.addEventListener('mouseenter', () => anim.play());
            placeholder.addEventListener('mouseleave', () => anim.stop());
        }
    }
}

// Global callback to start playback on click
window.startActualPlayback = function() {
    console.log('⚡ User interaction verified. Deferring stream load to complete touch lifecycle...');
    // Defer by 100ms so that the click/touch event lifecycle completes fully on the placeholder,
    // allowing the browser to cleanly transfer focus and future gestures to the new video element.
    setTimeout(() => {
        initializePlayer(currentEpisode);
    }, 100);
};

// Render episode list
function renderEpisodeList(episodes) {
    if (!episodes || episodes.length === 0) return;

    const container = document.getElementById('episode-list') || document.querySelector('.grid.grid-cols-2');
    if (!container) return;

    const serverData = episodes[currentServerIndex]?.server_data || episodes[0].server_data;

    // Update dynamic episode count indicator
    const episodeCountEl = document.getElementById('episode-count');
    if (episodeCountEl) {
        episodeCountEl.textContent = `(${serverData.length} tập)`;
    }

    container.innerHTML = serverData.map(ep => {
        const isActive = currentEpisode && ep.slug === currentEpisode.slug;
        const name = ep.name.trim();
        let displayEpName = name;
        if (/^\d+$/.test(name)) {
            displayEpName = `Tập ${name.padStart(2, '0')}`;
        } else {
            displayEpName = name.startsWith('Tập') ? name : `Tập ${name}`;
        }

        return `
            <button onclick="changeEpisode('${ep.slug}')"
                class="${isActive ? 'bg-[#fcd576] text-black font-bold border-transparent shadow-[0_4px_12px_rgba(252,211,77,0.3)] scale-105 active' : 'bg-[#131314] hover:bg-white/5 text-gray-400 border border-white/5 hover:text-white'} transition-all duration-300 rounded-lg w-full py-1.5 text-[11px] sm:text-xs font-semibold cursor-pointer active:scale-95 text-center">
                ${displayEpName}
            </button>
        `;
    }).join('');

    // Dynamically update under-player control bar navigation buttons
    if (typeof updateEpisodeNavButtons === 'function') {
        updateEpisodeNavButtons();
    }

    // Programmatically bind touch/click delegates on the container for iOS Safari compatibility
    if (container && !container.hasAttribute('data-safari-bound')) {
        container.setAttribute('data-safari-bound', 'true');
        const handleEpisodeClick = (e) => {
            const btn = e.target.closest('button');
            if (btn) {
                const onclickAttr = btn.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/changeEpisode\('([^']+)'\)/);
                    if (match) {
                        e.preventDefault();
                        window.changeEpisode(match[1]);
                    }
                }
            }
        };
        container.addEventListener('click', handleEpisodeClick);
        container.addEventListener('touchend', handleEpisodeClick, { passive: false });
    }

    // Automatically scroll the active episode into view inside the scrollable container
    setTimeout(() => {
        const activeBtn = container.querySelector('button.active');
        if (activeBtn) {
            try {
                activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } catch (e) {
                try {
                    activeBtn.scrollIntoView();
                } catch (err) {}
            }
        }
    }, 100);
}

// Initialize video player
function initializePlayer(episode) {
    console.log('🎥 Initializing player with episode:', episode);

    if (!episode) {
        console.error('❌ No episode provided');
        showError('Không tìm thấy tập phim');
        return;
    }

    // Check if admin has set a custom link in localStorage
    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');
    const customLink = movieLinks[currentMovie.slug];

    let videoUrl = customLink || episode.link_m3u8 || episode.link_embed;

    if (!videoUrl) {
        console.error('❌ No video link found in episode:', episode);
        showError('Không tìm thấy link phim. Vui lòng liên hệ admin để cập nhật link.');
        return;
    }

    // Auto upgrade http to https to prevent Mixed Content security blocking on mobile browsers
    if (videoUrl.startsWith('http://')) {
        videoUrl = videoUrl.replace('http://', 'https://');
        console.log('🔒 Upgraded video URL to HTTPS:', videoUrl);
    }

    console.log('🔗 Video URL:', videoUrl);
    if (customLink) {
        console.log('✅ Using custom link from admin');
    }

    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) {
        console.error('❌ Player container not found');
        return;
    }

    // Load watch progress
    const progress = userService.getWatchProgress(currentMovie.slug, episode.slug);

    playerContainer.innerHTML = `
        <video id="videoPlayer" 
            class="w-full h-full bg-black" 
            controls 
            preload="auto"
            controlsList="nodownload"
            poster="${movieAPI.getImageURL(currentMovie.thumb_url, 1200, 90, true)}">
            Trình duyệt của bạn không hỗ trợ video.
        </video>
    `;

    player = document.getElementById('videoPlayer');

    // Register mobile touch double-tap handler directly on the video element
    let lastTap = 0;
    player.addEventListener('touchend', (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        
        if (now - lastTap < DOUBLE_TAP_DELAY) {
            e.preventDefault(); // Stop native double-tap-to-zoom
            
            // Calculate relative touch coordinate to find which side was tapped
            const rect = player.getBoundingClientRect();
            const touch = e.changedTouches[0] || e.touches[0];
            if (touch) {
                const tapX = touch.clientX - rect.left;
                const isRightSide = tapX > (rect.width / 2);
                
                if (isRightSide) {
                    player.currentTime = Math.min(player.duration, player.currentTime + 10);
                    showSeekOverlay('+10s', true);
                } else {
                    player.currentTime = Math.max(0, player.currentTime - 10);
                    showSeekOverlay('-10s', false);
                }
            }
            lastTap = 0; // Reset tap tracking
        } else {
            lastTap = now;
        }
    });

    // Register keyboard shortcuts (Space to toggle, ArrowRight/ArrowLeft to seek 10s)
    if (window._watchKeydownHandler) {
        document.removeEventListener('keydown', window._watchKeydownHandler, true);
    }
    
    window._watchKeydownHandler = function (e) {
        const active = document.activeElement;
        // Skip hotkeys if typing in inputs/textareas
        if (active && (
            active.tagName === 'INPUT' || 
            active.tagName === 'TEXTAREA' || 
            active.isContentEditable
        )) {
            return;
        }
        
        if (e.code === 'Space') {
            e.preventDefault();
            if (player.paused) {
                player.play().catch(err => console.log(err));
            } else {
                player.pause();
            }
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            player.currentTime = Math.min(player.duration, player.currentTime + 10);
            showSeekOverlay('+10s', true);
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            player.currentTime = Math.max(0, player.currentTime - 10);
            showSeekOverlay('-10s', false);
        }
    };
    
    document.addEventListener('keydown', window._watchKeydownHandler, true);

    // Prefer native HLS on iOS and Safari for better stability and performance
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const preferNativeHLS = (isIOS || isSafari) && player.canPlayType('application/vnd.apple.mpegurl');

    let isTimeRestored = false; // CỜ CHẶN: Chỉ cho phép khôi phục thời gian DUY NHẤT 1 LẦN, tránh bị kẹt tua phim

    if (preferNativeHLS) {
        // Native HLS support (Safari/iOS)
        console.log('✅ Using native HLS support (Safari/iOS)');
        player.src = videoUrl;
        
        // FIX CỰC MẠNH CHO MOBILE: Chờ 'canplay' và thêm độ trễ nhỏ để trình duyệt ổn định thanh tua
        player.addEventListener('canplay', () => {
            if (!isTimeRestored && progress.currentTime > 0) {
                isTimeRestored = true; 
                setTimeout(() => {
                    console.log('⏪ [SafeRestore-Delay] Resumed on Mobile:', progress.currentTime);
                    player.currentTime = progress.currentTime;
                    // Force playback resume after mutating currentTime to prevent mobile freeze
                    player.play().catch(e => console.log('iOS play after restore prevented:', e));
                }, 200); // Độ trễ 200ms đảm bảo trình duyệt đã ổn định Buffer, không bị treo Touch
            }
        }, { once: true }); // Chỉ chạy 1 lần duy nhất

        player.addEventListener('loadedmetadata', () => {
            console.log('✅ Video metadata loaded');
            player.play().catch(e => console.log('Auto-play prevented:', e));
        });
    } else if (Hls.isSupported()) {
        console.log('✅ HLS.js is supported');
        const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false, // Priority to aggressive buffer over ultra-low latency
            maxBufferLength: 60, // Keep up to 60 seconds of video preloaded in buffer in advance
            maxMaxBufferLength: 120, // Preload up to 120 seconds of stream segments
            preload: true,
            startLevel: -1,
            capLevelToPlayerSize: true
        });

        console.log('📡 Loading source:', videoUrl);
        hls.loadSource(videoUrl);
        hls.attachMedia(player);

        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            console.log('✅ Video manifest parsed - ready to play');
            // Bổ sung delay nhỏ cho HLS.js để ổn định thanh timeline trước khi tua
            if (!isTimeRestored && progress.currentTime > 0) {
                isTimeRestored = true; 
                setTimeout(() => {
                    console.log('⏪ [SafeRestore-HLS] Resumed with Delay:', progress.currentTime);
                    player.currentTime = progress.currentTime;
                    // Force playback resume after mutating currentTime to prevent HLS.js freeze
                    player.play().catch(e => console.log('HLS play after restore prevented:', e));
                }, 150); 
            } else {
                player.play().catch(e => console.log('Auto-play prevented:', e));
            }
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            console.error('❌ HLS Error:', data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('🔄 Network error, trying to recover...');
                        hls.startLoad();
                        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                            hls.destroy();
                            handleStreamError();
                        }
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('🔄 Media error, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error('💥 Fatal error, cannot recover');
                        hls.destroy();
                        handleStreamError();
                        break;
                }
            }
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for other browsers that support native HLS
        console.log('✅ Using native HLS support (Fallback)');
        player.src = videoUrl;
        player.addEventListener('canplay', () => {
            if (!isTimeRestored && progress.currentTime > 0) {
                isTimeRestored = true;
                setTimeout(() => {
                     player.currentTime = progress.currentTime;
                }, 200);
            }
        }, { once: true });
    } else {
        console.error('❌ HLS not supported');
        showError('Trình duyệt của bạn không hỗ trợ phát video HLS');
        return;
    }

    // Hàm hỗ trợ lưu tiến độ tức thời
    function doSaveProgress() {
        if (player && player.currentTime > 0 && player.duration > 0 && currentMovie) {
            userService.saveWatchProgress(
                currentMovie.slug,
                player.currentTime,
                player.duration,
                episode ? episode.slug : null
            );
        }
    }

    // Save progress periodically
    let progressInterval = null;
    player.addEventListener('play', () => {
        console.log('▶️ Video playing');
        if (progressInterval) clearInterval(progressInterval); // Dọn dẹp interval cũ nếu có
        progressInterval = setInterval(doSaveProgress, 5000); // Cập nhật mỗi 5 giây
    });

    player.addEventListener('pause', () => {
        console.log('⏸️ Video paused');
        if (progressInterval) clearInterval(progressInterval);
        doSaveProgress(); // Lưu luôn khi bấm tạm dừng
    });

    // Bổ sung: Lưu TỨC THỜI khi người dùng tua phim đến vị trí mới
    player.addEventListener('seeked', () => {
        console.log('⏩ User seeked - Instant save');
        doSaveProgress();
    });

    // Bổ sung: Lưu TỨC THỜI khi chuẩn bị tắt tab / tải lại trang
    window.addEventListener('beforeunload', () => {
        doSaveProgress();
    });

    // Auto play next episode
    player.addEventListener('ended', () => {
        console.log('✅ Video ended');
        clearInterval(progressInterval);
        autoPlayNext();
    });

    player.addEventListener('error', (e) => {
        console.error('❌ Video element error:', e);
        handleStreamError();
    });
}

// Automatic Server Fallback helper on playback error
function handleStreamError() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length <= 1) {
        showError('Không thể phát video từ máy chủ này. Vui lòng thử lại sau.');
        return;
    }

    const nextServerIndex = currentServerIndex + 1;
    if (nextServerIndex < currentMovie.episodes.length) {
        currentServerIndex = nextServerIndex;
        const nextServer = currentMovie.episodes[nextServerIndex];
        console.warn(`🔄 Stream error detected. Switching to backup server: ${nextServer.server_name}`);
        
        // Find corresponding episode in the new server
        const matchingEpisode = nextServer.server_data.find(ep => ep.name === currentEpisode.name) || nextServer.server_data[0];
        
        if (matchingEpisode) {
            currentEpisode = matchingEpisode;
            
            // Re-render episode list to match new server data context
            renderEpisodeList(currentMovie.episodes);
            
            // Show custom alert message in seeking container
            showSeekOverlay(`Đang chuyển: ${nextServer.server_name}...`, true);
            
            setTimeout(() => {
                initializePlayer(currentEpisode);
            }, 1200);
        } else {
            showError('Không tìm thấy tập phim trên server dự phòng.');
        }
    } else {
        showError('Không thể phát video từ tất cả các máy chủ. Vui lòng thử lại sau.');
    }
}

// Setup video player controls
function setupVideoPlayer() {
    // Add custom controls if needed
    addQualitySelector();
    addSpeedControl();
    addFullscreenButton();
}

// Add quality selector
function addQualitySelector() {
    // Quality selector implementation
    const qualities = APP_CONFIG.VIDEO_QUALITIES;
    // Add UI for quality selection
}

// Add speed control
function addSpeedControl() {
    if (!player) return;

    const speeds = APP_CONFIG.PLAYBACK_SPEEDS;
    // Add UI for playback speed
}

// Add fullscreen button
function addFullscreenButton() {
    if (!player) return;

    // Fullscreen functionality
    player.addEventListener('dblclick', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            player.requestFullscreen();
        }
    });
}

// Change episode is defined globally as an instant transition helper below

// Auto play next episode
function autoPlayNext() {
    if (!currentMovie.episodes || currentMovie.episodes.length === 0) return;

    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug === currentEpisode.slug);

    if (currentIndex < serverData.length - 1) {
        const nextEpisode = serverData[currentIndex + 1];
        setTimeout(() => {
            if (confirm(`Tự động phát ${nextEpisode.name}?`)) {
                changeEpisode(nextEpisode.slug);
            }
        }, 3000);
    }
}

// Load recommendations
async function loadRecommendations() {
    const sidebar = document.getElementById('recommendations-list') || document.querySelector('aside .space-y-4');
    if (!sidebar) return;

    try {
        const data = await movieAPI.getMovieList(1);
        let movies = [];
        
        if (data && data.data && data.data.items) {
            movies = data.data.items.slice(0, 6);
        } else if (data && data.items) {
            movies = data.items.slice(0, 6);
        } else if (Array.isArray(data)) {
            movies = data.slice(0, 6);
        }
        
        if (movies.length > 0) {
            renderRecommendations(movies, sidebar);
        } else {
            console.warn("No recommendation movies found. API Response:", data);
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

// Render recommendations
function renderRecommendations(movies) {
    const containers = document.querySelectorAll('.watch-rec-container');
    if (containers.length === 0) return;

    // Inject CSS for the new list format
    if (!document.getElementById('watch-recommendations-css')) {
        const style = document.createElement('style');
        style.id = 'watch-recommendations-css';
        style.innerHTML = `
            .watch-rec-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .watch-rec-item {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 16px !important;
                padding: 10px 8px !important;
                border-radius: 12px;
                background: transparent;
                transition: background 0.2s ease;
                text-decoration: none;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .watch-rec-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            .watch-rec-thumb {
                width: 76px !important;
                height: 102px !important;
                min-width: 76px !important;
                max-width: 76px !important;
                object-fit: cover !important;
                border-radius: 8px !important;
                flex-shrink: 0 !important;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
                position: static !important;
            }
            .watch-rec-info {
                flex: 1 !important;
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                justify-content: center !important;
                gap: 6px !important;
            }
            .watch-rec-name {
                color: #e5e7eb;
                font-size: 15.5px;
                font-weight: 600;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .watch-rec-meta {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12.5px;
                color: #9ca3af;
            }
            .watch-rec-badge {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
                color: #fff;
            }
            .watch-rec-dot {
                font-size: 14px;
            }
            
            /* --- Mobile Horizontal Scroll Layout --- */
            @media (max-width: 1023px) {
                .watch-rec-list {
                    flex-direction: row;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-snap-type: x mandatory;
                    padding-bottom: 8px;
                    scrollbar-width: none;
                }
                .watch-rec-list::-webkit-scrollbar {
                    display: none;
                }
                .watch-rec-item {
                    min-width: 290px !important;
                    width: 290px !important;
                    max-width: 290px !important;
                    scroll-snap-align: start;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const html = movies.map(movie => {
        let ratingNum = movie.tmdb?.vote_average || movie.imdb?.vote_average || 0;
        const rating = ratingNum > 0 ? Number(ratingNum).toFixed(1) : '7.1';
        const badge = movie.quality || 'HD';
        const episode = movie.episode_current || 'Tập 1';
        
        return `
            <a href="/phim/${movie.slug}" class="watch-rec-item group">
                <img src="${movieAPI.getImageURL(movie.thumb_url, 300, 85, true)}" alt="${movie.name}" class="watch-rec-thumb" loading="lazy" onerror="this.src='https://via.placeholder.com/60x80?text=No+Image'" />
                <div class="watch-rec-info">
                    <h4 class="watch-rec-name group-hover:text-red-500 transition-colors">${movie.name}</h4>
                    <div class="watch-rec-meta">
                        <span class="watch-rec-badge">${badge}</span>
                        <span class="watch-rec-dot">•</span>
                        <span>${episode}</span>
                        <span class="watch-rec-dot">•</span>
                        <span class="flex items-center gap-[2px] text-yellow-400 font-bold"><span class="material-icons-round" style="font-size: 12px;">star</span>${rating}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    containers.forEach(container => {
        container.className = 'watch-rec-container watch-rec-list';
        container.innerHTML = html;
    });
}

// Show error
function showError(message) {
    const playerContainer = document.querySelector('.aspect-video');
    if (playerContainer) {
        playerContainer.innerHTML = `
            <div class="w-full h-full bg-black flex items-center justify-center">
                <div class="text-center">
                    <span class="material-icons-round text-6xl text-red-400 mb-4">error_outline</span>
                    <p class="text-white text-lg">${message}</p>
                </div>
            </div>
        `;
    }
}

// Setup Share and Save buttons
function setupActionButtons() {
    const saveBtns = [document.getElementById('saveMovieBtn'), document.getElementById('sidebarSaveMovieBtn')].filter(Boolean);
    const favBtns = [document.getElementById('favoriteMovieBtn'), document.getElementById('sidebarFavoriteMovieBtn')].filter(Boolean);

    // Setup save buttons
    saveBtns.forEach(btn => {
        if (currentMovie) {
            updateSaveButton(btn);
            btn.addEventListener('click', () => toggleSaveMovie(btn));
        }
    });

    // Setup favorite buttons
    favBtns.forEach(btn => {
        if (currentMovie) {
            updateFavoriteButton(btn);
            btn.addEventListener('click', () => toggleFavoriteMovie(btn));
        }
    });

    // Programmatically bind click and touch handlers for Safari/iOS compatibility
    const prevBtn = document.getElementById('btn-prev-episode');
    const nextBtn = document.getElementById('btn-next-episode');
    const cinemaBtn = document.getElementById('cinemaModeBtn');
    const fsBtn = document.getElementById('fullscreenBtn');

    if (prevBtn && !prevBtn.hasAttribute('data-safari-bound')) {
        prevBtn.setAttribute('data-safari-bound', 'true');
        const handlePrev = (e) => {
            e.preventDefault();
            if (typeof playPreviousEpisode === 'function') playPreviousEpisode();
        };
        prevBtn.addEventListener('click', handlePrev);
        prevBtn.addEventListener('touchend', handlePrev, { passive: false });
    }

    if (nextBtn && !nextBtn.hasAttribute('data-safari-bound')) {
        nextBtn.setAttribute('data-safari-bound', 'true');
        const handleNext = (e) => {
            e.preventDefault();
            if (typeof playNextEpisode === 'function') playNextEpisode();
        };
        nextBtn.addEventListener('click', handleNext);
        nextBtn.addEventListener('touchend', handleNext, { passive: false });
    }

    if (cinemaBtn && !cinemaBtn.hasAttribute('data-safari-bound')) {
        cinemaBtn.setAttribute('data-safari-bound', 'true');
        const handleCinema = (e) => {
            e.preventDefault();
            if (typeof toggleCinemaMode === 'function') toggleCinemaMode();
        };
        cinemaBtn.addEventListener('click', handleCinema);
        cinemaBtn.addEventListener('touchend', handleCinema, { passive: false });
    }

    if (fsBtn && !fsBtn.hasAttribute('data-safari-bound')) {
        fsBtn.setAttribute('data-safari-bound', 'true');
        const handleFs = (e) => {
            e.preventDefault();
            if (typeof toggleFullscreen === 'function') toggleFullscreen();
        };
        fsBtn.addEventListener('click', handleFs);
        fsBtn.addEventListener('touchend', handleFs, { passive: false });
    }
}

// Share movie function
function shareMovie() {
    if (!currentMovie) return;

    const shareData = {
        title: currentMovie.name,
        text: `Xem phim ${currentMovie.name} (${currentMovie.year}) trên A Phim`,
        url: window.location.href
    };

    // Check if Web Share API is supported
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('✅ Shared successfully'))
            .catch((error) => console.log('❌ Error sharing:', error));
    } else {
        // Fallback: Copy link to clipboard
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                alert('✅ Đã sao chép link phim vào clipboard!');
            })
            .catch(() => {
                // Show share modal with social media options
                showShareModal();
            });
    }
}

// Show share modal
function showShareModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-surface-dark rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">Chia sẻ phim</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="mb-4">
                <p class="text-gray-300 mb-2">${currentMovie.name}</p>
                <div class="flex items-center gap-2 bg-black/40 p-3 rounded-lg">
                    <input type="text" value="${window.location.href}" 
                        class="flex-1 bg-transparent text-gray-300 text-sm outline-none" readonly />
                    <button onclick="copyShareLink()" 
                        class="px-3 py-1 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors text-sm">
                        Sao chép
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                <button onclick="shareToFacebook()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    <span class="text-2xl">📘</span>
                    <span class="text-xs text-white">Facebook</span>
                </button>
                <button onclick="shareToTwitter()" 
                    class="flex flex-col items-center gap-2 p-3 bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors">
                    <span class="text-2xl">🐦</span>
                    <span class="text-xs text-white">Twitter</span>
                </button>
                <button onclick="shareToTelegram()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                    <span class="text-2xl">✈️</span>
                    <span class="text-xs text-white">Telegram</span>
                </button>
                <button onclick="shareToZalo()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-400 hover:bg-blue-500 rounded-lg transition-colors">
                    <span class="text-2xl">💬</span>
                    <span class="text-xs text-white">Zalo</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Copy share link
window.copyShareLink = function () {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            alert('✅ Đã sao chép link!');
        });
};

// Share to social media
window.shareToFacebook = function () {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.shareToTwitter = function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Xem phim ${currentMovie.name} trên A Phim`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
};

window.shareToTelegram = function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Xem phim ${currentMovie.name}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};

window.shareToZalo = function () {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://zalo.me/share?url=${url}`, '_blank');
};

// Toggle save movie (Launch Playlist Modal)
function toggleSaveMovie(button) {
    if (!currentMovie) return;

    // Check if user is logged in
    if (!authService.isLoggedIn()) {
        if (typeof window.showAuthModal === 'function') {
            window.showAuthModal('login');
        }
        return;
    }

    // Open standard playlist management modal
    if (typeof openPlaylistModal === 'function') {
        openPlaylistModal({
            slug: currentMovie.slug,
            name: currentMovie.name,
            thumb_url: currentMovie.thumb_url || currentMovie.poster_url,
            year: currentMovie.year
        });
    } else {
        console.error('❌ openPlaylistModal function not defined. Verify playlist-modal.js loading.');
    }
}

// Update save button UI
function updateSaveButton(button) {
    // For playlist modal, the button always triggers the prompt. 
    // Optional: we could dynamically check if it exists in ANY playlist.
    // Keeping it simple and functional as a prompt trigger.
    if (!currentMovie) return;
}

// setupActionButtons is now called directly in loadMovieAndPlay() after currentMovie is set

// Toggle favorite movie
function toggleFavoriteMovie(button) {
    if (!currentMovie) return;

    // Check if user is logged in
    if (!authService.isLoggedIn()) {
        if (typeof window.showAuthModal === 'function') {
            window.showAuthModal('login');
        }
        return;
    }

    if (userService.isFavorite(currentMovie.slug)) {
        userService.removeFromFavorites(currentMovie.slug);
    } else {
        userService.addToFavorites(currentMovie);
    }

    // Synchronize both primary and sidebar favorite buttons
    const favBtns = [document.getElementById('favoriteMovieBtn'), document.getElementById('sidebarFavoriteMovieBtn')].filter(Boolean);
    favBtns.forEach(btn => updateFavoriteButton(btn));
}

// Update favorite button UI
function updateFavoriteButton(button) {
    if (!currentMovie || !button) return;

    const isFav = userService.isFavorite(currentMovie.slug);
    const icon = button.querySelector('.material-icons-round') || button.querySelector('.material-icons-outlined');
    const textSpan = button.querySelector('.whitespace-nowrap');

    if (isFav) {
        if (icon) {
            icon.textContent = 'favorite';
            icon.classList.remove('group-hover:text-red-400');
            icon.classList.add('text-red-500');
        }
        if (textSpan) textSpan.textContent = 'Đã thích';
        button.classList.add('text-red-500');
        button.classList.remove('text-gray-300');
    } else {
        if (icon) {
            icon.textContent = 'favorite_border';
            icon.classList.add('group-hover:text-red-400');
            icon.classList.remove('text-red-500');
        }
        if (textSpan) textSpan.textContent = 'Yêu thích';
        button.classList.remove('text-red-500');
        button.classList.add('text-gray-300');
    }
}



// Show YouTube/Netflix-style visual seek notification overlay
function showSeekOverlay(text, isRight) {
    const container = document.querySelector('.aspect-video');
    if (!container) return;
    
    // Remove existing seek indicators to avoid overlaps
    const oldIndicator = container.querySelector('.seek-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    const indicator = document.createElement('div');
    indicator.className = `seek-indicator absolute z-30 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center bg-black/70 text-white rounded-full w-24 h-24 backdrop-blur-md transition-all duration-300 scale-75 opacity-0`;
    
    // Explicitly enforce horizontal positioning on correct side of the parent player container
    indicator.style.position = 'absolute';
    indicator.style.top = '50%';
    indicator.style.transform = 'translate(-50%, -50%)';
    if (isRight) {
        indicator.style.right = '20%';
        indicator.style.left = 'auto';
    } else {
        indicator.style.left = '20%';
        indicator.style.right = 'auto';
    }
    
    const icon = isRight ? 'fast_forward' : 'fast_rewind';
    indicator.innerHTML = `
        <span class="material-icons-round text-4xl mb-1.5 animate-pulse">${icon}</span>
        <span class="text-xs font-black tracking-wider">${text}</span>
    `;
    
    container.appendChild(indicator);
    
    // Smooth fade & scale entrance
    requestAnimationFrame(() => {
        indicator.classList.remove('scale-75', 'opacity-0');
        indicator.classList.add('scale-100', 'opacity-100');
    });
    
    // Fade out and self-destruct after 800ms
    setTimeout(() => {
        indicator.classList.add('scale-75', 'opacity-0');
        setTimeout(() => indicator.remove(), 300);
    }, 800);
}

// Global changeEpisode helper to update query string parameters and transition instantly
window.changeEpisode = function(episodeSlug) {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0) return;
    
    // Reset server index to 0 when changing episode manually
    currentServerIndex = 0;
    
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const foundEp = serverData.find(ep => ep.slug === episodeSlug);
    if (!foundEp) return;

    // 1. Update active state variables
    currentEpisode = foundEp;

    // 2. Update URL query parameter cleanly without page reload
    if (window.location.pathname.startsWith('/xem-phim/')) {
        window.history.pushState({}, '', `/xem-phim/${currentMovie.slug}/tap-${episodeSlug}`);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('episode', episodeSlug);
        window.history.pushState({}, '', 'watch.html?' + urlParams.toString());
    }

    // 3. Update document title
    document.title = `${currentMovie.name} - ${currentEpisode.name} - APhim`;

    // 4. Update play stream (Re-initialize player or switch stream)
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        initializePlayer(currentEpisode);
    } else {
        renderPlayerPlaceholder(currentEpisode);
    }

    // 5. Update Watch History
    if (typeof userService !== 'undefined' && typeof userService.addToHistory === 'function') {
        userService.addToHistory(currentMovie, currentEpisode.name);
    }

    // 6. Rerender Episode List to update highlights
    renderEpisodeList(currentMovie.episodes);

    // 7. Update prev/next episode navigation buttons
    updateEpisodeNavButtons();
};

// Update under-player navigation skip buttons (opacity, clickability)
function updateEpisodeNavButtons() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug === currentEpisode.slug);
    
    const prevBtn = document.getElementById('btn-prev-episode');
    const nextBtn = document.getElementById('btn-next-episode');
    
    if (prevBtn) {
        if (currentIndex <= 0) {
            prevBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            prevBtn.classList.remove('hover:text-primary');
        } else {
            prevBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            prevBtn.classList.add('hover:text-primary');
        }
    }
    
    if (nextBtn) {
        if (currentIndex >= serverData.length - 1) {
            nextBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            nextBtn.classList.remove('hover:text-primary');
        } else {
            nextBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            nextBtn.classList.add('hover:text-primary');
        }
    }
}

// Navigation skip buttons action
function playPreviousEpisode() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug === currentEpisode.slug);
    if (currentIndex > 0) {
        window.changeEpisode(serverData[currentIndex - 1].slug);
    }
}

function playNextEpisode() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug === currentEpisode.slug);
    if (currentIndex < serverData.length - 1) {
        window.changeEpisode(serverData[currentIndex + 1].slug);
    }
}

// Autoplay next episode with a gorgeous Netflix-style countdown overlay
function autoPlayNext() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug === currentEpisode.slug);
    
    // If it's the last episode, do nothing
    if (currentIndex >= serverData.length - 1) return;
    
    const nextEpisode = serverData[currentIndex + 1];
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;
    
    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'netflix-next-countdown';
    overlay.className = 'absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white z-[99] transition-opacity duration-300 opacity-0';
    overlay.style.borderRadius = '12px';
    
    let countdownVal = 10;
    
    overlay.innerHTML = `
        <div class="text-center p-6 space-y-4 max-w-sm select-none">
            <p class="text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">TẬP TIẾP THEO</p>
            <h4 class="text-lg md:text-2xl font-black text-[#fcd576] truncate max-w-[280px] md:max-w-xs mx-auto">${nextEpisode.name}</h4>
            
            <div class="relative w-16 h-16 md:w-20 md:h-20 mx-auto flex items-center justify-center">
                <!-- Circular SVG Countdown Progress Bar -->
                <svg class="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="transparent" />
                    <circle id="countdown-progress-bar" cx="40" cy="40" r="34" stroke="#fcd576" stroke-width="4" fill="transparent" 
                            stroke-dasharray="213.6" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear;" />
                </svg>
                <span id="countdown-number" class="absolute text-xl md:text-2xl font-black text-white">${countdownVal}</span>
            </div>
            
            <div class="flex items-center justify-center gap-3 pt-2">
                <button id="cancel-countdown-btn" class="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer active:scale-95">
                    Hủy
                </button>
                <button id="play-now-countdown-btn" class="px-4 py-1.5 bg-[#fcd576] hover:bg-white hover:text-black text-black rounded-lg font-bold text-xs transition-colors cursor-pointer active:scale-95">
                    Phát ngay
                </button>
            </div>
        </div>
    `;
    
    playerContainer.appendChild(overlay);
    
    // Force reflow and fade in
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
    });
    
    const progressCircle = document.getElementById('countdown-progress-bar');
    const countdownNumber = document.getElementById('countdown-number');
    const maxOffset = 213.6;
    
    // Set initial stroke-dashoffset logic
    if (progressCircle) {
        progressCircle.setAttribute('cx', playerContainer.clientWidth > 640 ? '40' : '32');
        progressCircle.setAttribute('cy', playerContainer.clientWidth > 640 ? '40' : '32');
    }
    
    const intervalId = setInterval(() => {
        countdownVal--;
        if (countdownNumber) countdownNumber.textContent = countdownVal;
        if (progressCircle) {
            const offset = maxOffset - (maxOffset * (10 - countdownVal) / 10);
            progressCircle.style.strokeDashoffset = offset;
        }
        
        if (countdownVal <= 0) {
            clearInterval(intervalId);
            window.changeEpisode(nextEpisode.slug);
        }
    }, 1000);
    
    // Wire up events
    document.getElementById('cancel-countdown-btn').onclick = () => {
        clearInterval(intervalId);
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 300);
    };
    
    document.getElementById('play-now-countdown-btn').onclick = () => {
        clearInterval(intervalId);
        window.changeEpisode(nextEpisode.slug);
    };
}

// Cinema mode (Tắt đèn): Dim all surrounding elements for a true movie theater experience
let isCinemaModeActive = false;
let bodyClickCancelHandler = null;

window.toggleCinemaMode = function() {
    const targetElement = document.getElementById('player-and-controls');
    const cinemaBtn = document.getElementById('cinemaModeBtn');
    if (!targetElement) return;

    const elementsToDim = [
        document.querySelector('nav'),
        document.getElementById('sidebar-col'),
        document.getElementById('comments-section'),
        document.querySelector('footer'),
        document.getElementById('episode-list')?.parentElement
    ].filter(Boolean);

    isCinemaModeActive = !isCinemaModeActive;

    if (isCinemaModeActive) {
        // 1. Dim all surrounding elements with an elite blur and brightness reduction
        elementsToDim.forEach(el => {
            el.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            el.style.opacity = '0.08';
            el.style.filter = 'brightness(0.15) blur(1.5px)';
            el.style.pointerEvents = 'none';
        });

        // 2. Enhance active player wrapper with shadow and prominence
        targetElement.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
        targetElement.style.boxShadow = '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 40px rgba(252, 211, 77, 0.05)';
        targetElement.style.transform = 'scale(1.01)';

        // 3. Update Cinema Button state
        if (cinemaBtn) {
            cinemaBtn.innerHTML = `
                <span class="material-icons-round text-sm sm:text-base text-[#fcd576]">lightbulb</span>
                <span class="text-[#fcd576]">Bật đèn</span>
            `;
        }

        // 4. Click backdrop (any dimmed area) to turn light back on
        bodyClickCancelHandler = function(e) {
            if (!targetElement.contains(e.target) && e.target !== cinemaBtn && !cinemaBtn.contains(e.target)) {
                window.toggleCinemaMode();
            }
        };
        // Use setTimeout to avoid immediate event execution in the same click loop
        setTimeout(() => {
            document.addEventListener('click', bodyClickCancelHandler);
        }, 50);

    } else {
        // 1. Restore all surrounding elements cleanly
        elementsToDim.forEach(el => {
            el.style.opacity = '';
            el.style.filter = '';
            el.style.pointerEvents = '';
        });

        // 2. Restore player styles
        targetElement.style.boxShadow = '';
        targetElement.style.transform = '';

        // 3. Update Cinema Button state
        if (cinemaBtn) {
            cinemaBtn.innerHTML = `
                <span class="material-icons-round text-sm sm:text-base">lightbulb</span>
                <span>Tắt đèn</span>
            `;
        }

        // 4. Clean up backdrop listener
        if (bodyClickCancelHandler) {
            document.removeEventListener('click', bodyClickCancelHandler);
            bodyClickCancelHandler = null;
        }
    }
    
    // Clean up old cinema-overlay if it exists from previous attempts
    const oldOverlay = document.getElementById('cinema-overlay');
    if (oldOverlay) oldOverlay.remove();
};

// Toggle browser Fullscreen API on player container
function toggleFullscreen() {
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;
    
    const fsBtn = document.getElementById('fullscreenBtn');
    
    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().then(() => {
            if (fsBtn) {
                fsBtn.innerHTML = `
                    <span class="material-icons-round text-sm sm:text-base">fullscreen_exit</span>
                    <span>Thu nhỏ</span>
                `;
            }
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen().then(() => {
            if (fsBtn) {
                fsBtn.innerHTML = `
                    <span class="material-icons-round text-sm sm:text-base">fullscreen</span>
                    <span>Toàn màn hình</span>
                `;
            }
        });
    }
}

// Sync fullscreen Escape exit
document.addEventListener('fullscreenchange', () => {
    const fsBtn = document.getElementById('fullscreenBtn');
    if (!fsBtn) return;
    if (document.fullscreenElement) {
        fsBtn.innerHTML = `
            <span class="material-icons-round text-sm sm:text-base">fullscreen_exit</span>
            <span>Thu nhỏ</span>
        `;
    } else {
        fsBtn.innerHTML = `
            <span class="material-icons-round text-sm sm:text-base">fullscreen</span>
            <span>Toàn màn hình</span>
        `;
    }
});

// Beautiful Premium Toast notification for reporting errors
function reportError() {
    let toast = document.getElementById('error-report-toast');
    if (toast) {
        toast.remove(); // Remove active instance to reset countdown
    }
    
    toast = document.createElement('div');
    toast.id = 'error-report-toast';
    // Style with ultra-premium glassmorphic styling
    toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[10005] flex items-center gap-3 px-6 py-4 bg-[#1a1a1a]/95 backdrop-blur-md border border-[#fcd576]/30 text-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] transition-all duration-300 opacity-0 -translate-y-4 select-none pointer-events-none';
    
    toast.innerHTML = `
        <span class="material-icons-round text-[#fcd576] text-xl animate-bounce">check_circle</span>
        <span class="text-sm font-extrabold tracking-wide text-gray-200">Đã ghi nhận báo lỗi, cảm ơn bạn</span>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', '-translate-y-4');
        toast.classList.add('opacity-100', 'translate-y-0');
    });
    
    // Auto close after 3 seconds
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

