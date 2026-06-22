/**
 * Dynamic Interests Section — Load thumbnails from API categories
 */
async function loadDynamicInterests() {
    const cards = document.querySelectorAll('.interest-card');
    let customBgs = {};
    const usedImages = new Set(); // Track used thumbnails to prevent duplicates

    try {
        const apiUrl = typeof window.getBackendBaseURL === 'function' ? window.getBackendBaseURL() : '';
        if (apiUrl) {
            const res = await fetch(`${apiUrl}/api/settings/public`);
            const data = await res.json();
            if (data.success && data.data?.content?.categoryBackgrounds) {
                customBgs = data.data.content.categoryBackgrounds;
            }
        }
    } catch (e) {
        console.warn('Could not load custom category backgrounds:', e);
    }
    
    const fetchPromises = Array.from(cards).map(async (card) => {
        const apiPath = card.getAttribute('data-api');
        const bgImg = card.querySelector('.interest-bg-img');
        
        if (!apiPath || !bgImg) return;

        const loadFromOphim = async () => {
            try {
                // Fetch first page to pick a unique movie
                const response = await fetch(`https://ophim1.com/v1/api/${apiPath}?page=1`, {
                    method: 'GET',
                    headers: { 'accept': 'application/json' }
                });

                const data = await response.json();
                
                if (data.status === 'success' && data.data && data.data.items && data.data.items.length > 0) {
                    // Find the first movie whose thumbnail hasn't been used yet
                    let selectedMovie = data.data.items[0];
                    for (const movie of data.data.items) {
                        if (movie.thumb_url && !usedImages.has(movie.thumb_url)) {
                            selectedMovie = movie;
                            break;
                        }
                    }

                    const thumbUrl = selectedMovie.thumb_url;
                    
                    if (thumbUrl) {
                        usedImages.add(thumbUrl); // Mark as used
                        const posterFullUrl = thumbUrl.startsWith('http') ? thumbUrl : `https://img.ophim.live/uploads/movies/${thumbUrl}`;
                        
                        // Optimize if possible
                        const finalUrl = (typeof imageOptimizer !== 'undefined') ? 
                            imageOptimizer.optimizeImageUrl(thumbUrl, 400, 70) : posterFullUrl;
                        
                        bgImg.style.backgroundImage = `url('${finalUrl}')`;
                        bgImg.style.opacity = '0';
                        bgImg.style.transition = 'opacity 1s ease';
                        
                        // Fade in when image is ready
                        const img = new Image();
                        img.onload = () => { bgImg.style.opacity = '1'; };
                        img.src = finalUrl;
                    }
                }
            } catch (error) {
                console.error(`Error loading interest image for ${apiPath}:`, error);
            }
        };

        if (customBgs[apiPath] && customBgs[apiPath].trim() !== '') {
            const finalUrl = customBgs[apiPath].trim();
            bgImg.style.backgroundImage = `url('${finalUrl}')`;
            bgImg.style.opacity = '0';
            bgImg.style.transition = 'opacity 1s ease';
            
            const img = new Image();
            img.onload = () => { bgImg.style.opacity = '1'; };
            img.onerror = () => { 
                console.warn(`Custom background failed to load for ${apiPath}, falling back to auto.`);
                loadFromOphim(); 
            };
            img.src = finalUrl;
        } else {
            loadFromOphim();
        }
    });

    await Promise.all(fetchPromises);
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicInterests);
} else {
    loadDynamicInterests();
}
