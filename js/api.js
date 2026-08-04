// API Service for ophim1.com and Backend
class MovieAPI {
    constructor() {
        this.useBackend = API_CONFIG.USE_BACKEND_FOR_MOVIES || false;
        this.backendURL = API_CONFIG.BACKEND_URL;
        this.ophimURL = API_CONFIG.OPHIM_URL;
        this.ophim17URL = API_CONFIG.OPHIM17_URL;
        this.useMultipleSources = API_CONFIG.USE_MULTIPLE_SOURCES;
    }

    // Helper to fetch with timeout (default 6 seconds)
    async fetchWithTimeout(url, options = {}) {
        const { timeout = 6000, ...rest } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...rest,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    }

    // Standardize & normalize API response for all endpoints across OPhim and PhimAPI
    normalizeResponse(data) {
        if (!data) return null;
        const items = data.data?.items || data.items || [];
        const item = data.data?.item || data.item || null;
        const isSuccess = ((data && (data.status === 'success' || data.status === true || data.status)) || data.status === true || data.status);
        return {
            status: isSuccess ? 'success' : false,
            data: {
                items,
                item,
                params: data.data?.params || data.params,
                seoOnPage: data.data?.seoOnPage || data.seoOnPage,
                sections: data.data?.sections || data.sections
            }
        };
    }

    // Bypass local proxy and use direct ophim1.com URL so browser VPNs can work
    async fetchWithFallback(endpoint, options = {}) {
        let cleanEndpoint = endpoint || '';
        if (cleanEndpoint.startsWith('http')) {
            return this.fetchWithTimeout(cleanEndpoint, options);
        }

        if (cleanEndpoint.startsWith('/v1/api')) {
            cleanEndpoint = cleanEndpoint.substring('/v1/api'.length);
        }
        if (!cleanEndpoint.startsWith('/')) {
            cleanEndpoint = '/' + cleanEndpoint;
        }

        const paramStr = cleanEndpoint.includes('?') ? cleanEndpoint.substring(cleanEndpoint.indexOf('?')) : '';
        const basePath = cleanEndpoint.includes('?') ? cleanEndpoint.substring(0, cleanEndpoint.indexOf('?')) : cleanEndpoint;

        // Redirect /danh-sach/phim-moi-cap-nhat to /home as per new Ophim API rules
        const redirectToHome = ['/danh-sach/phim-moi-cap-nhat'];
        const resolvedBase = redirectToHome.includes(basePath) ? '/home' : basePath;
        const resolvedParam = redirectToHome.includes(basePath) ? '' : paramStr;

        const targetUrl = `/v1/api${resolvedBase}${resolvedParam}`;
        
        // Return direct fetch so the user's VPN can handle it
        const response = await this.fetchWithTimeout(targetUrl, options);
        
        // Intercept json() to normalize Ophim API's boolean status to 'success' string
        // This globally fixes all components checking `data.status === 'success'`
        const originalJson = response.json.bind(response);
        response.json = async () => {
            const data = await originalJson();
            if (data && data.status === true) {
                data.status = 'success';
            }
            return data;
        };
        
        return response;
    }

    // Helper to filter out hidden movies from list responses
    filterHiddenMovies(data) {
        if (!data || !data.data || !Array.isArray(data.data.items)) return data;
        try {
            const hiddenMoviesList = JSON.parse(localStorage.getItem('cinestream_hidden_movies') || '[]');

            // HARDCODED BANNED MOVIES (DMCA, etc)
            const hardcodedBanned = ['moi-thu-la-loi-co-ay', 'michael', 'dac-vu-xuyen-quoc-gia'];
            const allBanned = [...hiddenMoviesList, ...hardcodedBanned];

            if (allBanned.length > 0) {
                data.data.items = data.data.items.filter(movie => !allBanned.includes(movie.slug));
            }
        } catch (e) {
            console.warn('Error filtering hidden movies:', e);
        }
        return data;
    }

    // Get auth token
    getAuthToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    // Fetch with auth header
    async fetchWithAuth(url, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await this.fetchWithTimeout(url, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            window.location.href = '/';
            throw new Error('Phiên đăng nhập đã hết hạn');
        }

        return response;
    }

    // Fetch movie list - dùng /home vì /danh-sach/phim-moi-cap-nhat không còn tồn tại (404)
    async getMovieList(page = 1) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?page=${page}&limit=20`);
                const data = await response.json();
                return this.filterHiddenMovies(data);
            } else {
                const response = await this.fetchWithFallback(`/home`, {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(data);
            }
        } catch (error) {
            console.error('Error fetching movie list:', error);
            return null;
        }
    }

    // Fetch movie detail by slug
    async getMovieDetail(slug) {
        // --- BLOCK DMCA REPORTED SLUGS ---
        if (slug === 'moi-thu-la-loi-co-ay' || slug === 'michael' || slug === 'dac-vu-xuyen-quoc-gia') {
            window.location.href = '/index.html';
            return null;
        }

        // --- AUTO BLOCK HIDDEN SLUGS ---
        try {
            const hiddenMoviesList = JSON.parse(localStorage.getItem('cinestream_hidden_movies') || '[]');
            if (hiddenMoviesList.includes(slug)) {
                window.location.href = '/index.html';
                return null;
            }
        } catch (e) {}

        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/${slug}`);
                const data = await response.json();
                return data;
            } else {
                const response = await this.fetchWithFallback(`/phim/${slug}`, {
                    headers: { 'accept': 'application/json' }
                });
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching movie detail:', error);
            return null;
        }
    }

    // Search movies
    async searchMovies(keyword, page = 1) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/search?q=${encodeURIComponent(keyword)}&page=${page}`);
                const data = await response.json();
                if (data.success || (data && (data.status === 'success' || data.status === true || data.status))) {
                    return this.filterHiddenMovies(data);
                }
                return null;
            } else {
                const response = await this.fetchWithFallback(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`, {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(data);
            }
        } catch (error) {
            console.error('Error searching movies:', error);
            return null;
        }
    }

    // Get movies by category
    async getMoviesByCategory(categorySlug, page = 1) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?category=${categorySlug}&page=${page}`);
                const data = await response.json();
                if (data.success) {
                    return this.filterHiddenMovies({
                        status: 'success',
                        data: data.data
                    });
                }
                return null;
            } else {
                const response = await this.fetchWithFallback(`/the-loai/${categorySlug}?page=${page}`, {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(data);
            }
        } catch (error) {
            console.error('Error fetching category movies:', error);
            return null;
        }
    }

    // Get movies by country
    async getMoviesByCountry(countrySlug, page = 1) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?country=${countrySlug}&page=${page}`);
                const data = await response.json();
                if (data.success) {
                    return this.filterHiddenMovies({
                        status: 'success',
                        data: data.data
                    });
                }
                return null;
            } else {
                const response = await this.fetchWithFallback(`/quoc-gia/${countrySlug}?page=${page}`, {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(data);
            }
        } catch (error) {
            console.error('Error fetching country movies:', error);
            return null;
        }
    }

    // Get stream URL (requires authentication if using backend)
    async getStreamURL(slug, episodeSlug) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/${slug}/stream/${episodeSlug}`);
                const data = await response.json();
                if (data.success) {
                    return data.data.streamURL;
                }
                throw new Error(data.message || 'Không thể lấy link phim');
            } else {
                const movieData = await this.getMovieDetail(slug);
                if (movieData && movieData.data && movieData.data.item) {
                    const episodes = movieData.data.item.episodes;
                    for (const server of episodes) {
                        const episode = server.server_data?.find(ep => ep.slug === episodeSlug);
                        if (episode) {
                            return episode.link_m3u8;
                        }
                    }
                }
                throw new Error('Không tìm thấy link phim');
            }
        } catch (error) {
            console.error('Error getting stream URL:', error);
            throw error;
        }
    }

    // Get Home Page Data
    async getHome() {
        try {
            const response = await this.fetchWithFallback('/home', {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();
            return this.filterHiddenMovies(data);
        } catch (error) {
            console.error('Error fetching home data:', error);
            return null;
        }
    }

    // Get movies from multiple sources / category (simple version)
    async getMoviesFromMultipleSources(page = 1, categoryOrList = 'phim-bo') {
        try {
            let endpoint = `/danh-sach/${categoryOrList}?page=${page}`;
            if (categoryOrList.startsWith('the-loai/') || categoryOrList.startsWith('quoc-gia/')) {
                endpoint = `/${categoryOrList}?page=${page}`;
            } else if (!categoryOrList.includes('/')) {
                const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                if (mainCategories.includes(categoryOrList)) {
                    endpoint = `/the-loai/${categoryOrList}?page=${page}`;
                } else {
                    endpoint = `/danh-sach/${categoryOrList}?page=${page}`;
                }
            }
            const res = await this.fetchWithFallback(endpoint);
            const rawData = await res.json();
            return this.normalizeResponse(rawData);
        } catch (err) {
            console.warn('Error in getMoviesFromMultipleSources:', err);
            return null;
        }
    }

    // Fetch from Ophim17 (secondary source) - also uses /home now
    async getMovieListFromOphim17(page = 1) {
        try {
            const response = await this.fetchWithTimeout(`${this.ophim17URL}/v1/api/home`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching from Ophim17:', error);
            return null;
        }
    }

    async getMoviesByCategoryFromOphim17(categorySlug, page = 1) {
        try {
            const response = await this.fetchWithTimeout(`${this.ophim17URL}/v1/api/the-loai/${categorySlug}?page=${page}`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching category from Ophim17:', error);
            return null;
        }
    }

    // Get all categories
    async getCategories() {
        try {
            const response = await this.fetchWithFallback(`/the-loai`, {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();

            if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
                if (data.data.items && Array.isArray(data.data.items)) {
                    return data.data.items;
                }
                let categories = [];
                if (Array.isArray(data.data)) {
                    categories = data.data;
                } else if (typeof data.data === 'object') {
                    categories = Object.entries(data.data).map(([key, value]) => {
                        if (typeof value === 'object' && value.slug && value.name) {
                            return value;
                        } else if (typeof value === 'string') {
                            return { slug: key, name: value };
                        } else if (typeof value === 'object' && value.name) {
                            return { slug: key, name: value.name };
                        }
                        return { slug: key, name: key };
                    });
                }
                return categories;
            }
            return [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Get list of countries (static list)
    async getCountries() {
        return [
            { slug: 'viet-nam', name: 'Việt Nam' },
            { slug: 'trung-quoc', name: 'Trung Quốc' },
            { slug: 'han-quoc', name: 'Hàn Quốc' },
            { slug: 'nhat-ban', name: 'Nhật Bản' },
            { slug: 'thai-lan', name: 'Thái Lan' },
            { slug: 'au-my', name: 'Âu Mỹ' },
            { slug: 'dai-loan', name: 'Đài Loan' },
            { slug: 'hong-kong', name: 'Hồng Kông' },
            { slug: 'an-do', name: 'Ấn Độ' },
            { slug: 'anh', name: 'Anh' },
            { slug: 'phap', name: 'Pháp' },
            { slug: 'canada', name: 'Canada' },
            { slug: 'duc', name: 'Đức' },
            { slug: 'tay-ban-nha', name: 'Tây Ban Nha' },
            { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ' },
            { slug: 'ha-lan', name: 'Hà Lan' },
            { slug: 'indonesia', name: 'Indonesia' },
            { slug: 'nga', name: 'Nga' },
            { slug: 'mexico', name: 'Mexico' },
            { slug: 'ba-lan', name: 'Ba Lan' },
            { slug: 'uc', name: 'Úc' },
            { slug: 'thuy-dien', name: 'Thụy Điển' },
            { slug: 'malaysia', name: 'Malaysia' },
            { slug: 'brazil', name: 'Brazil' },
            { slug: 'philippines', name: 'Philippines' },
            { slug: 'bo-dao-nha', name: 'Bồ Đào Nha' },
            { slug: 'y', name: 'Ý' },
            { slug: 'dan-mach', name: 'Đan Mạch' },
            { slug: 'uae', name: 'UAE' },
            { slug: 'na-uy', name: 'Na Uy' },
            { slug: 'thuy-si', name: 'Thụy Sĩ' },
            { slug: 'chau-phi', name: 'Châu Phi' },
            { slug: 'nam-phi', name: 'Nam Phi' },
            { slug: 'ukraina', name: 'Ukraina' },
            { slug: 'a-rap-xe-ut', name: 'Ả Rập Xê Út' }
        ];
    }

    // Get movie gallery images
    async getMovieImages(slug) {
        try {
            const detail = await this.getMovieDetail(slug);
            const item = detail?.data?.item || detail?.movie;
            if (item && item.images && Array.isArray(item.images)) {
                return { status: 'success', images: item.images };
            }
            return { status: 'success', images: [] };
        } catch (err) {
            return { status: false, images: [] };
        }
    }

    // Get Movie Images (TMDB Posters / Backdrops)
    async getMovieImagesFromAPI(slug) {
        try {
            const response = await this.fetchWithFallback(`/phim/${slug}/images`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error(`Error fetching images for ${slug}:`, error);
            return null;
        }
    }

    // Get Movie Peoples (TMDB Cast & Directors)
    async getMoviePeoples(slug) {
        try {
            const response = await this.fetchWithFallback(`/phim/${slug}/peoples`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error(`Error fetching peoples for ${slug}:`, error);
            return null;
        }
    }

    // Get Movie Keywords (TMDB Tags)
    async getMovieKeywords(slug) {
        try {
            const response = await this.fetchWithFallback(`/phim/${slug}/keywords`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error(`Error fetching keywords for ${slug}:`, error);
            return null;
        }
    }

    // Get List of Release Years
    async getYears() {
        try {
            const response = await this.fetchWithFallback('/nam-phat-hanh', {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching release years:', error);
            return null;
        }
    }

    // Get Movies by Release Year
    async getMoviesByYear(year, page = 1) {
        try {
            const response = await this.fetchWithFallback(`/nam-phat-hanh/${year}?page=${page}`, {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();
            return this.filterHiddenMovies(data);
        } catch (error) {
            console.error(`Error fetching movies for year ${year}:`, error);
            return null;
        }
    }

    // Get image URL
    getImageURL(imagePath, width = 400, quality = 80, isPriority = false) {
        if (!imagePath) return '/apple-touch-icon.png';

        let fullUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            const filename = imagePath.replace(/^uploads\/movies\//, '');
            fullUrl = `${API_CONFIG.IMAGE_BASE || 'https://img.ophim.live/uploads/movies/'}${filename}`;
        }

        // Use imageOptimizer for advanced compression and caching
        if (typeof imageOptimizer !== 'undefined' && typeof imageOptimizer.optimizeImageUrl === 'function') {
            return imageOptimizer.optimizeImageUrl(fullUrl, width, quality, isPriority);
        }
        
        return fullUrl;
    }

    // --- SEO Utilities ---
    injectCanonical() {
        try {
            const url = new URL(window.location.href);
            const paramsToRemove = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            paramsToRemove.forEach(param => url.searchParams.delete(param));

            if (url.searchParams.get('page') === '1') {
                url.searchParams.delete('page');
            }

            if (url.pathname.includes('watch.html')) {
                const slug = url.searchParams.get('slug');
                if (slug) {
                    url.pathname = url.pathname.replace('watch.html', 'movie-detail.html');
                    url.search = `?slug=${slug}`;
                }
            }

            const canonicalUrl = url.toString().split('#')[0];

            let link = document.querySelector("link[rel='canonical']");
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'canonical');
                document.head.appendChild(link);
            }
            link.setAttribute('href', canonicalUrl);
            console.log('✅ SEO: Canonical tag injected ->', canonicalUrl);
        } catch (e) {
            console.error('Error injecting canonical tag:', e);
        }
    }

    // Dynamic Meta Tags Updater
    updateSEOMeta(title, description, image) {
        if (title) {
            document.title = title;
            let ogTitle = document.querySelector("meta[property='og:title']");
            if (ogTitle) ogTitle.setAttribute('content', title);
        }
        if (description) {
            const cleanDesc = description.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "...";
            let metaDesc = document.querySelector("meta[name='description']");
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', cleanDesc);

            let ogDesc = document.querySelector("meta[property='og:description']");
            if (ogDesc) ogDesc.setAttribute('content', cleanDesc);
        }
        if (image) {
            let ogImage = document.querySelector("meta[property='og:image']");
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.setAttribute('content', image);
        }
    }
}

// Initialize API
const movieAPI = new MovieAPI();
if (typeof window !== 'undefined') {
    window.movieAPI = movieAPI;
    window.MovieAPI = MovieAPI;
}

// 🚀 Auto-inject Canonical Tag on every page load
document.addEventListener('DOMContentLoaded', () => {
    movieAPI.injectCanonical();
});
