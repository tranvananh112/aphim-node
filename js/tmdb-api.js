// TMDB API Integration for Actor Images
// API Documentation: https://developers.themoviedb.org/3

const TMDB_API_KEY = '5fb3c8d9ad2ca4cd2029836befcc3ab5'; // TMDB API Key (v3)
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

// Wrapper to bypass VN ISP blocking via multiple fallback proxies
async function fetchWithProxy(targetUrl) {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];
    
    for (const proxy of proxies) {
        try {
            const response = await fetch(proxy);
            if (response.ok) return response;
        } catch (err) {
            // fail silently, try next proxy
        }
    }
    throw new Error('All CORS proxies failed');
}

// Load actor images from TMDB based on movie data
async function loadActorImagesFromTMDB(movie) {
    if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        console.warn('⚠️ TMDB API key not configured');
        return false;
    }

    // Check cache first
    const cacheKey = `tmdb_actors_${movie.slug}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        console.log('✅ Using cached actor images');
        const cachedData = JSON.parse(cached);
        updateActorAvatars(movie.actor, cachedData);
        return true;
    }

    try {
        console.log('🎬 Loading actor images for:', movie.name);

        // NEW: Try exact TMDB ID matching first if provided by Ophim API
        if (movie.tmdb && movie.tmdb.id && String(movie.tmdb.id).trim() !== '') {
            try {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const tmdbId = movie.tmdb.id;
                
                console.log(`🎯 Using exact TMDB ID provided by Ophim: ${tmdbId} (${tmdbType})`);
                const creditsUrl = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
                const creditsResponse = await fetchWithProxy(creditsUrl);
                
                if (creditsResponse.ok) {
                    const creditsData = await creditsResponse.json();
                    if (creditsData.cast && creditsData.cast.length > 0) {
                        console.log('✅ Found', creditsData.cast.length, 'cast members via exact TMDB ID');
                        sessionStorage.setItem(cacheKey, JSON.stringify(creditsData.cast));
                        updateActorAvatars(movie.actor, creditsData.cast);
                        return true;
                    }
                }
            } catch (err) {
                console.warn('⚠️ Exact TMDB ID fetch failed, falling back to search strategy...');
            }
        }

        // Try multiple search strategies (Fallback if TMDB ID is missing)
        const searchStrategies = [
            { query: movie.origin_name, year: movie.year, label: 'origin name + year' },
            { query: movie.name, year: movie.year, label: 'VN name + year' },
            { query: movie.origin_name, year: null, label: 'origin name only' },
            { query: movie.name, year: null, label: 'VN name only' }
        ];

        for (const strategy of searchStrategies) {
            if (!strategy.query) continue;

            const searchQuery = encodeURIComponent(strategy.query);
            const yearParam = strategy.year ? `&year=${strategy.year}` : '';
            const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}`;

            // console.log(`🔍 Trying: ${strategy.label}`); // suppress logging

            try {
                const searchResponse = await fetchWithProxy(searchUrl);
                if (!searchResponse || !searchResponse.ok) continue;

                const searchData = await searchResponse.json();

                if (searchData.results && searchData.results.length > 0) {
                    const tmdbMovie = searchData.results[0];
                    console.log('✅ Found movie:', tmdbMovie.title, '(ID:', tmdbMovie.id, ')');

                    // Get movie credits
                    const creditsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}/credits?api_key=${TMDB_API_KEY}`;
                    const creditsResponse = await fetchWithProxy(creditsUrl);
                    const creditsData = await creditsResponse.json();

                    if (creditsData.cast && creditsData.cast.length > 0) {
                        console.log('✅ Found', creditsData.cast.length, 'cast members');
                        // Cache the result
                        sessionStorage.setItem(cacheKey, JSON.stringify(creditsData.cast));
                        updateActorAvatars(movie.actor, creditsData.cast);
                        return true;
                    }
                }
            } catch (err) {
                // suppress strategy fail log to keep console clean
                continue;
            }
        }

        // If all movie search strategies fail, skip direct actor search (too slow)
        // console.log('❌ Movie not found in TMDB');
        return false;

    } catch (error) {
        // console.error('❌ Error:', error); // suppress error
        return false;
    }
}

// Try searching for actors directly by name
async function trySearchActorsDirectly(movie) {
    if (!movie.actor || movie.actor.length === 0) {
        console.log('⚠️ No actors to search for');
        return false;
    }

    console.log('🔍 Searching for actors directly...');
    const actorElements = document.querySelectorAll('[data-actor-name]');
    let foundCount = 0;

    // Search for each actor individually
    for (let i = 0; i < Math.min(movie.actor.length, 10); i++) {
        const actorName = movie.actor[i];
        const actorElement = actorElements[i];

        if (!actorElement) continue;

        try {
            const searchQuery = encodeURIComponent(actorName);
            const searchUrl = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${searchQuery}`;

            // console.log(`🔍 Searching for actor: ${actorName}`); // Suppress log

            const response = await fetchWithProxy(searchUrl);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const actor = data.results[0];

                if (actor.profile_path) {
                    const imageUrl = TMDB_IMAGE_BASE + actor.profile_path;
                    console.log(`✅ Found image for ${actorName}:`, imageUrl);

                    const avatarContainer = actorElement.querySelector('.actor-avatar-container');
                    if (avatarContainer) {
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = actorName;
                        img.className = 'w-full h-full object-cover';

                        img.onload = () => {
                            avatarContainer.innerHTML = '';
                            avatarContainer.appendChild(img);

                            const gradientClasses = [
                                'bg-gradient-to-br', 'from-red-500', 'to-red-700',
                                'from-blue-500', 'to-blue-700', 'from-green-500', 'to-green-700',
                                'from-yellow-500', 'to-yellow-700', 'from-purple-500', 'to-purple-700',
                                'from-pink-500', 'to-pink-700', 'from-indigo-500', 'to-indigo-700',
                                'from-teal-500', 'to-teal-700'
                            ];
                            avatarContainer.classList.remove(...gradientClasses);
                            console.log('🖼️ Image loaded successfully for:', actorName);
                        };

                        img.onerror = () => {
                            console.log('❌ Failed to load image for:', actorName);
                        };

                        foundCount++;
                    }
                } else {
                    console.log(`⚠️ No image for ${actorName}`);
                }
            } else {
                console.log(`❌ Actor not found: ${actorName}`);
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
            console.error(`❌ Error searching for ${actorName}:`, error);
        }
    }

    console.log(`✅ Found images for ${foundCount}/${movie.actor.length} actors`);
    return foundCount > 0;
}

// Update actor avatars with TMDB images
function updateActorAvatars(localActors, tmdbCast) {
    if (!localActors || localActors.length === 0) {
        console.log('⚠️ No local actors to update');
        return;
    }

    const actorElements = document.querySelectorAll('[data-actor-name]');
    console.log('🎭 Found', actorElements.length, 'actor elements to update');

    actorElements.forEach((element, index) => {
        const actorName = element.getAttribute('data-actor-name');
        const avatarContainer = element.querySelector('.actor-avatar-container');

        if (!avatarContainer) {
            console.log('⚠️ No avatar container for:', actorName);
            return;
        }

        // Try to find matching actor in TMDB data
        let tmdbActor = null;

        // Method 1: Try exact match or partial match by name
        tmdbActor = tmdbCast.find(cast => {
            const tmdbName = cast.name.toLowerCase();
            const localName = actorName.toLowerCase();

            // Remove Vietnamese accents for better matching
            const normalizedTmdb = removeVietnameseAccents(tmdbName);
            const normalizedLocal = removeVietnameseAccents(localName);

            return normalizedTmdb === normalizedLocal ||
                normalizedTmdb.includes(normalizedLocal) ||
                normalizedLocal.includes(normalizedTmdb);
        });

        // Only use the actor if we found a match by name.
        // DO NOT fallback to index, as TMDB cast order rarely matches Ophim API, 
        // and if it's the wrong movie, it assigns completely wrong faces!

        // Update avatar if actor found and has profile image
        if (tmdbActor && tmdbActor.profile_path) {
            const imageUrl = TMDB_IMAGE_BASE + tmdbActor.profile_path;
            console.log('✅ Loading image for', actorName, '→', tmdbActor.name, ':', imageUrl);

            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = actorName;
            img.className = 'w-full h-full object-cover';

            img.onload = () => {
                // Replace placeholder with real image
                avatarContainer.innerHTML = '';
                avatarContainer.appendChild(img);

                // Remove gradient background classes
                const gradientClasses = [
                    'bg-gradient-to-br', 'from-red-500', 'to-red-700',
                    'from-blue-500', 'to-blue-700', 'from-green-500', 'to-green-700',
                    'from-yellow-500', 'to-yellow-700', 'from-purple-500', 'to-purple-700',
                    'from-pink-500', 'to-pink-700', 'from-indigo-500', 'to-indigo-700',
                    'from-teal-500', 'to-teal-700'
                ];
                avatarContainer.classList.remove(...gradientClasses);

                console.log('🖼️ Image loaded successfully for:', actorName);
            };

            img.onerror = () => {
                console.log('❌ Failed to load image for:', actorName);
            };
        } else {
            console.log('⚠️ No image found for:', actorName);
        }
    });
}

// Helper function to remove Vietnamese accents for better name matching
function removeVietnameseAccents(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// --- NEW: HERO BANNER IMAGE FETCHING ---
async function getHeroImagesFromTMDB(movie) {
    if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') return null;
    if (!movie) return null;

    const cacheKey = `tmdb_hero_${movie.slug}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    try {
        let tmdbMovie = null;

        // Ưu tiên tải ảnh từ PhimAPI images endpoint vì rất nhanh và chính xác
        try {
            const imagesUrl = `https://phimapi.com/v1/api/phim/${movie.slug}/images`;
            const response = await fetch(imagesUrl);
            if (response.ok) {
                const json = await response.json();
                if (json.success && json.data && json.data.images && json.data.images.length > 0) {
                    const backdropImg = json.data.images.find(img => img.type === 'backdrop' || img.aspect_ratio > 1);
                    const posterImg = json.data.images.find(img => img.type === 'poster' || img.aspect_ratio < 1);
                    if (backdropImg || posterImg) {
                        const result = {
                            backdrop: backdropImg ? `https://image.tmdb.org/t/p/original${backdropImg.file_path}` : null,
                            poster: posterImg ? `https://image.tmdb.org/t/p/w780${posterImg.file_path}` : null
                        };
                        sessionStorage.setItem(cacheKey, JSON.stringify(result));
                        return result;
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load images from PhimAPI, trying TMDB API...', err);
        }

        // 1. Exact ID match (if Ophim provides tmdb.id)
        if (movie.tmdb && movie.tmdb.id && String(movie.tmdb.id).trim() !== '') {
            try {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const tmdbId = movie.tmdb.id;
                const detailUrl = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=vi-VN`;
                const response = await fetchWithProxy(detailUrl);
                if (response.ok) {
                    tmdbMovie = await response.json();
                }
            } catch (err) {}
        }

        // 2. Fallback to Search
        if (!tmdbMovie) {
            const searchStrategies = [
                { query: movie.origin_name, year: movie.year },
                { query: movie.name, year: movie.year },
                { query: movie.origin_name, year: null },
                { query: movie.name, year: null }
            ];

            for (const strategy of searchStrategies) {
                if (!strategy.query) continue;
                const query = encodeURIComponent(strategy.query);
                const yearParam = strategy.year ? `&year=${strategy.year}` : '';
                const searchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${query}${yearParam}&language=vi-VN`;

                try {
                    const res = await fetchWithProxy(searchUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            tmdbMovie = data.results[0];
                            break;
                        }
                    }
                } catch (err) { continue; }
            }
        }

        if (tmdbMovie && (tmdbMovie.backdrop_path || tmdbMovie.poster_path)) {
            // Build original/high-res URLs
            const result = {
                backdrop: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : null,
                poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w780${tmdbMovie.poster_path}` : null
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
            return result;
        }
    } catch (e) {}
    
    // Cache null so we don't retry failed movies
    sessionStorage.setItem(cacheKey, JSON.stringify(null));
    return null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadActorImagesFromTMDB, getHeroImagesFromTMDB };
} else {
    window.getHeroImagesFromTMDB = getHeroImagesFromTMDB;
}

