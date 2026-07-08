let currentCountry = '';
let currentCountryName = '';
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let isLoading = false;

const skeletonGrid = document.getElementById('skeletonGrid');
const moviesGrid = document.getElementById('moviesGrid');
const moviesList = document.getElementById('moviesList');
const movieCount = document.getElementById('movieCount');
const countryTitle = document.getElementById('countryTitle');
const error = document.getElementById('error');

async function loadCountryMovies(countrySlug, countryName, page = 1) {
    if (isLoading) return;

    try {
        isLoading = true;
        currentCountry = countrySlug;
        currentCountryName = countryName;
        currentPage = page;

        if (skeletonGrid) skeletonGrid.classList.remove('hidden');
        if (moviesGrid) moviesGrid.classList.add('hidden');
        if (error) error.classList.add('hidden');

        console.log(`Loading ${countryName} movies - Page ${page}...`);

        // Use standard path layout
        const endpoint = `/quoc-gia/${countrySlug}?page=${page}&limit=40`;
        console.log('Fetching via proxy/mirrors:', endpoint);

        const response = await movieAPI.fetchWithFallback(endpoint, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`${countryName} movies data:`, data);

        if (data.status === 'success' && data.data && data.data.items) {
            const movies = data.data.items;
            const params = data.data.params || {};
            const pagination = params.pagination || {};

            const totalItemsFromAPI = pagination.totalItems || 0;
            const itemsPerPage = 40;

            if (totalItemsFromAPI > 0) {
                totalPages = Math.ceil(totalItemsFromAPI / itemsPerPage);
                totalItems = totalItemsFromAPI;
            } else {
                totalPages = 18;
                totalItems = movies.length * totalPages;
            }

            renderMovies(movies, countryName);
            showPagination();

            if (skeletonGrid) skeletonGrid.classList.add('hidden');
            if (moviesGrid) moviesGrid.classList.remove('hidden');
        } else {
            throw new Error('Invalid data format');
        }
    } catch (err) {
        console.error('Error loading movies:', err);
        if (skeletonGrid) skeletonGrid.classList.add('hidden');
        if (error) error.classList.remove('hidden');
    } finally {
        isLoading = false;
    }
}

function renderMovies(movies, countryName) {
    if (countryTitle) countryTitle.textContent = `Phim ${countryName}`;
    if (movieCount) movieCount.textContent = `${movies.length} phim (Trang ${currentPage}/${totalPages} - Tổng: ${totalItems.toLocaleString()} phim)`;

    if (moviesList) {
        let gridHTML = '';

        movies.forEach((movie) => {
            const thumbUrl = movie.thumb_url || movie.poster_url || '';
            const posterUrl = thumbUrl ? `https://img.ophim.live/uploads/movies/${thumbUrl}` : 'https://via.placeholder.com/200x300?text=No+Image';
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

        moviesList.innerHTML = gridHTML;
    }
}

function showPagination() {
    let paginationContainer = document.getElementById('pagination') || document.getElementById('paginationContainer');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'mt-12 w-full';
        if (moviesGrid) moviesGrid.appendChild(paginationContainer);
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    paginationContainer.innerHTML = window.renderModernPagination(currentPage, totalPages, `loadCountryMovies('${currentCountry}', '${currentCountryName}', PAGE)`);

    const newUrl = `${window.location.pathname}?country=${currentCountry}&page=${currentPage}`;
    if (currentPage === 1 && !window.location.search.includes('page=')) {
        window.history.replaceState({}, '', newUrl);
    } else {
        window.history.pushState({}, '', newUrl);
    }
}

window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering countries...');
    if (currentCountry && currentCountryName && !isLoading) {
        loadCountryMovies(currentCountry, currentCountryName, currentPage);
    }
});

function initCountryMovies() {
    const urlParams = new URLSearchParams(window.location.search);
    const countryParam = urlParams.get('country');
    const pageParam = parseInt(urlParams.get('page')) || 1;

    const countryNames = {
        'viet-nam': 'Việt Nam',
        'han-quoc': 'Hàn Quốc',
        'trung-quoc': 'Trung Quốc',
        'nhat-ban': 'Nhật Bản',
        'thai-lan': 'Thái Lan',
        'au-my': 'Âu Mỹ',
        'hong-kong': 'Hồng Kông',
        'dai-loan': 'Đài Loan',
        'an-do': 'Ấn Độ',
        'anh': 'Anh',
        'phap': 'Pháp',
        'canada': 'Canada'
    };

    if (countryParam && countryNames[countryParam]) {
        loadCountryMovies(countryParam, countryNames[countryParam], pageParam);
    } else {
        if (moviesGrid) moviesGrid.classList.remove('hidden');
        if (countryTitle) countryTitle.textContent = 'Chọn quốc gia để xem phim';
        if (movieCount) movieCount.textContent = 'Vui lòng chọn quốc gia từ menu "Phim" ở trên';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountryMovies);
} else {
    initCountryMovies();
}


