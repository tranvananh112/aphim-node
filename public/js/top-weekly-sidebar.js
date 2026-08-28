/**
 * Sidebar "Có thể bạn sẽ thích" - Recommendations Sidebar Module (Bulletproof CSS Version)
 * Tự đống fix lỗi ảnh bị tràn / phồng to trên mọi màn hình Desktop & Mobile
 */

(function () {
    async function initRecommendedSidebar() {
        const sidebar = document.getElementById('top-weekly-sidebar');
        if (!sidebar) return;

        try {
            // Tự động phát hiện môi trường Node SSR hay Web Tĩnh (.html)
            const pathname = window.location.pathname;
            const isNodeSSR = (typeof window !== 'undefined' && window.__IS_NODE_SERVER__ === true);

            // Fetch danh sách phim mới / hot để làm đề xuất "Có thể bạn sẽ thích"
            let items = [];
            try {
                if (typeof movieAPI !== 'undefined' && movieAPI.fetchWithFallback) {
                    const res = await movieAPI.fetchWithFallback('/danh-sach/phim-moi-cap-nhat?page=1&limit=24');
                    const rawData = await res.json();
                    const data = movieAPI.normalizeResponse ? movieAPI.normalizeResponse(rawData) : rawData;
                    items = data?.data?.items || data?.items || [];
                }
            } catch (e) {
                console.warn('[Sidebar] Error fetching recommended movies:', e);
            }

            // Fallback nếu rỗng
            if (!items || items.length === 0) {
                try {
                    const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                    const data = await res.json();
                    items = data?.items || [];
                } catch (e) {}
            }

            if (!items || items.length === 0) return;

            // Lọc bỏ phim hiện tại nếu đang ở trang chi tiết phim
            const currentSlug = new URLSearchParams(window.location.search).get('slug') || pathname.split('/').pop();
            const filtered = items.filter(m => m && m.slug !== currentSlug);

            // Xáo trộn nhẹ để mỗi lần tải mang lại cảm giác tươi mới (Recommend flow)
            const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 7);

            const html = `
                <div class="ap-recommend-sidebar">
                    <h3 class="ap-recommend-title">
                        <span class="ap-recommend-title-bar"></span>
                        Có thể bạn sẽ thích
                    </h3>
                    <div class="ap-recommend-list">
                        ${shuffled.map(item => {
                            const movieTitle = (item.name || item.title || item.origin_name || 'Phim mới').replace(/"/g, '&quot;');
                            const rawImg = item.poster_url || item.thumb_url || '';
                            
                            let imgUrl = rawImg;
                            if (imgUrl) {
                                if (imgUrl.includes('img.ophimimg.com')) {
                                    imgUrl = imgUrl.replace('img.ophimimg.com', 'phimimg.com');
                                } else if (!imgUrl.startsWith('http')) {
                                    imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
                                }
                                if (typeof imageOptimizer !== 'undefined' && imageOptimizer.optimizeImageUrl) {
                                    imgUrl = imageOptimizer.optimizeImageUrl(imgUrl, 150, 80);
                                }
                            } else {
                                imgUrl = '/android-chrome-512x512.png';
                            }

                            const detailUrl = isNodeSSR ? `/phim/${item.slug}` : `movie-detail.html?slug=${item.slug}`;
                            const quality = item.quality || 'FHD';
                            
                            // Parse nhãn tập phim
                            let epText = item.episode_current || 'Full';
                            if (typeof epText === 'number' || (!isNaN(epText) && !String(epText).toLowerCase().includes('tập'))) {
                                epText = `Tập ${epText}`;
                            }

                            // Score rating
                            const scoreVal = item.tmdb?.vote_average || item.imdb?.vote_average || item.rating;
                            const scoreStr = scoreVal ? Number(scoreVal).toFixed(1) : (8.0 + Math.random() * 1.5).toFixed(1);

                            return `
                                <a href="${detailUrl}" class="ap-recommend-item group">
                                    <div class="ap-recommend-thumb-box">
                                        <img src="${imgUrl}" alt="${movieTitle}" class="ap-recommend-thumb-img" loading="lazy" onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, '${item.slug}', '${movieTitle}') : null" />
                                    </div>
                                    <div class="ap-recommend-info">
                                        <h4 class="ap-recommend-name" title="${movieTitle}">
                                            ${movieTitle}
                                        </h4>
                                        <div class="ap-recommend-meta">
                                            <span class="ap-recommend-badge">${quality}</span>
                                            <span class="ap-recommend-dot">•</span>
                                            <span class="ap-recommend-ep">${epText}</span>
                                            <span class="ap-recommend-dot">•</span>
                                            <span class="ap-recommend-star">⭐ ${scoreStr}</span>
                                        </div>
                                    </div>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>

                <style>
                    .ap-recommend-sidebar {
                        width: 100% !important;
                        background: rgba(30, 32, 44, 0.7) !important;
                        border: 1px solid rgba(255, 255, 255, 0.08) !important;
                        border-radius: 16px !important;
                        padding: 16px !important;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
                        box-sizing: border-box !important;
                        margin-bottom: 24px !important;
                    }
                    .ap-recommend-title {
                        font-size: 16px !important;
                        font-weight: 800 !important;
                        color: #ffffff !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 10px !important;
                        margin-top: 0 !important;
                        margin-bottom: 16px !important;
                        letter-spacing: 0.5px !important;
                    }
                    .ap-recommend-title-bar {
                        width: 5px !important;
                        height: 20px !important;
                        background: linear-gradient(135deg, #FFEFA6 0%, #FCD576 50%, #D69F3D 100%) !important;
                        border-radius: 9999px !important;
                        box-shadow: 0 0 10px rgba(252, 213, 118, 0.6) !important;
                        flex-shrink: 0 !important;
                    }
                    .ap-recommend-list {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                        width: 100% !important;
                    }
                    .ap-recommend-item {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 14px !important;
                        padding: 8px !important;
                        border-radius: 12px !important;
                        background: transparent !important;
                        border: 1px solid transparent !important;
                        transition: all 0.2s ease !important;
                        text-decoration: none !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .ap-recommend-item:hover {
                        background: rgba(255, 255, 255, 0.06) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .ap-recommend-thumb-box {
                        width: 68px !important;
                        min-width: 68px !important;
                        max-width: 68px !important;
                        height: 92px !important;
                        min-height: 92px !important;
                        max-height: 92px !important;
                        border-radius: 12px !important;
                        overflow: hidden !important;
                        flex-shrink: 0 !important;
                        background: #0d0f1a !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        position: relative !important;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                    }
                    .ap-recommend-thumb-img {
                        width: 68px !important;
                        min-width: 68px !important;
                        max-width: 68px !important;
                        height: 92px !important;
                        min-height: 92px !important;
                        max-height: 92px !important;
                        object-fit: cover !important;
                        display: block !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-radius: 11px !important;
                        transition: transform 0.3s ease !important;
                    }
                    .ap-recommend-item:hover .ap-recommend-thumb-img {
                        transform: scale(1.06) !important;
                    }
                    .ap-recommend-info {
                        flex: 1 !important;
                        min-width: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: center !important;
                        gap: 6px !important;
                    }
                    .ap-recommend-name {
                        color: #ffffff !important;
                        font-size: 14px !important;
                        font-weight: 700 !important;
                        margin: 0 !important;
                        line-height: 1.3 !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        width: 100% !important;
                        transition: color 0.2s ease !important;
                    }
                    .ap-recommend-item:hover .ap-recommend-name {
                        color: #fcd576 !important;
                    }
                    .ap-recommend-meta {
                        display: flex !important;
                        align-items: center !important;
                        gap: 6px !important;
                        font-size: 12px !important;
                        color: #9ca3af !important;
                        flex-wrap: wrap !important;
                    }
                    .ap-recommend-badge {
                        background: rgba(255, 255, 255, 0.12) !important;
                        color: #ffffff !important;
                        font-size: 10px !important;
                        font-weight: 900 !important;
                        padding: 2px 6px !important;
                        border-radius: 4px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                    }
                    .ap-recommend-dot {
                        color: #6b7280 !important;
                        font-size: 10px !important;
                    }
                    .ap-recommend-ep {
                        color: #d1d5db !important;
                        font-weight: 500 !important;
                        font-size: 12px !important;
                    }
                    .ap-recommend-star {
                        color: #fcd576 !important;
                        font-weight: 800 !important;
                        font-size: 12px !important;
                    }
                </style>
            `;

            sidebar.innerHTML = html;

        } catch (error) {
            console.error('[Sidebar] Error rendering recommendations sidebar:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRecommendedSidebar);
    } else {
        initRecommendedSidebar();
    }
})();