// Movie Detail Page Script
let currentMovie = null;

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');

    if (!slug && window.location.pathname.startsWith('/phim/')) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && !parts[1].endsWith('.html')) {
            slug = parts[1];
        }
    }

    if (!slug) {
        window.location.href = '/';
        return;
    }

    await loadMovieDetail(slug);

    // 🎬 Initialize Lottie for Watch Now button
    if (typeof lottie !== 'undefined' && document.getElementById('play-btn-lottie')) {
        const playBtnAnim = lottie.loadAnimation({
            container: document.getElementById('play-btn-lottie'),
            renderer: 'svg',
            loop: true,
            autoplay: false,
            path: '/icons/play-button.json?v=5'
        });

        const watchNowBtn = document.getElementById('watchNowBtn');
        if (watchNowBtn) {
            watchNowBtn.addEventListener('mouseenter', () => playBtnAnim.play());
            watchNowBtn.addEventListener('mouseleave', () => playBtnAnim.stop());
        }
    }
});

// Load movie detail from API
async function loadMovieDetail(slug) {
    try {
        const response = await movieAPI.getMovieDetail(slug);

        if (response && response.status === 'success' && response.data) {
            currentMovie = response.data.item;
            renderMovieDetail(currentMovie);
            renderEpisodes(currentMovie.episodes);
            setupFavoriteButton();
            setupRatingSystem();
            loadRatingsAndComments(slug);
        } else {
            showError('Không thể tải thông tin phim');
        }
    } catch (error) {
        console.error('Error loading movie detail:', error);
        showError('Đã xảy ra lỗi khi tải thông tin phim');
    }
}

// Render movie detail
function renderMovieDetail(movie) {
    // 🚀 INJECT DYNAMIC SEO - Overrides meta, title & schema
    if (typeof SEO !== 'undefined') {
        SEO.updateMovieSEO(movie);
    } else {
        document.title = `${movie.name} - APhim`;
    }

    // Update poster
    const posterImg = document.querySelector('.aspect-\\[2\\/3\\] img');
    if (posterImg) {
        posterImg.src = movieAPI.getImageURL(movie.thumb_url || movie.poster_url, 600, 85, true);
        posterImg.alt = `Xem Phim ${movie.name} (${movie.year}) Full HD Vietsub tại APhim`;
    }

    // Update background
    const bgImg = document.querySelector('.absolute.top-0 img');
    if (bgImg) {
        bgImg.src = movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 1200, 90, true);
    }

    // Update title
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        // Vietnamese name larger, English name smaller and on one line
        titleElement.className = 'font-vietnam lg:font-playfair font-extrabold lg:font-normal text-white mb-4 leading-tight tracking-tight lg:tracking-normal drop-shadow-2xl text-center lg:text-left w-full';
        titleElement.innerHTML = `
            <span class="block text-4xl md:text-5xl lg:text-7xl mb-1">${movie.name}</span>
            <span class="block text-xl md:text-3xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-bright whitespace-nowrap overflow-hidden text-ellipsis opacity-90 font-bold tracking-wide">
                ${movie.origin_name}
            </span>
        `;
    }

    // ✅ Update breadcrumb — hiện tên phim thực thay vì hardcode và thêm danh mục
    const breadcrumb = document.getElementById('breadcrumb-movie-name');
    if (breadcrumb) {
        breadcrumb.textContent = movie.name;
        
        if (!document.getElementById('breadcrumb-category')) {
            let categoryName = '';
            let categoryLink = '';
            
            // Xử lý breadcrumb thông minh: nhớ trang trước đó (referrer)
            const referrer = document.referrer;
            let refMatched = false;
            
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
                // Lưu lại state cho trang watch.html dùng
                sessionStorage.setItem('breadcrumbName', categoryName);
                sessionStorage.setItem('breadcrumbLink', categoryLink);
                
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

    // Update info
    const infoContainer = document.querySelector('.movie-info-container') || document.querySelector('.flex.flex-wrap.items-center.gap-4.mb-8');
    if (infoContainer) {
        // Nowrap on mobile - text auto shrinks to fit one line
        infoContainer.className = 'movie-info-container flex flex-nowrap justify-center lg:justify-start items-center gap-x-2 sm:gap-x-3 md:gap-4 mb-6 md:mb-8 text-[11px] sm:text-sm md:text-base overflow-hidden';

        const avgRating = ratingService.getAverageRating(movie.slug);
        const ratings = ratingService.getRatings(movie.slug);

        infoContainer.innerHTML = `
            ${movie.type === 'series' || movie.type === 'hoathinh' || movie.type === 'tvshows' ? 
                `<span style="background-color: #1e3a5f; color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.2); box-shadow: 0 2px 8px rgba(30, 58, 95, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.type === 'series' ? 'Series' : movie.type === 'hoathinh' ? 'Hoạt hình' : 'TV Shows'}</span>` 
                : `<span style="background-color: #1e3a5f; color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.2); box-shadow: 0 2px 8px rgba(30, 58, 95, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">Phim Lẻ</span>`}
            
            ${movie.year ? `<span style="background-color: #3b2854; color: #d8b4fe; border: 1px solid rgba(216, 180, 254, 0.2); box-shadow: 0 2px 8px rgba(59, 40, 84, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.year}</span>` : ''}
            
            ${movie.lang ? `<span style="background-color: #164e32; color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2); box-shadow: 0 2px 8px rgba(22, 78, 50, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.lang}</span>` : ''}
            
            ${movie.quality ? `<span style="background-color: #5b3e15; color: #fde047; border: 1px solid rgba(253, 224, 71, 0.2); box-shadow: 0 2px 8px rgba(91, 62, 21, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.quality}</span>` : ''}
        `;
    }

    // Update description
    const descElement = document.querySelector('.mb-10 p') || document.querySelector('.mb-10.max-w-4xl p');
    if (descElement) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = movie.content;
        descElement.textContent = tempDiv.textContent || 'Chưa có mô tả';
    }

    // Update categories and actors
    addMovieMetadata(movie);
    
    // Load movie gallery
    loadMovieGallery(movie);

    // Update watch button
    const watchBtn = document.getElementById('watchNowBtn') || document.querySelector('a[href="/watch"]') || document.querySelector('a[href="watch.html"]');
    if (watchBtn) {
        // Check if admin has set a custom link
        const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');
        const customLink = movieLinks[movie.slug];

        if (customLink) {
            const isHtmlEnv = window.location.pathname.includes('.html');
            if (isHtmlEnv) {
                watchBtn.href = `/watch.html?slug=${movie.slug}`;
            } else {
                watchBtn.href = `/xem-phim/${movie.slug}`;
            }
            watchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            console.log('✅ Custom link found for movie:', movie.slug);
        } else if (movie.episodes && movie.episodes.length > 0) {
            // Có episodes từ API
            const firstEpisode = movie.episodes[0].server_data[0];
            const isHtmlEnv = window.location.pathname.includes('.html');
            if (isHtmlEnv) {
                watchBtn.href = `/watch.html?slug=${movie.slug}&episode=tap-${firstEpisode.slug}`;
            } else {
                watchBtn.href = `/xem-phim/${movie.slug}/tap-${firstEpisode.slug}`;
            }
        } else {
            // Không có link
            watchBtn.classList.add('opacity-50', 'cursor-not-allowed');
            watchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Phim chưa có link xem. Vui lòng quay lại sau!');
            });
        }
    }

    // Setup trailer button
    const trailerBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Xem Trailer') || btn.textContent.includes('Trailer')
    );

    if (trailerBtn && movie.trailer_url) {
        trailerBtn.addEventListener('click', () => {
            showTrailerModal(movie.trailer_url, movie.name);
        });
    } else if (trailerBtn) {
        trailerBtn.classList.add('opacity-50', 'cursor-not-allowed');
        trailerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Phim chưa có trailer');
        });
    }

    // Tích hợp Các bản chiếu
    renderVersions(movie);
}

// Render "Các bản chiếu"
function renderVersions(movie) {
    const actionsContainer = document.querySelector('.movie-actions-container');
    if (!actionsContainer) return;

    let displayLang = 'Phụ đề / Vietsub'; // Mặc định
    if (movie.lang) {
        displayLang = movie.lang;
    }

    const imgUrl = typeof movieAPI !== 'undefined' ? movieAPI.getImageURL(movie.thumb_url || movie.poster_url, 400, 80, true) : 'https://img.ophim.live/uploads/movies/' + (movie.thumb_url || movie.poster_url);

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
        <div class="w-full mt-0 mb-8">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                Các bản chiếu
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch;">
                <!-- SVAP1 -->
                <button onclick="changeVersion('aphim.top')" style="flex: 1; min-width: 260px; background-color: #5a5d6a; ${isSvap1 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent; hover:border-white/30;'}" class="relative overflow-hidden rounded-xl p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group">
                    <div id="svap-bg-1" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>
                    
                    <!-- Lottie Crown SVAP1 VIP -->
                    <div style="position: absolute; top: -5px; right: -5px; z-index: 20; pointer-events: none; width: 60px; height: 60px; transform: rotate(10deg); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                        <dotlottie-wc src="https://lottie.host/3d743490-d86f-4cc7-9170-2fefdb01db16/8A8VL5a8T2.lottie" style="width: 100%; height: 100%;" autoplay loop></dotlottie-wc>
                    </div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap1 ? 'text-[#fcd576]' : 'text-white/90'}">
                        <span class="material-icons-round text-sm">closed_caption</span>
                        <span class="text-[13px] font-medium">${displayLang} (SVAP1)</span>
                    </div>
                    <div class="relative z-10 ${isSvap1 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 4px; z-index: 10; position: relative;" class="mt-1 ${isSvap1 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap1 ? '<span class="flex items-center gap-1"><span class="material-icons-round text-[14px]">check_circle</span> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>
                
                <!-- SVAP2 -->
                <button onclick="changeVersion('aphim1.io.vn')" style="flex: 1; min-width: 260px; background-color: #2b7a4b;" class="relative overflow-hidden rounded-xl ${isSvap2 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent; hover:border-white/30;'} p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group">
                    <div id="svap-bg-2" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap2 ? 'text-[#fcd576]' : 'text-white/90'}">
                        <span class="material-icons-round text-sm">mic</span>
                        <span class="text-[13px] font-medium">${displayLang} (SVAP2)</span>
                    </div>
                    <div class="relative z-10 ${isSvap2 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 4px; z-index: 10; position: relative;" class="mt-1 ${isSvap2 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap2 ? '<span class="flex items-center gap-1"><span class="material-icons-round text-[14px]">check_circle</span> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>

                <!-- SVAP3 -->
                <button onclick="changeVersion('aphim.io.vn')" style="flex: 1; min-width: 260px; background-color: #1e3a8a;" class="relative overflow-hidden rounded-xl ${isSvap3 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent; hover:border-white/30;'} p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group">
                    <div id="svap-bg-3" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap3 ? 'text-[#fcd576]' : 'text-white/90'}">
                        <span class="material-icons-round text-sm">hd</span>
                        <span class="text-[13px] font-medium">${displayLang} (SVAP3)</span>
                    </div>
                    <div class="relative z-10 ${isSvap3 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 4px; z-index: 10; position: relative;" class="mt-1 ${isSvap3 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap3 ? '<span class="flex items-center gap-1"><span class="material-icons-round text-[14px]">check_circle</span> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('versions-container');
    if (oldContainer) oldContainer.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'versions-container';
    wrapper.className = 'w-full block';
    wrapper.innerHTML = versionsHTML;

    actionsContainer.after(wrapper);
}

// Logic chuyển hướng linh hoạt giữa Node và HTML
window.changeVersion = function(domain) {
    const currentDomain = window.location.hostname;
    
    // Nếu domain mục tiêu trùng với domain hiện tại (hoặc đang test ở localhost mà chọn bản mặc định)
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
                
                // Di chuyển phần hình ảnh lên nằm ngay dưới danh sách tập phim
                const mobileEpisodesWrapper = document.getElementById('episodes-mobile')?.parentElement;
                if (mobileEpisodesWrapper) {
                    mobileEpisodesWrapper.after(galleryContainer);
                    console.log('✅ Gallery container moved below mobile episodes list');
                }

                // Update SVAP backgrounds with gallery images dynamically
                const svapBg1 = document.getElementById('svap-bg-1');
                const svapBg2 = document.getElementById('svap-bg-2');
                const svapBg3 = document.getElementById('svap-bg-3');

                if (svapBg1 && svapBg2 && svapBg3) {
                    const img1 = backdrops[0]?.file_path;
                    const img2 = backdrops[1]?.file_path || img1;
                    const img3 = backdrops[2]?.file_path || img2;
                    
                    if (img1) svapBg1.style.backgroundImage = `url('https://wsrv.nl/?url=image.tmdb.org/t/p/w780${img1}')`;
                    if (img2) svapBg2.style.backgroundImage = `url('https://wsrv.nl/?url=image.tmdb.org/t/p/w780${img2}')`;
                    if (img3) svapBg3.style.backgroundImage = `url('https://wsrv.nl/?url=image.tmdb.org/t/p/w780${img3}')`;
                }
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
    };
    
    scrollContainer.addEventListener('scroll', checkScroll);
    setTimeout(checkScroll, 500);
}

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

// Add movie metadata (categories, actors, etc.)
function addMovieMetadata(movie) {
    const metadataContainer = document.querySelector('.lg\\:col-span-8');
    if (!metadataContainer) return;

    const descSection = metadataContainer.querySelector('.mb-10.max-w-4xl') || metadataContainer.querySelector('#movie-content-section') || metadataContainer.querySelector('.mb-10.w-full.text-left');
    if (!descSection) return;

    // Build metadata cards FIRST
    const metadataHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-8 w-full">
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
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
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
                        <span class="text-white font-semibold"><span style="color: #38bdf8;" class="font-bold text-[12px]">${movie.tmdb.vote_average || 'N/A'}</span> /10 <span class="text-gray-400 font-normal">(${movie.tmdb.vote_count || 0})</span></span>
                    </div>
                </div>
            </div>
            ` : ''}

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
            ` : ''}

            <!-- Đạo diễn -->
            ${movie.director && movie.director.length > 0 && movie.director[0] !== '' ? `
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#F97316;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(249,115,22,0.6)"></span>
                        <h4 style="color: #fb923c; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Đạo diễn</h4>
                    </div>
                    <span style="background-color: rgba(249,115,22,0.25); color: #fff7ed;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">${movie.director.length}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${movie.director.map(d => `
                        <span style="background-color: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.3); color: #fed7aa; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="px-2.5 py-0.5 border rounded-lg text-[11px] font-medium">
                            ${d}
                        </span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;

    // Insert metadata right before the description
    descSection.insertAdjacentHTML('beforebegin', metadataHTML);

    // Add cast section AFTER metadata
    if (movie.actor && movie.actor.length > 0) {
        console.log('🎭 Rendering cast section for', movie.actor.length, 'actors:', movie.actor);

        const castHTML = `
            <div class="mt-0 mb-8 w-full max-w-full overflow-hidden" id="cast-section">
                <div class="relative w-full max-w-full">
                    <div id="cast-container" class="flex gap-4 overflow-x-auto scrollbar-hide w-full max-w-full" style="scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 8px;">
                        ${movie.actor.slice(0, 10).map((actor, index) => {
            const colors = ['from-red-500 to-red-700', 'from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-yellow-500 to-yellow-700', 'from-purple-500 to-purple-700', 'from-pink-500 to-pink-700', 'from-indigo-500 to-indigo-700', 'from-teal-500 to-teal-700'];
            const colorClass = colors[index % colors.length];
            const initial = actor.charAt(0).toUpperCase();

            return `
                                <div class="flex-shrink-0 w-20 md:w-[90px] group cursor-pointer" data-actor-name="${actor}">
                                    <div class="relative mb-2">
                                        <div class="actor-avatar-container w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xl font-bold border-2 border-transparent group-hover:border-primary transition-all duration-300 overflow-hidden shadow-lg shadow-black/40">
                                            ${initial}
                                        </div>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-white font-medium text-xs line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-1" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${actor}</p>
                                        <p class="text-gray-400 text-[10px]">Acting</p>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;

        console.log('📝 Cast HTML length:', castHTML.length);
        // Insert AFTER metadata (which is before description)
        descSection.insertAdjacentHTML('beforebegin', castHTML);
        console.log('✅ Cast HTML inserted into DOM');

        // Load actor images from TMDB
        if (typeof loadActorImagesFromTMDB === 'function') {
            // Load async without blocking - use setTimeout to defer
            setTimeout(() => {
                console.log('🎬 Loading actor images in background...');

                const actorElements = document.querySelectorAll('[data-actor-name]');
                console.log('🎭 Actor elements found:', actorElements.length);

                if (actorElements.length > 0) {
                    loadActorImagesFromTMDB(movie).catch(err => {
                        console.warn('⚠️ Failed to load actor images:', err);
                    });
                }
            }, 500); // Delay 500ms to let page render first
        } else {
            console.warn('⚠️ loadActorImagesFromTMDB function not found');
        }
    }
}

// Render episodes
function renderEpisodes(episodes) {
    if (!episodes || episodes.length === 0) return;

    const desktopContainer = document.getElementById('episodes-desktop');
    const mobileContainer = document.getElementById('episodes-mobile');

    if (!desktopContainer && !mobileContainer) {
        console.warn('⚠️ Episode containers not found');
        return;
    }

    const serverData = episodes[0].server_data;

    const html = serverData.map((ep, index) => {
        const isActive = index === 0;
        
        return `
            <a href="/xem-phim/${currentMovie.slug}/tap-${ep.slug}"
                class="${isActive ? 'bg-[#fcd576] text-black font-bold border-transparent' : 'bg-[#323447] hover:bg-white/10 text-gray-300 border-white/5'} px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all border whitespace-nowrap shadow-lg hover:-translate-y-1">
                <span class="material-icons-round text-[18px]">${isActive ? 'play_arrow' : 'play_arrow'}</span>
                <span>${ep.name}</span>
            </a>
        `;
    }).join('');

    if (desktopContainer) desktopContainer.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
}

// Setup favorite button
function setupFavoriteButton() {
    const buttonsContainer = document.querySelector('.movie-actions-container');
    if (!buttonsContainer || !currentMovie) return;

    const isFav = userService.isFavorite(currentMovie.slug);

    const favBtn = document.createElement('button');
    favBtn.className = 'w-[52px] h-[52px] lg:w-auto lg:h-auto lg:px-8 lg:py-4 bg-[#323447] lg:bg-white/10 lg:hover:bg-white/20 text-gray-300 lg:text-white font-semibold rounded-full lg:backdrop-blur-md border border-white/5 lg:border-white/30 lg:hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-0 lg:gap-3 shadow-lg flex-shrink-0';
    favBtn.innerHTML = `
        <span class="material-icons-round text-2xl lg:text-xl">${isFav ? 'favorite' : 'favorite_border'}</span>
        <span class="hidden lg:inline text-base whitespace-nowrap">${isFav ? 'Đã lưu' : 'Lưu phim'}</span>
    `;

    favBtn.addEventListener('click', () => {
        // ✅ Auth gate: hiện modal nếu chưa đăng nhập
        if (!authService.isLoggedIn()) {
            if (typeof window.showAuthModal === 'function') window.showAuthModal('login');
            return;
        }
        if (userService.isFavorite(currentMovie.slug)) {
            userService.removeFromFavorites(currentMovie.slug);
            favBtn.innerHTML = '<span class="material-icons-round text-2xl lg:text-xl">favorite_border</span><span class="hidden lg:inline text-base whitespace-nowrap">Lưu phim</span>';
        } else {
            if (userService.addToFavorites(currentMovie)) {
                favBtn.innerHTML = '<span class="material-icons-round text-2xl lg:text-xl">favorite</span><span class="hidden lg:inline text-base whitespace-nowrap">Đã lưu</span>';
            }
        }
    });

    buttonsContainer.appendChild(favBtn);

    // ── Playlist button ──────────────────────────────────
    const plBtn = document.createElement('button');
    plBtn.className = 'w-[52px] h-[52px] lg:w-auto lg:h-auto lg:px-8 lg:py-4 bg-[#323447] lg:bg-white/10 lg:hover:bg-white/20 text-gray-300 lg:text-white font-semibold rounded-full lg:backdrop-blur-md border border-white/5 lg:border-white/30 lg:hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-0 lg:gap-3 shadow-lg flex-shrink-0';
    plBtn.innerHTML = `
        <span class="material-icons-round text-2xl lg:text-xl">playlist_add</span>
        <span class="hidden lg:inline text-base whitespace-nowrap">Thêm vào</span>
    `;
    plBtn.addEventListener('click', () => {
        // ✅ Auth gate: hiện modal nếu chưa đăng nhập
        if (!authService.isLoggedIn()) {
            if (typeof window.showAuthModal === 'function') window.showAuthModal('login');
            return;
        }
        if (typeof openPlaylistModal === 'function') {
            openPlaylistModal({
                slug: currentMovie.slug,
                name: currentMovie.name,
                thumb_url: currentMovie.thumb_url || currentMovie.poster_url,
                year: currentMovie.year
            });
        }
    });
    buttonsContainer.appendChild(plBtn);
}

// Setup rating system
function setupRatingSystem() {
    console.log("Setting up rating system...");
    // Comment section is now static in HTML
    const commentsSection = document.getElementById('comments-section') || document.querySelector('#comments-section');
    
    if (!commentsSection) {
        console.error("DOM Element #comments-section not found!");
        return;
    }
    
    if (!currentMovie) {
        console.warn("currentMovie is null, cannot setup rating.");
        return;
    }

    if (authService.isLoggedIn()) {
        setupRatingStars();
        setupRatingSubmit();
    } else {
        // ✅ Chưa đăng nhập: gắn click submitRating để hiện auth modal
        const submitBtn = document.getElementById('submitRating');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (typeof window.showAuthModal === 'function') window.showAuthModal('login');
            });
        }
    }
}

// Setup rating stars
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-star');
    const ratingValue = document.getElementById('ratingValue');
    const ratingStarsEl = document.getElementById('ratingStars');

    // Guard: nếu không có element rating stars thì bỏ qua
    if (!ratingStarsEl || stars.length === 0) return;

    let selectedRating = 0;

    // Load user's existing rating
    const userRating = ratingService.getUserRating(currentMovie.slug);
    if (userRating) {
        selectedRating = userRating.rating;
        updateStars(selectedRating);
        document.getElementById('commentInput').value = userRating.comment || '';
    }

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStars(selectedRating);
        });

        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            updateStars(rating, true);
        });
    });

    document.getElementById('ratingStars').addEventListener('mouseleave', () => {
        updateStars(selectedRating);
    });

    function updateStars(rating, isHover = false) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('text-gray-600');
                star.classList.add('text-yellow-400');
            } else {
                star.classList.remove('text-yellow-400');
                star.classList.add('text-gray-600');
            }
        });
        ratingValue.textContent = `${rating}/10`;
        if (!isHover) selectedRating = rating;
    }
}

// Setup rating submit
function setupRatingSubmit() {
    const submitBtn = document.getElementById('submitRating');
    const commentInput = document.getElementById('commentInput');
    const ratingValue = document.getElementById('ratingValue');

    // Guard: firebase-comments.js đã xử lý submit rồi, bỏ qua nếu thiếu element
    if (!submitBtn || !ratingValue) return;

    submitBtn.addEventListener('click', () => {
        const rating = parseInt(ratingValue.textContent.split('/')[0]);
        const comment = commentInput.value.trim();

        if (rating === 0) {
            alert('Vui lòng chọn số sao đánh giá');
            return;
        }

        const result = ratingService.addRating(currentMovie.slug, rating, comment);
        if (result.success) {
            alert('Đánh giá của bạn đã được gửi!');
            loadRatingsAndComments(currentMovie.slug);
        }
    });
}

// Setup comment system
function setupCommentSystem() {
    // Comments will be loaded in loadRatingsAndComments
}

// Load ratings and comments
function loadRatingsAndComments(slug) {
    const ratings = ratingService.getRatings(slug);
    const container = document.getElementById('ratingsContainer');

    if (!container) return;

    if (ratings.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">Chưa có đánh giá nào</p>';
        return;
    }

    container.innerHTML = ratings.map(rating => `
        <div class="border-t border-white/5 pt-6 mt-6">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-bold flex-shrink-0">
                    ${rating.userName.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h4 class="font-bold text-white">${rating.userName}</h4>
                            <div class="flex items-center gap-2 text-sm text-gray-400">
                                <span class="flex items-center gap-1 text-yellow-400 font-bold">
                                    <span class="material-icons-round text-sm">star</span>
                                    ${rating.rating}/10
                                </span>
                                <span>•</span>
                                <span>${new Date(rating.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                    </div>
                    ${rating.comment ? `<p class="text-gray-300 leading-relaxed">${rating.comment}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Show error
function showError(message) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="container mx-auto px-6 py-20 text-center">
                <h2 class="text-2xl font-bold text-red-400 mb-4">${message}</h2>
                <a href="/" class="inline-block px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    Về trang chủ
                </a>
            </div>
        `;
    }
}

// Show trailer modal
function showTrailerModal(trailerUrl, movieName) {
    // Extract YouTube video ID from URL
    let videoId = '';

    if (trailerUrl.includes('youtube.com/watch?v=')) {
        videoId = trailerUrl.split('v=')[1].split('&')[0];
    } else if (trailerUrl.includes('youtu.be/')) {
        videoId = trailerUrl.split('youtu.be/')[1].split('?')[0];
    } else if (trailerUrl.includes('youtube.com/embed/')) {
        videoId = trailerUrl.split('embed/')[1].split('?')[0];
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative w-full max-w-5xl mx-4">
            <button onclick="this.closest('.fixed').remove()" 
                class="absolute -top-12 right-0 text-white hover:text-primary transition-colors">
                <span class="material-icons-round text-4xl">close</span>
            </button>
            <div class="bg-surface-dark rounded-xl overflow-hidden border border-white/10">
                <div class="p-4 border-b border-white/10">
                    <h3 class="text-xl font-bold text-white">Trailer - ${movieName}</h3>
                </div>
                <div class="relative aspect-video">
                    ${videoId ? `
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            class="w-full h-full"
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                            <p>Không thể phát trailer</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    document.body.appendChild(modal);
}
