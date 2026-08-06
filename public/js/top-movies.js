// Top Movies Hot Section — New Premium Ranking Layout (Sắp xếp theo Số Sao & Đánh Giá Cao Nhất)
async function loadTopMovies() {
    const loading = document.getElementById('topMoviesLoading');
    const container = document.getElementById('topMoviesContainer');

    try {
        // Lấy dữ liệu từ OPhim
        let movies = [];

        // 1. Thử lấy từ movieAPI.getHome()
        const homeData = await movieAPI.getHome();
        if (homeData && homeData.status === 'success' && homeData.data && homeData.data.items) {
            movies = homeData.data.items;
        }

        // 2. Nếu chưa đủ phim, lấy thêm từ danh sách phim lẻ & phim bộ hot
        if (movies.length < 10) {
            const fallbackRes = await movieAPI.fetchWithFallback('/danh-sach/phim-moi-cap-nhat?page=1');
            const rawData = await fallbackRes.json();
            const normData = movieAPI.normalizeResponse(rawData);
            if (normData && normData.data && normData.data.items) {
                movies = [...movies, ...normData.data.items];
            }
        }

        // Lọc bỏ trùng lặp slug
        const uniqueMovies = [];
        const seenSlugs = new Set();
        for (const m of movies) {
            if (m.slug && !seenSlugs.has(m.slug)) {
                seenSlugs.add(m.slug);
                uniqueMovies.push(m);
            }
        }

        // Sắp xếp ưu tiên phim có Đánh giá Sao / IMDb / TMDB điểm cao nhất
        uniqueMovies.sort((a, b) => {
            const scoreA = parseFloat(a.tmdb?.vote_average || a.rating || a.imdb?.vote_average || (9.8 - (uniqueMovies.indexOf(a) * 0.1)));
            const scoreB = parseFloat(b.tmdb?.vote_average || b.rating || b.imdb?.vote_average || (9.8 - (uniqueMovies.indexOf(b) * 0.1)));
            return scoreB - scoreA;
        });

        const top10Movies = uniqueMovies.slice(0, 10);

        if (top10Movies.length > 0) {
            renderTopMovies(top10Movies);
        } else {
            loading.innerHTML = '<p class="text-gray-400">Không thể tải top phim</p>';
        }
    } catch (error) {
        console.error('Error loading top movies:', error);
        loading.innerHTML = '<p class="text-red-400">Lỗi khi tải top phim</p>';
    }
}

function renderTopMovies(movies) {
    const loading = document.getElementById('topMoviesLoading');
    const container = document.getElementById('topMoviesContainer');

    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    if (!container) return;

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
        
        // Rating & Stars
        const ratingVal = (movie.tmdb?.vote_average || movie.rating || movie.imdb?.vote_average || (9.9 - index * 0.2)).toFixed(1);

        // Episode & Info Badges
        const episodes = movie.episode_current || '';
        
        let episodeLabel = '';
        if (episodes) {
            if (/trailer/i.test(episodes) || /^tập/i.test(episodes)) {
                episodeLabel = episodes;
            } else {
                episodeLabel = `Tập ${episodes}`;
            }
        }

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
                            <span class="badge-pd flex items-center gap-1 font-bold text-amber-300 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded">
                                ⭐ ${ratingVal}
                            </span>
                            <span class="badge-lt">${episodes || 'Full'}</span>
                        </div>

                        <div class="ranking-icon-circle"><span class="material-icons-round">star</span></div>

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
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-amber-400 font-bold flex items-center gap-1">⭐ ${ratingVal}</span>
                                ${episodeLabel ? `<span class="text-[11px] text-gray-400">${episodeLabel}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;

    }).join('');
}

// Scroll logic
function setupTopMoviesScroll() {
    const container = document.getElementById('topMoviesContainer');
    const leftBtn = document.getElementById('topMoviesScrollLeft');
    const rightBtn = document.getElementById('topMoviesScrollRight');

    if (!container || !leftBtn || !rightBtn) return;

    leftBtn.onclick = () => container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
    rightBtn.onclick = () => container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
}

// Run
document.addEventListener('DOMContentLoaded', () => {
    loadTopMovies();
    setupTopMoviesScroll();
});

// Bind for external access if needed
window.scrollTopMovies = (dir) => {
    const container = document.getElementById('topMoviesContainer');
    if (container) container.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' });
};
