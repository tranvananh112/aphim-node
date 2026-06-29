// Filter Page Script
const API_BASE = 'https://ophim1.com/v1/api';

// State
let currentPage = 1;
let currentFilters = {
    list: '',
    category: '',
    country: '',
    year: ''
};

// DOM Elements
const filterList = document.getElementById('filterList');
const filterCategory = document.getElementById('filterCategory');
const filterCountry = document.getElementById('filterCountry');
const filterYear = document.getElementById('filterYear');
const applyFilterBtn = document.getElementById('applyFilter');
const resetFilterBtn = document.getElementById('resetFilter');
const moviesGrid = document.getElementById('moviesGrid');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const resultsInfo = document.getElementById('resultsInfo');
const totalResults = document.getElementById('totalResults');
const currentFilter = document.getElementById('currentFilter');
const pagination = document.getElementById('pagination');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilterOptions();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    applyFilterBtn.addEventListener('click', applyFilters);
    resetFilterBtn.addEventListener('click', resetFilters);
}

// Load Filter Options
async function loadFilterOptions() {
    try {
        // Load categories
        const categoriesData = await fetchAPI('/the-loai');
        console.log('Categories data:', categoriesData);

        if (categoriesData.status === 'success' && categoriesData.data) {
            const categories = Array.isArray(categoriesData.data)
                ? categoriesData.data
                : Object.values(categoriesData.data);

            console.log('Categories array:', categories);
            filterCategory.innerHTML = '<option value="">-- Chọn thể loại --</option>' +
                categories.map(cat => `<option value="${cat.slug}">${cat.name}</option>`).join('');
        }

        // Load countries
        const countriesData = await fetchAPI('/quoc-gia');
        console.log('Countries data:', countriesData);

        if (countriesData.status === 'success' && countriesData.data) {
            // API quốc gia trả về array trực tiếp trong data
            const countries = Array.isArray(countriesData.data)
                ? countriesData.data
                : (countriesData.data.items || Object.values(countriesData.data));

            console.log('Countries array:', countries);

            if (countries && countries.length > 0) {
                filterCountry.innerHTML = '<option value="">-- Chọn quốc gia --</option>' +
                    countries.map(country => `<option value="${country.slug}">${country.name}</option>`).join('');
            } else {
                console.error('No countries found in data');
            }
        }

        // Load years (from current year to 1990)
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 1990; year--) {
            years.push(year);
        }
        filterYear.innerHTML = '<option value="">-- Chọn năm --</option>' +
            years.map(year => `<option value="${year}">${year}</option>`).join('');

    } catch (err) {
        console.error('Error loading filter options:', err);
    }
}

// Fetch API
async function fetchAPI(endpoint, page = 1) {
    const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Apply Filters
async function applyFilters() {
    // Get selected values
    currentFilters.list = filterList.value;
    currentFilters.category = filterCategory.value;
    currentFilters.country = filterCountry.value;
    currentFilters.year = filterYear.value;

    // Check if at least one filter is selected
    if (!currentFilters.list && !currentFilters.category && !currentFilters.country && !currentFilters.year) {
        showError('Vui lòng chọn ít nhất một bộ lọc');
        return;
    }

    currentPage = 1;
    await loadMovies();
}

// Reset Filters
function resetFilters() {
    filterList.value = '';
    filterCategory.value = '';
    filterCountry.value = '';
    filterYear.value = '';

    currentFilters = {
        list: '',
        category: '',
        country: '',
        year: ''
    };

    currentPage = 1;
    moviesGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
    error.classList.add('hidden');
}

// Load Movies
async function loadMovies() {
    try {
        showLoading();

        let endpoint = '';
        let filterText = '';

        // Priority: list > category > country > year
        if (currentFilters.list) {
            endpoint = `/danh-sach/${currentFilters.list}`;
            filterText = `từ danh sách "${filterList.options[filterList.selectedIndex].text}"`;
        } else if (currentFilters.category) {
            endpoint = `/the-loai/${currentFilters.category}`;
            filterText = `thể loại "${filterCategory.options[filterCategory.selectedIndex].text}"`;
        } else if (currentFilters.country) {
            endpoint = `/quoc-gia/${currentFilters.country}`;
            filterText = `quốc gia "${filterCountry.options[filterCountry.selectedIndex].text}"`;
        } else if (currentFilters.year) {
            endpoint = `/nam-phat-hanh/${currentFilters.year}`;
            filterText = `năm ${currentFilters.year}`;
        }

        const data = await fetchAPI(endpoint, currentPage);
        console.log('Movies data:', data);

        if (data.status === 'success' && data.data && data.data.items) {
            const movies = data.data.items;
            const paginationData = data.data.params?.pagination || {};

            if (movies.length === 0) {
                showError('Không tìm thấy phim nào');
                return;
            }

            renderMovies(movies);
            updateResultsInfo(paginationData.totalItems || movies.length, filterText);
            renderPagination(paginationData);
            hideLoading();
        } else {
            throw new Error('Invalid data format');
        }
    } catch (err) {
        console.error('Error loading movies:', err);
        showError('Không thể tải danh sách phim. Vui lòng thử lại.');
    }
}

// Render Movies
function renderMovies(movies) {
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

    moviesGrid.innerHTML = gridHTML;
}

// Update Results Info
function updateResultsInfo(total, filterText) {
    totalResults.textContent = total;
    currentFilter.textContent = filterText;
    resultsInfo.classList.remove('hidden');
}

// Render Pagination
function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination') || document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    const totalItems = Number(pagination.totalItems || pagination.total_items || pagination.total || 0);
    const totalItemsPerPage = Number(pagination.totalItemsPerPage || 24);
    const curPage = Number(pagination.currentPage || pagination.current_page || (typeof currentPage !== 'undefined' ? currentPage : 1) || 1);
    const totalPgs = Number(pagination.totalPages || pagination.total_pages || pagination.totalPage || Math.ceil(totalItems / totalItemsPerPage) || 1);

    if (totalPgs <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = window.renderModernPagination(curPage, totalPgs, 'goToPage(PAGE)');
}

// Go to Page
function goToPage(page) {
    currentPage = page;
    loadMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Loading
function showLoading() {
    loading.classList.remove('hidden');
    moviesGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    error.classList.add('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
}

// Hide Loading
function hideLoading() {
    loading.classList.add('hidden');
}

// Show Error
function showError(message) {
    if (!document.getElementById('dotlottie-script')) {
        const script = document.createElement('script');
        script.id = 'dotlottie-script';
        script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
        script.type = "module";
        document.body.appendChild(script);
    }
    if (error) {
        error.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10">
                <dotlottie-wc src="/icons/404-cat.lottie" style="width: 240px; height: 240px; max-width: 100%; margin-bottom: -10px;" autoplay loop></dotlottie-wc>
                <p class="text-red-400 text-lg mt-2 font-medium">${message || 'Không tìm thấy kết quả nào'}</p>
            </div>
        `;
        error.classList.remove('hidden');
    }
    loading.classList.add('hidden');
    moviesGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering filter...');
    loadMovies();
});

});
