const axios = require('axios');
const Movie = require('../models/Movie');

// Create axios instance with SSL bypass for development
const axiosInstance = axios.create({
    httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
    }),
    timeout: 10000
});

class OphimService {
    constructor() {
        // Use HTTP instead of HTTPS to avoid SSL issues
        this.baseURL = process.env.OPHIM_API_URL || 'https://ophim1.com';
        this.cdnImage = process.env.OPHIM_CDN_IMAGE || 'https://img.ophim.live';
    }

    // Fetch movie list from Ophim API
    async fetchMovieList(page = 1) {
        try {
            const response = await axiosInstance.get(`${this.baseURL}/danh-sach/phim-moi-cap-nhat`, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching movie list:', error.message);
            throw new Error('Không thể lấy danh sách phim từ Ophim');
        }
    }

    // Fetch movie detail from Ophim API
    async fetchMovieDetail(slug) {
        try {
            const response = await axiosInstance.get(`${this.baseURL}/phim/${slug}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching movie detail:', error.message);
            throw new Error('Không thể lấy thông tin phim từ Ophim');
        }
    }

    // Search movies from Ophim API
    async searchMovies(keyword, page = 1) {
        try {
            const response = await axiosInstance.get(`${this.baseURL}/tim-kiem`, {
                params: { keyword, page }
            });
            return response.data;
        } catch (error) {
            console.error('Error searching movies:', error.message);
            throw new Error('Không thể tìm kiếm phim');
        }
    }

    // Get movies by category
    async getMoviesByCategory(categorySlug, page = 1) {
        try {
            const response = await axios.get(`${this.baseURL}/the-loai/${categorySlug}`, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching category movies:', error.message);
            throw new Error('Không thể lấy phim theo thể loại');
        }
    }

    // Get movies by country
    async getMoviesByCountry(countrySlug, page = 1) {
        try {
            const response = await axios.get(`${this.baseURL}/quoc-gia/${countrySlug}`, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching country movies:', error.message);
            throw new Error('Không thể lấy phim theo quốc gia');
        }
    }

    // Sync movie from Ophim to local database
    async syncMovieToDatabase(slug) {
        try {
            const ophimData = await this.fetchMovieDetail(slug);

            if (!ophimData || ophimData.status !== 'success') {
                throw new Error('Dữ liệu phim không hợp lệ');
            }

            const movieData = ophimData.data.item;

            // Transform Ophim data to our schema
            const movieDoc = {
                ophimId: movieData._id,
                slug: movieData.slug,
                name: movieData.name,
                originName: movieData.origin_name,
                content: movieData.content,
                type: movieData.type,
                status: movieData.status,
                thumbUrl: movieData.thumb_url,
                posterUrl: movieData.poster_url,
                trailerUrl: movieData.trailer_url,
                time: movieData.time,
                episodeCurrent: movieData.episode_current,
                episodeTotal: movieData.episode_total,
                quality: movieData.quality,
                lang: movieData.lang,
                year: movieData.year,
                view: movieData.view || 0,
                category: movieData.category || [],
                country: movieData.country || [],
                actor: movieData.actor || [],
                director: movieData.director || [],
                episodes: movieData.episodes?.map(ep => ({
                    serverName: ep.server_name,
                    serverData: ep.server_data?.map(sd => ({
                        name: sd.name,
                        slug: sd.slug,
                        filename: sd.filename,
                        linkEmbed: sd.link_embed,
                        linkM3u8: sd.link_m3u8
                    }))
                })) || [],
                ratings: {
                    tmdb: {
                        voteAverage: movieData.tmdb?.vote_average,
                        voteCount: movieData.tmdb?.vote_count
                    },
                    imdb: {
                        voteAverage: movieData.imdb?.vote_average,
                        voteCount: movieData.imdb?.vote_count
                    }
                },
                seo: {
                    title: ophimData.data.seoOnPage?.titleHead,
                    description: ophimData.data.seoOnPage?.descriptionHead,
                    keywords: []
                },
                lastSyncedAt: new Date(),
                syncSource: 'ophim',
                isPublished: true,
                publishedAt: new Date()
            };

            // Upsert movie (update if exists, insert if not)
            const movie = await Movie.findOneAndUpdate(
                { slug: movieDoc.slug },
                movieDoc,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return movie;
        } catch (error) {
            console.error('Error syncing movie:', error.message);
            throw error;
        }
    }

    // Sync multiple movies (batch sync)
    async syncMoviesFromPage(page = 1) {
        try {
            const data = await this.fetchMovieList(page);

            if (!data || data.status !== 'success' || !data.data?.items) {
                throw new Error('Không có dữ liệu phim');
            }

            const movies = data.data.items;
            const syncedMovies = [];

            for (const movie of movies) {
                try {
                    const syncedMovie = await this.syncMovieToDatabase(movie.slug);
                    syncedMovies.push(syncedMovie);
                    console.log(`✅ Synced: ${movie.name}`);
                } catch (error) {
                    console.error(`❌ Failed to sync ${movie.slug}:`, error.message);
                }
            }

            return {
                total: movies.length,
                synced: syncedMovies.length,
                movies: syncedMovies
            };
        } catch (error) {
            console.error('Error syncing movies from page:', error.message);
            throw error;
        }
    }

    // Get image URL
    getImageURL(imagePath) {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${this.cdnImage}/uploads/movies/${imagePath}`;
    }

    // Get stream URL (already provided by API)
    getStreamURL(linkM3u8) {
        return linkM3u8;
    }
}

module.exports = new OphimService();
