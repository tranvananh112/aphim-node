// Categories Page Script

let currentCategory = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 40; // 8 columns x 5 rows

document.addEventListener('DOMContentLoaded', async function () {
    // Check if we have a category parameter
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    if (category) {
        // Load movies for this category
        currentCategory = category;
        await loadCategoryMovies(category, 1);
    } else {
        // Show all categories
        await loadAllCategories();
    }
});

// Load all categories from API
async function loadAllCategories() {
    const container = document.getElementById('categoriesGrid');
    const loading = document.getElementById('loading');
    const moviesSection = document.getElementById('moviesSection');

    if (!container) {
        console.error('Categories grid not found');
        return;
    }

    // Show categories grid, hide movies section
    container.classList.remove('hidden');
    moviesSection.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const categories = await movieAPI.getCategories();

        loading.classList.add('hidden');

        if (categories && categories.length > 0) {
            renderCategories(categories);
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-gray-400">Không thể tải danh sách thể loại</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        loading.classList.add('hidden');
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <p class="text-red-400">Đã xảy ra lỗi khi tải thể loại</p>
            </div>
        `;
    }
}

// Load movies for a specific category
async function loadCategoryMovies(categorySlug, page = 1) {
    const moviesSection = document.getElementById('moviesSection');
    const categoriesGrid = document.getElementById('categoriesGrid');
    const loading = document.getElementById('loading');
    const moviesGrid = document.getElementById('moviesGrid');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    // Show movies section, hide categories grid
    moviesSection.classList.remove('hidden');
    categoriesGrid.classList.add('hidden');
    loading.classList.remove('hidden');

    currentCategory = categorySlug;
    currentPage = page;

    try {
        // Get category info
        const categories = await movieAPI.getCategories();
        const category = categories.find(c => c.slug === categorySlug);

        if (category) {
            pageTitle.textContent = category.name;
            pageSubtitle.textContent = `Khám phá ${category.name} hay nhất`;
        }

        // Fetch movies
        const response = await fetch(`https://ophim1.com/v1/api/the-loai/${categorySlug}?page=${page}`);
        const data = await response.json();

        loading.classList.add('hidden');

        if (data.status === 'success' && data.data.items) {
            renderMovies(data.data.items);
            renderPagination(data.data.params.pagination);
        } else {
            moviesGrid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-gray-400">Không tìm thấy phim nào</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading category movies:', error);
        loading.classList.add('hidden');
        moviesGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <p class="text-red-400">Đã xảy ra lỗi khi tải phim</p>
            </div>
        `;
    }
}

// Render movies grid (8 columns)
function renderMovies(movies) {
    const moviesGrid = document.getElementById('moviesGrid');

    const html = movies.map(movie => {
        const thumbUrl = movie.thumb_url || movie.poster_url || '';
        const posterUrl = thumbUrl ? `https://img.ophim.live/uploads/movies/${thumbUrl}` : 'https://via.placeholder.com/200x300?text=No+Image';
        const year = movie.year || 'N/A';
        const quality = movie.quality || movie.lang || '';
        const episodeCurrent = movie.episode_current || 'N/A';
        const tmdbRating = movie.tmdb?.vote_average || null;
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        return `
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
    }).join('');

    moviesGrid.innerHTML = html;
}

// Render pagination - giống trang danh-sach (số trang đầy đủ + tổng kết quả)
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

// Go to specific page
function goToPage(page) {
    if (!currentCategory || page < 1) return;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load movies for this page
    loadCategoryMovies(currentCategory, page);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    window.history.pushState({}, '', url);
}

// Show all categories (back button)
function showAllCategories() {
    // Update URL
    window.history.pushState({}, '', 'categories.html');

    // Reset state
    currentCategory = null;
    currentPage = 1;

    // Update title
    document.getElementById('pageTitle').textContent = 'Thể Loại Phim';
    document.getElementById('pageSubtitle').textContent = 'Khám phá phim theo thể loại yêu thích của bạn';

    // Load categories
    loadAllCategories();
}

// Render categories grid
function renderCategories(categories) {
    const container = document.getElementById('categoriesGrid');

    // Category icons mapping
    const categoryIcons = {
        'hanh-dong': '💥',
        'tinh-cam': '❤️',
        'hai-huoc': '😂',
        'kinh-di': '👻',
        'phieu-luu': '🗺️',
        'khoa-hoc-vien-tuong': '🚀',
        'tam-ly': '🧠',
        'hinh-su': '🔍',
        'chien-tranh': '⚔️',
        'than-thoai': '🐉',
        'gia-dinh': '👨‍👩‍👧‍👦',
        'hoat-hinh': '🎨',
        'tai-lieu': '📚',
        'am-nhac': '🎵',
        'the-thao': '⚽',
        'vo-thuat': '🥋',
        'co-trang': '👑',
        'chinh-kich': '🎭',
        'bi-an': '🔮',
        'phim-18': '🔞'
    };

    const html = categories.map(category => {
        const icon = categoryIcons[category.slug] || '🎬';

        return `
            <a href="/categories?category=${category.slug}"
                class="group relative block rounded-xl overflow-hidden bg-gradient-to-br from-surface-dark to-background-dark border border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
                <div class="p-8 text-center">
                    <div class="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                        ${icon}
                    </div>
                    <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        ${category.name}
                    </h3>
                    <p class="text-sm text-gray-400 mt-2">Khám phá ngay</p>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering categories...');
    if (currentCategory) {
        loadCategoryMovies(currentCategory, currentPage);
    }
});


