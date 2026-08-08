// API Service for phimapi.com and Backend
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

    // Wrapper to fetch from primary OPhim URL or fallback OPhim mirrors (phimapi.com -> phimapi.com -> phimapi.com)
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

        let urlsToTry = [
            `/v1/api${basePath}${paramStr}`,
            `https://ophim1.com${basePath}${paramStr}`,
            `https://ophim1.com/v1/api${basePath}${paramStr}`,
            `https://ophim1.com/v1/api${basePath}${paramStr}`,
            `https://ophim1.com/v1/api${basePath}${paramStr}`
        ];

        if (basePath.includes('phim-moi-cap-nhat') || basePath === '/home') {
            urlsToTry.unshift(`/v1/api/danh-sach/phim-moi-cap-nhat${paramStr}`);
            urlsToTry.unshift(`https://ophim1.com/danh-sach/phim-moi-cap-nhat${paramStr}`);
            urlsToTry.unshift(`https://ophim1.com/danh-sach/phim-moi-cap-nhat${paramStr}`);
        }

        const uniqueUrls = Array.from(new Set(urlsToTry.filter(Boolean)));
        let lastError = null;

        for (const url of uniqueUrls) {
            try {
                const response = await this.fetchWithTimeout(url, options);
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response;
                    }
                }
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('All OPhim API mirrors failed');
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
            window.location.href = 'login.html';
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
                const ophimData = await response.json();
                
                // --- LẤY DỮ LIỆU TỪ NGUỒN PHỤ (SONG SONG ĐỂ TĂNG TỐC) ---
                try {
                    const fetchNguonC = this.fetchWithTimeout(`https://phim.nguonc.com/api/film/${slug}`, { timeout: 8000 })
                        .then(res => res.ok ? res.json() : Promise.reject('NguonC error'));
                        
                    const fetchVSMov = this.fetchWithTimeout(`https://vsmov.com/api/phim/${slug}`, { timeout: 8000 })
                        .then(res => res.ok ? res.json() : Promise.reject('VSMov error'));

                    const [ncResult, vsResult] = await Promise.allSettled([fetchNguonC, fetchVSMov]);

                    // Xử lý dữ liệu NguonC (Nguồn 2, Nguồn 3)
                    if (ncResult.status === 'fulfilled' && ncResult.value && ncResult.value.status === 'success' && ncResult.value.movie && ncResult.value.movie.episodes) {
                        const ncData = ncResult.value;
                        const mappedEps = ncData.movie.episodes.map(s => ({
                            server_name: s.server_name || 'Vietsub',
                            server_data: (s.items || []).map(it => ({
                                name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                                slug: it.slug || `tap-${it.name}`,
                                link_embed: it.embed || '',
                                link_m3u8: it.m3u8 || ''
                            }))
                        }));
                        mappedEps.forEach(ncServer => {
                            if (ophimData.data && ophimData.data.item) {
                                if (!ophimData.data.item.episodes) ophimData.data.item.episodes = [];
                                ophimData.data.item.episodes.push(ncServer);
                            } else if (ophimData.movie) {
                                if (!ophimData.episodes) ophimData.episodes = [];
                                ophimData.episodes.push(ncServer);
                            }
                        });
                    }

                    // Xử lý dữ liệu VSMov (Nguồn 4, Nguồn 5...)
                    if (vsResult.status === 'fulfilled' && vsResult.value && vsResult.value.status && vsResult.value.episodes && vsResult.value.episodes.length > 0) {
                        const vsData = vsResult.value;
                        if (ophimData.data && ophimData.data.item) {
                            if (!ophimData.data.item.episodes) ophimData.data.item.episodes = [];
                            ophimData.data.item.episodes.forEach(s => {
                                if (s.server_name) s.server_name = s.server_name.replace(/ #\d+/g, '').trim();
                            });
                            vsData.episodes.forEach(vsServer => {
                                if (vsServer.server_data && vsServer.server_data.length > 0) {
                                    if (vsServer.server_name) vsServer.server_name = vsServer.server_name.replace(/ #\d+/g, '').trim();
                                    ophimData.data.item.episodes.push(vsServer);
                                }
                            });
                        } else if (ophimData.movie) {
                            if (!ophimData.episodes) ophimData.episodes = [];
                            ophimData.episodes.forEach(s => {
                                if (s.server_name) s.server_name = s.server_name.replace(/ #\d+/g, '').trim();
                            });
                            vsData.episodes.forEach(vsServer => {
                                if (vsServer.server_data && vsServer.server_data.length > 0) {
                                    if (vsServer.server_name) vsServer.server_name = vsServer.server_name.replace(/ #\d+/g, '').trim();
                                    ophimData.episodes.push(vsServer);
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Lỗi gọi nguồn phụ song song:', e.message);
                }
                
                return ophimData;
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
                if (data.success || (data && (data.status === 'success' || data.status === true || data.status))) {
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
                let endpoint = '/danh-sach/' + categorySlug + '?page=' + page;
                if (categorySlug.startsWith('the-loai/') || categorySlug.startsWith('quoc-gia/')) {
                    const actualSlug = categorySlug.split('/')[1];
                    endpoint = '/' + categorySlug + '?page=' + page;
                } else if (!categorySlug.includes('/')) {
                    const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                    if (mainCategories.includes(categorySlug)) {
                        endpoint = '/the-loai/' + categorySlug + '?page=' + page;
                    } else {
                        endpoint = '/danh-sach/' + categorySlug + '?page=' + page;
                    }
                }
                
                const response = await this.fetchWithFallback(endpoint, {
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

    // Get home movies (alias to getMovieList)
    async getHome() {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/home`);
                const data = await response.json();
                return this.filterHiddenMovies(this.normalizeResponse(data));
            } else {
                const response = await this.fetchWithFallback('/home', {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(this.normalizeResponse(data));
            }
        } catch (e) {
            console.warn('Error in getHome:', e);
            return null;
        }
    }

    // Get movies from multiple sources / category
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

    // Get all categories
    async getCategories() {
        try {
            const res = await this.fetchWithFallback('/the-loai');
            const rawData = await res.json();
            return this.normalizeResponse(rawData);
        } catch (err) {
            console.warn('Error fetching categories:', err);
            return null;
        }
    }

    // Get all countries
    async getCountries() {
        try {
            const res = await this.fetchWithFallback('/quoc-gia');
            const rawData = await res.json();
            return this.normalizeResponse(rawData);
        } catch (err) {
            console.warn('Error fetching countries:', err);
            return null;
        }
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

    // Get image URL
      getImageURL(imagePath, width = 400, quality = 80, isPriority = false) {
        if (!imagePath) return '/apple-touch-icon.png';

        let fullUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            let filename = imagePath.replace(/^\//, "");
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            fullUrl = `${typeof API_CONFIG !== 'undefined' && API_CONFIG.IMAGE_BASE ? API_CONFIG.IMAGE_BASE : 'https://img.ophimimg.com/'}${filename}`;
        }

        // Use imageOptimizer for advanced compression and caching
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

            if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
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
            let endpoint = '/the-loai/' + categorySlug + '.json?slug=' + categorySlug;
            if (categorySlug.startsWith('the-loai/') || categorySlug.startsWith('quoc-gia/')) {
                const actualSlug = categorySlug.split('/')[1];
                endpoint = '/' + categorySlug + '.json?slug=' + actualSlug;
            } else if (!categorySlug.includes('/')) {
                const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                if (mainCategories.includes(categorySlug)) {
                    endpoint = '/the-loai/' + categorySlug + '.json?slug=' + categorySlug;
                } else {
                    endpoint = '/danh-sach/' + categorySlug + '.json?slug=' + categorySlug;
                }
            }
            
            const response = await this.fetchWithFallback('https://ophim17.cc/_next/data/9m2K2U6N0P-F6B_g0Y1M3' + endpoint, {
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
                    if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
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
    // Get Home Page Multi-Section Data
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

    // Get Movie Images (TMDB Posters / Backdrops)
    async getMovieImages(slug) {
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
if (typeof window !== 'undefined') {
    window.movieAPI = movieAPI;
    window.MovieAPI = MovieAPI;
}

// 🚀 Auto-inject Canonical Tag on every page load
document.addEventListener('DOMContentLoaded', () => {
    movieAPI.injectCanonical();
});




