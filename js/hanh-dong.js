// Phim Hành Động Page Script
let currentPage = 1;
const CATEGORY_SLUG = 'hanh-dong';

document.addEventListener('DOMContentLoaded', function () {
    loadActionMovies();
});

// Load action movies from API
async function loadActionMovies() {
    const moviesGrid = document.getElementById('moviesGrid');

    // Show loading
    moviesGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p class="text-gray-400 mt-4">Đang tải phim hành động...</p>
        </div>
    `;

    try {
        console.log('Loading action movies, page:', currentPage);

        // Load movies from category "hanh-dong"
        const data = await movieAPI.getMoviesFromMultipleSources(currentPage, CATEGORY_SLUG);
        console.log('Action movies data:', data);

        if (data && data.status === 'success' && data.data && data.data.items) {
            const movies = data.data.items;
            console.log('Movies found:', movies.length);

            if (movies.length > 0) {
                renderMoviesGrid(movies);
                renderPagination(data.data);
            } else {
                showNoMovies();
            }
        } else {
            console.error('Invalid data structure:', data);
            showNoMovies();
        }
    } catch (error) {
        console.error('Error loading action movies:', error);
        moviesGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-icons-round text-6xl text-red-400 mb-4">error_outline</span>
                <p class="text-red-400">Đã xảy ra lỗi khi tải phim</p>
            </div>
        `;
    }
}

// Render movies grid with special layout (landscape + portrait overlay)
function renderMoviesGrid(movies) {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;

    let gridHTML = '';

    movies.forEach((movie) => {
        const thumbUrl = movie.thumb_url || movie.poster_url || '';
        const posterUrl = thumbUrl ? `https://phimimg.com/${thumbUrl}` : 'https://via.placeholder.com/200x300?text=No+Image';
        const year = movie.year || 'N/A';
        const quality = movie.quality || movie.lang || '';
        const episodeCurrent = movie.episode_current || 'N/A';
        const tmdbRating = movie.tmdb?.vote_average || null;
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        gridHTML += `
            <a href="/phim/${movie.slug}" 
               class="group relative block rounded-xl overflow-hidden bg-surface-dark hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl ${hiddenUI.containerClass}">
                <!-- Poster -->
                <div class="relative aspect-[2/3]">
                    <img src="${posterUrl}" 
                         alt="${movie.name}"
                         class="w-full h-full object-cover ${hiddenUI.imgClass}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
                    
                    ${hiddenUI.badge}
                    
                    <!-- Overlay gradient -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <!-- Quality badge -->
                    ${quality && !hiddenUI.badge ? `
                        <div class="absolute top-2 left-2">
                            <span class="px-2 py-1 bg-primary text-black text-xs font-bold rounded shadow-lg">
                                ${quality}
                            </span>
                        </div>
                    ` : ''}
                    
                    <!-- Episode badge -->
                    <div class="absolute top-2 right-2">
                        <span class="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded shadow-lg">
                            ${episodeCurrent}
                        </span>
                    </div>
                    
                    <!-- Rating -->
                    ${tmdbRating ? `
                        <div class="absolute bottom-2 left-2 flex items-center gap-0.5 bg-primary/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(232,185,79,0.5)] px-1.5 py-0.5 rounded">
                            <span class="material-icons-round text-black text-[12px]">star</span>
                            <span class="text-black text-[10px] font-bold">${tmdbRating}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Year -->
                    <div class="absolute bottom-2 right-2 bg-green-600 shadow-lg px-1.5 py-0.5 rounded">
                        <span class="text-white text-[10px] font-bold">${year}</span>
                    </div>
                    
                    <!-- Play icon on hover -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                            <span class="material-icons-round text-black text-4xl">play_arrow</span>
                        </div>
                    </div>
                </div>
                
                <!-- Movie info -->
                <div class="p-3">
                    <h3 class="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        ${movie.name}
                    </h3>
                    <p class="text-gray-400 text-xs line-clamp-1">${movie.origin_name || ''}</p>
                </div>
            </a>
        `;
    });

    moviesGrid.innerHTML = gridHTML;
}

// Show no movies message
function showNoMovies() {
    const moviesGrid = document.getElementById('moviesGrid');
    moviesGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <span class="material-icons-round text-6xl text-gray-600 mb-4">movie_filter</span>
            <p class="text-gray-400 text-lg">Không tìm thấy phim hành động</p>
        </div>
    `;
}

// Render pagination
function renderPagination(params) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    const totalItems = Number(params.pagination?.totalItems || params.params?.pagination?.totalItems || params.totalItems || 0);
    const totalItemsPerPage = Number(params.pagination?.totalItemsPerPage || params.params?.pagination?.totalItemsPerPage || params.totalItemsPerPage || 24);
    const curPage = Number(params.pagination?.currentPage || params.params?.pagination?.currentPage || params.currentPage || currentPage || 1);
    const totalPgs = Number(params.pagination?.totalPages || params.params?.pagination?.totalPages || params.totalPages || Math.ceil(totalItems / totalItemsPerPage) || 1);
    
    if (totalPgs <= 1 && totalItems === 0) {
        pagination.innerHTML = '';
        return;
    }
    
    pagination.innerHTML = window.renderModernPagination(curPage, totalPgs, "goToPage(PAGE)");
}

// Go to page
window.goToPage = function (page) {
    currentPage = page;
    loadActionMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


