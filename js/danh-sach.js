// Danh Sách Page Script

const LIST_NAMES = {
    'phim-moi': 'Phim Mới',
    'phim-bo': 'Phim Bộ',
    'phim-le': 'Phim Lẻ',
    'tv-shows': 'TV Shows',
    'hoat-hinh': 'Hoạt Hình',
    'phim-vietsub': 'Phim Vietsub',
    'phim-thuyet-minh': 'Phim Thuyết Minh',
    'phim-long-tien': 'Phim Lồng Tiếng',
    'phim-bo-dang-chieu': 'Phim Bộ Đang Chiếu',
    'phim-bo-hoan-thanh': 'Phim Bộ Đã Hoàn Thành',
    'phim-sap-chieu': 'Phim Sắp Chiếu',
    'subteam': 'Subteam',
    'phim-chieu-rap': 'Phim Chiếu Rạp'
};

let currentList = null;
let currentPage = 1;
let totalPages = 1;

const loading = document.getElementById('loading');
const moviesTable = document.getElementById('moviesTable');
const moviesGrid = document.getElementById('moviesGrid');
const pagination = document.getElementById('pagination');
const error = document.getElementById('error');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const pageHeader = document.getElementById('pageHeader');
const categoriesGrid = document.getElementById('categoriesGrid');
const listTitle = document.getElementById('listTitle');
const movieCountLabel = document.getElementById('movieCountLabel');

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

// Get URL params
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        list: params.get('list'),
        page: parseInt(params.get('page')) || 1
    };
}

// Load movies by list
async function loadMoviesList(listSlug, page = 1) {
    currentList = listSlug;
    currentPage = page;

    const listName = LIST_NAMES[listSlug] || listSlug;
    pageTitle.textContent = listName;
    pageSubtitle.textContent = 'Đang tải danh sách phim...';

    loading.classList.remove('hidden');
    moviesTable.classList.add('hidden');
    error.classList.add('hidden');
    if (categoriesGrid) categoriesGrid.classList.add('hidden');
    // Ẩn header cũ khi xem phim
    if (pageHeader) pageHeader.classList.add('hidden');

    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        // Use movieAPI.fetchWithFallback wrapper to bypass ISP blocks and handle mirrors automatically
        const endpoint = `/danh-sach/${listSlug}?page=${page}&limit=40`;
        console.log('Fetching via proxy/mirrors:', endpoint);

        const response = await movieAPI.fetchWithFallback(endpoint, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.status === 'success' && data.data) {
            const movies = data.data.items || [];
            const params = data.data.params || data.params || {};
            const pagination_data = params.pagination || data.data.pagination || {};

            const totalItems = pagination_data.totalItems || pagination_data.total || movies.length;
            const totalPages_api = pagination_data.totalPages || Math.ceil(totalItems / 40) || 1;
            totalPages = totalPages_api;

            // Move page info to bottom, will be shown in pagination
            pageSubtitle.textContent = `Đang hiển thị ${movies.length} phim`;

            if (movies.length > 0) {
                renderMoviesTable(movies, listName, totalItems, totalPages_api);
                // Always render pagination with proper data
                renderPagination({
                    currentPage: currentPage,
                    totalPages: totalPages_api,
                    totalItems: totalItems
                });
            } else {
                throw new Error('No movies found');
            }

        } else {
            throw new Error('Invalid data format');
        }
    } catch (err) {
        console.error('Error loading movies list:', err);
        console.error('Error details:', err.message);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        error.innerHTML = `
            <span class="material-icons-round text-6xl text-red-400 mb-4">error_outline</span>
            <p class="text-red-400 text-lg">Không thể tải dữ liệu</p>
            <p class="text-gray-400 text-sm mt-2">${err.message}</p>
        `;
    }
}

// Render movies grid - bố cục y như phim-theo-quoc-gia.html
function renderMoviesTable(movies, listName, totalItems, totalPages_api) {
    loading.classList.add('hidden');

    const moviesTable = document.getElementById('moviesTable');
    const moviesGrid = document.getElementById('moviesGrid');

    console.log('moviesTable:', moviesTable);
    console.log('moviesGrid:', moviesGrid);

    if (!moviesTable) {
        console.error('moviesTable element not found!');
        return;
    }

    if (!moviesGrid) {
        console.error('moviesGrid element not found!');
        return;
    }

    moviesTable.classList.remove('hidden');

    // Update header
    if (listTitle) listTitle.textContent = listName || LIST_NAMES[currentList] || currentList;
    if (movieCountLabel) movieCountLabel.textContent = `${movies.length} phim (Trang ${currentPage}/${totalPages_api || totalPages} - Tổng: ${(totalItems || 0).toLocaleString()} phim)`;

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
    console.log(`✅ Rendered ${movies.length} movies to grid`);
}

// Render pagination
function renderPagination(paginationData) {
    if (!paginationData || !paginationData.totalPages) {
        pagination.innerHTML = '';
        return;
    }
    const totalPages_api = paginationData.totalPages;
    const currentPage_api = paginationData.currentPage || currentPage;
    pagination.innerHTML = window.renderModernPagination(currentPage_api, totalPages_api, "goToPage(PAGE)");
}

// Go to page
function goToPage(page) {
    if (page < 1 || page > totalPages || !currentList) return;

    // Update UI immediately for smooth transition
    const allButtons = pagination.querySelectorAll('button');
    allButtons.forEach(btn => {
        const btnText = btn.textContent.trim();
        if (btnText === page.toString()) {
            // Highlight new page button
            btn.className = 'px-4 py-2 bg-primary text-black font-bold rounded-lg flex-shrink-0 transition-all duration-300';
        } else if (!btn.querySelector('.material-icons-round')) {
            // Reset other page buttons
            btn.className = 'px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-colors flex-shrink-0';
        }
    });

    // Navigate to new page
    window.location.href = `?list=${currentList}&page=${page}`;
}

function initMoviesList() {
    const params = getUrlParams();
    const categoriesGrid = document.getElementById('categoriesGrid');

    if (params.list) {
        // Hide categories grid and old header, show movies table
        if (categoriesGrid) categoriesGrid.classList.add('hidden');
        if (pageHeader) pageHeader.classList.add('hidden');
        loadMoviesList(params.list, params.page);
    } else {
        // Show categories grid and old header
        if (categoriesGrid) categoriesGrid.classList.remove('hidden');
        if (pageHeader) pageHeader.classList.remove('hidden');
        pageTitle.textContent = 'Danh Sách Phim';
        pageSubtitle.textContent = 'Khám phá phim ảnh từ 13 loại phim';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoviesList);
} else {
    initMoviesList();
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering danh-sach...');
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const pageParam = parseInt(urlParams.get('page')) || 1;
    if (typeParam) {
        loadMoviesList(typeParam, pageParam);
    }
});


