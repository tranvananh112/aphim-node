// API Service for ophim17.cc and Backend
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

    // Wrapper to fetch from primary URL or fallback mirrors on failure (bypasses ISP blocks on 4G)
    async fetchWithFallback(endpoint, options = {}) {
        const bases = [
            'https://apii.online/v1/api',
            this.ophimURL,
            'https://ophim17.cc/v1/api',
            'https://ophim10.cc/v1/api',
            'https://ophim1.com/v1/api'
        ];
        
        const uniqueBases = Array.from(new Set(bases.filter(Boolean)));
        let lastError = null;

        for (const base of uniqueBases) {
            const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
            try {
                const response = await this.fetchWithTimeout(url, options);
                if (response.ok) {
                    return response;
                }
                console.warn(`⚠️ API response not OK from ${base}: ${response.status}`);
            } catch (err) {
                console.warn(`❌ API fetch failed from ${base}:`, err.message);
                lastError = err;
            }
            if (endpoint.startsWith('http')) {
                break;
            }
        }
        throw lastError || new Error('All API mirrors failed');
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
            window.location.href = '/login';
            throw new Error('Phiên đăng nhập đã hết hạn');
        }

        return response;
    }

    // Fetch movie list with pagination
    async getMovieList(page = 1) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?page=${page}&limit=20`);
                const data = await response.json();

                console.log('Backend response:', data);

                // Always return data if we got a response
                return this.filterHiddenMovies(data);
            } else {
                const response = await this.fetchWithFallback(`/danh-sach/phim-moi-cap-nhat?page=${page}`, {
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
            window.location.href = '/index.html'; // Chuyển hướng về trang chủ
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

                console.log('Backend movie detail response:', data);

                // Always return data if we got a response
                // The backend should handle the format
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

                console.log('Backend search response:', data);

                // Check both success and status fields
                if (data.success || data.status === 'success') {
                    return this.filterHiddenMovies(data); // Return the whole response
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

                // Backend now returns Ophim-compatible format
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

                // Backend now returns Ophim-compatible format
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
                // Direct Ophim - get from movie detail
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

    // Get image URL
    getImageURL(imagePath, width = 400, quality = 80, isPriority = false) {
        if (!imagePath) return '/apple-touch-icon.png';

        let fullUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            fullUrl = `${API_CONFIG.IMAGE_BASE}${imagePath}`;
        }

        // Use global imageOptimizer if available to compress image
        if (typeof imageOptimizer !== 'undefined' && typeof imageOptimizer.optimizeImageUrl === 'function') {
            return imageOptimizer.optimizeImageUrl(fullUrl, width, quality, isPriority);
        }

        return fullUrl;
    }

    // Get list of categories
    async getCategories() {
        try {
            const response = await this.fetchWithFallback(`/the-loai`, {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();

            console.log('Categories API response:', data);

            if (data.status === 'success' && data.data) {
                // Check if data.data.items exists (new format)
                if (data.data.items && Array.isArray(data.data.items)) {
                    console.log('Categories array from items:', data.data.items);
                    return data.data.items;
                }

                // Fallback to old format
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

                console.log('Categories converted to array:', categories);
                return categories;
            }
            return [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Get list of countries
    async getCountries() {
        // API /quoc-gia không trả về danh sách, dùng danh sách cố định
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

    // Fetch from Ophim17 (secondary source)
    async getMovieListFromOphim17(page = 1) {
        try {
            const response = await this.fetchWithTimeout(`${this.ophim17URL}/danh-sach/phim-moi-cap-nhat?page=${page}`, {
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

    // Combine movies from multiple sources
    async getMoviesFromMultipleSources(page = 1, categorySlug = null) {
        if (!this.useMultipleSources) {
            // Use single source
            if (categorySlug) {
                return await this.getMoviesByCategory(categorySlug, page);
            }
            return await this.getMovieList(page);
        }

        try {
            // Fetch from both sources in parallel
            const promises = [];

            if (categorySlug) {
                promises.push(this.getMoviesByCategory(categorySlug, page));
                promises.push(this.getMoviesByCategoryFromOphim17(categorySlug, page));
            } else {
                promises.push(this.getMovieList(page));
                promises.push(this.getMovieListFromOphim17(page));
            }

            const results = await Promise.allSettled(promises);

            // Combine results
            let allMovies = [];
            let combinedData = {
                status: 'success',
                data: {
                    items: [],
                    params: null
                }
            };

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const data = result.value;
                    if (data.status === 'success' && data.data && data.data.items) {
                        allMovies = allMovies.concat(data.data.items);

                        // Use params from first source
                        if (!combinedData.data.params && data.data.params) {
                            combinedData.data.params = data.data.params;
                        }
                    }
                }
            });

            // Remove duplicates based on slug
            const uniqueMovies = [];
            const seenSlugs = new Set();

            allMovies.forEach(movie => {
                if (!seenSlugs.has(movie.slug)) {
                    seenSlugs.add(movie.slug);
                    uniqueMovies.push(movie);
                }
            });

            combinedData.data.items = uniqueMovies;

            console.log(`Combined ${uniqueMovies.length} unique movies from ${results.length} sources`);

            return combinedData;
        } catch (error) {
            console.error('Error combining multiple sources:', error);
            // Fallback to single source
            if (categorySlug) {
                return await this.getMoviesByCategory(categorySlug, page);
            }
            return await this.getMovieList(page);
        }
    }
    // --- SEO Utilities ---
    // Inject Canonical Tag to fix Google Search Console Duplicate Errors
    // Inject Canonical Tag to fix Google Search Console Duplicate Errors
    injectCanonical() {
        try {
            const url = new URL(window.location.href);
            // Remove common tracking parameters that cause duplicate content issues
            const paramsToRemove = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            paramsToRemove.forEach(param => url.searchParams.delete(param));
            
            // Treat page=1 as identical to base URL
            if (url.searchParams.get('page') === '1') {
                url.searchParams.delete('page');
            }
            
            // SEO FIX: If on watch.html, point canonical back to movie-detail.html
            if (url.pathname.includes('watch.html')) {
                const slug = url.searchParams.get('slug');
                if (slug) {
                    url.pathname = url.pathname.replace('watch.html', 'movie-detail.html');
                    url.search = `?slug=${slug}`; // Strip episode parameter to point to parent movie
                }
            }
            
            const canonicalUrl = url.toString().split('#')[0]; // Remove hash fragment

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
            // Trim description for SEO (optimal is ~150-160 chars)
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

// 🚀 Auto-inject Canonical Tag on every page load
document.addEventListener('DOMContentLoaded', () => {
    movieAPI.injectCanonical();
});



