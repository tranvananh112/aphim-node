/**
 * Coming Soon Movies Section - Top 10 Styling (Sync with Top Movies Layout)
 * Load movies from "phim-chieu-rap"
 */

(function () {
    'use strict';

    // Load theater movies
    async function loadComingSoonMovies() {
        const loading = document.getElementById('comingSoonLoading');
        const container = document.getElementById('comingSoonContainer');

        if (!loading || !container) {
            return;
        }

        try {
            // Fetch from phim-chieu-rap API
            const response = await movieAPI.fetchWithFallback('/danh-sach/phim-chieu-rap?page=1&limit=10', {
                method: 'GET',
                headers: { 'accept': 'application/json' }
            });

            const data = await response.json();

            if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
                renderComingSoonMovies(data.data.items);
            } else {
                loading.innerHTML = '<p class="text-gray-400">Không thể tải phim chiếu rạp</p>';
            }
        } catch (error) {
            console.error('Error loading theater movies:', error);
            loading.innerHTML = '<p class="text-red-400">Lỗi khi tải phim chiếu rạp</p>';
        }
    }

    function renderComingSoonMovies(movies) {
        const loading = document.getElementById('comingSoonLoading');
        const container = document.getElementById('comingSoonContainer');
        
        if (!container) return;

        if (loading) loading.classList.add('hidden');
        container.classList.remove('hidden');

        container.innerHTML = movies.map((movie, index) => {
            const rank = index + 1;
            const thumb = movie.thumb_url || '';
            const poster = movie.poster_url || '';
            
            const posterUrl = thumb ? 
                (thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb}`) : 
                (poster ? (poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`) : '');
                
            const optimizedUrl = (typeof imageOptimizer !== 'undefined' && (thumb || poster)) ? 
                imageOptimizer.optimizeImageUrl(thumb || poster, 400, 80) : posterUrl;
            
            const detailUrl = `movie-detail.html?slug=${movie.slug}`;
            const episodes = movie.episode_current || '';
            
            return `
                <div class="ranking-item group" data-rank="${rank}">
                    <a href="${detailUrl}">
                        <div class="ranking-poster-w">
                            <img src="${optimizedUrl}" 
                                 alt="${movie.name}" 
                                 class="w-full h-full object-cover"
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/400x600?text=No+Poster'"
                                 loading="lazy" />
                            
                            <div class="ranking-badges-bottom">
                                <span class="badge-pd">PĐ. ${episodes.replace(/[^0-9]/g, '') || 'HD'}</span>
                                <span class="badge-lt">LT. ${episodes.replace(/[^0-9]/g, '') || 'Full'}</span>
                            </div>

                            <div class="ranking-icon-circle"><span class="material-icons-round">theaters</span></div>

                            <!-- Hover overlay -->
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                                    <span class="material-icons-round text-black text-2xl">play_arrow</span>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Info with Big Rank -->
                        <div class="ranking-info-w">
                            <div class="rank-big-number">${rank}</div>
                            <div class="ranking-text-content">
                                <h3 class="ranking-title">${movie.name}</h3>
                                <p class="ranking-sub">${movie.origin_name || ''}</p>
                                ${episodes ? `<p class="ranking-extra">${episodes}</p>` : ''}
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');

        // Setup scroll buttons
        setupScrollButtons();
    }

    function setupScrollButtons() {
        const container = document.getElementById('comingSoonContainer');
        const leftBtn = document.getElementById('comingSoonScrollLeft');
        const rightBtn = document.getElementById('comingSoonScrollRight');

        if (!container || !leftBtn || !rightBtn) return;

        leftBtn.onclick = () => container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
        rightBtn.onclick = () => container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
    }

    // Run
    loadComingSoonMovies();
    setupScrollButtons();

    // Expose to window
    window.loadComingSoonMovies = loadComingSoonMovies;
})();
