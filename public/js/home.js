// Home Page Script
document.addEventListener('DOMContentLoaded', async function () {
    await loadFeaturedMovies();
});

// Load featured movies from API
async function loadFeaturedMovies() {
    // Find the movie grid container - look for the specific section with movies
    // The container is inside a section, after the "Phim nổi bật" heading
    const containers = document.querySelectorAll('.grid');
    let container = null;

    // Find the grid that has movie cards (not the footer grid)
    for (let c of containers) {
        if (c.classList.contains('grid-cols-2') || c.className.includes('grid-cols-2')) {
            container = c;
            break;
        }
    }

    if (!container) {
        return; // Container không tồn tại trong trang này
    }

    // Found container

    // Show loading
    container.innerHTML = '<div class="col-span-full text-center py-10"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>';

    try {
        const data = await movieAPI.getMovieList(1);

        if (data && (data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
            renderMovieGrid(data.data.items, container);
        } else {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Không thể tải danh sách phim</div>';
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        container.innerHTML = '<div class="col-span-full text-center py-10 text-red-400">Đã xảy ra lỗi khi tải phim: ' + error.message + '</div>';
    }
}

// Render movie grid
function renderMovieGrid(movies, container) {
    container.innerHTML = movies.map(movie => `
        <a href="movie-detail.html?slug=${movie.slug}"
            class="group relative block rounded-xl overflow-hidden bg-surface-dark border border-white/5 hover:border-primary/50 transition-all duration-300">
            <div class="aspect-[2/3] w-full overflow-hidden relative">
                <img alt="Xem Phim ${movie.name} (${movie.year}) Vietsub HD"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src="${movieAPI.getImageURL(movie.thumb_url)}"
                    onerror="this.src='https://via.placeholder.com/400x600?text=No+Image'" />
                <div class="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded">
                    ${movie.quality || 'HD'}
                </div>
                ${movie.episode_current ? `
                <div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    ${movie.episode_current}
                </div>` : ''}
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                    <div class="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <span class="material-icons-round text-black text-xl">play_arrow</span>
                    </div>
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-white font-semibold truncate group-hover:text-primary transition-colors">
                    ${movie.name}
                </h3>
                <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>${movie.year || 'N/A'}</span>
                    <span class="flex items-center gap-1 text-yellow-500 font-bold">
                        <span class="material-icons-round text-[10px]">star</span> 
                        ${movie.tmdb?.vote_average?.toFixed(1) || 'N/A'}
                    </span>
                </div>
            </div>
        </a>
    `).join('');
}

// Update user UI
// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const keyword = e.target.value.trim();

        if (keyword.length < 2) return;

        searchTimeout = setTimeout(async () => {
            const results = await movieAPI.searchMovies(keyword);
            displaySearchResults(results);
        }, 500);
    });
}

// Display search results
function displaySearchResults(results) {
    // Implement search results dropdown
    // Search results handled elsewhere
}
