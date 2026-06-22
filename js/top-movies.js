// Top Movies Hot Section — New Premium Ranking Layout
async function loadTopMovies() {
    const loading = document.getElementById('topMoviesLoading');
    const container = document.getElementById('topMoviesContainer');

    try {
        // Lấy 10 phim theo yêu cầu Top 10
        const response = await fetch('https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1&limit=10', {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });

        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.items) {
            renderTopMovies(data.data.items);
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
            (thumb.startsWith('http') ? thumb : `https://img.ophim.live/uploads/movies/${thumb}`) : 
            (poster ? (poster.startsWith('http') ? poster : `https://img.ophim.live/uploads/movies/${poster}`) : '');
            
        const optimizedUrl = (typeof imageOptimizer !== 'undefined' && (thumb || poster)) ? 
            imageOptimizer.optimizeImageUrl(thumb || poster, 400, 80) : posterUrl;
        
        const detailUrl = `/phim/${movie.slug}`;
        
        // Episode & Info Badges
        const episodes = movie.episode_current || '';
        
        // Normalize episode label: tránh "Tập Tập X" và "Tập Trailer"
        let episodeLabel = '';
        if (episodes) {
            if (/trailer/i.test(episodes) || /^tập/i.test(episodes)) {
                episodeLabel = episodes; // Giữ nguyên "Trailer" hoặc "Tập 4"
            } else {
                episodeLabel = `Tập ${episodes}`; // Thêm "Tập" vào trước số
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
                        
                        ${window.renderMovieBadges(movie.lang, movie.episode_current)}

                        <div class="ranking-icon-circle"><span class="material-icons-round">edit_note</span></div>

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
                            ${episodeLabel ? `<p class="ranking-extra">${episodeLabel}</p>` : ''}
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
