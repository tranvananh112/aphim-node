document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.getElementById('top-weekly-sidebar');
    if (!sidebar) return;

    try {
        const response = await movieAPI.fetchWithFallback('/danh-sach/phim-moi-cap-nhat?page=1&limit=100');
        const result = await response.json();
        
        if (!result.data || !result.data.items) return;

        let items = result.data.items;
        const imgDomain = result.data.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com/';

        // Sort theo IMDb/TMDB (vote_average) giảm dần, nếu bằng thì ưu tiên vote_count
        items.sort((a, b) => {
            const scoreA = a.tmdb?.vote_average || a.imdb?.vote_average || 0;
            const countA = a.tmdb?.vote_count || a.imdb?.vote_count || 0;
            const scoreB = b.tmdb?.vote_average || b.imdb?.vote_average || 0;
            const countB = b.tmdb?.vote_count || b.imdb?.vote_count || 0;
            
            if (scoreB !== scoreA) return scoreB - scoreA;
            return countB - countA;
        });

        // Lấy top 10
        const top10 = items.slice(0, 10);

        let html = `
            <div class="ap-top-weekly-container">
                <h3 class="ap-top-weekly-title">
                    <span class="material-icons-round text-red-500">local_fire_department</span>
                    Top phim tuần này
                </h3>
                <div class="ap-top-weekly-list">
        `;

        top10.forEach((item, index) => {
            const num = index + 1;
            const isTop3 = num <= 3;
            const numColor = isTop3 ? '#FFD700' : '#4b5563'; // Vàng cho 1-3, xám cho 4-10
            
            const imgBase = imgDomain.endsWith('/') ? imgDomain.slice(0, -1) : imgDomain;
            const fullImgPath = false ? imgBase : `${imgBase}/uploads/movies`;
            const thumbUrl = item.thumb_url.startsWith('http') ? item.thumb_url : `${fullImgPath}/${item.thumb_url}`;
            const title = item.name || item.origin_name;
            const badge = item.quality || 'HD';
            const episode = item.episode_current || 'Tập 1';
            const score = item.tmdb?.vote_average || item.imdb?.vote_average || 0;

            html += `
                <a href="movie-detail.html?slug=${item.slug}" class="ap-top-weekly-item group">
                    <div class="ap-top-num" style="--num-color: ${numColor};">${num}</div>
                    <img src="${thumbUrl}" alt="${title}" class="ap-top-thumb" loading="lazy" />
                    <div class="ap-top-info">
                        <h4 class="ap-top-name group-hover:text-red-500 transition-colors">${title}</h4>
                        <div class="ap-top-meta">
                            <span class="ap-badge">${badge}</span>
                            <span class="ap-dot">•</span>
                            <span class="ap-ep">${episode}</span>
                            ${score > 0 ? `<span class="ap-dot">•</span><span class="ap-star flex items-center gap-[2px] text-yellow-400 font-bold"><span class="material-icons-round" style="font-size: 12px;">star</span>${score}</span>` : ''}
                        </div>
                    </div>
                </a>
            `;
        });

        html += `
                </div>
            </div>
            
            <style>
                .ap-top-weekly-container {
                    background: transparent;
                    width: 100%;
                }
                .ap-top-weekly-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .ap-top-weekly-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .ap-top-weekly-item {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: flex-start !important;
                    gap: 16px !important;
                    padding: 8px !important;
                    border-radius: 12px;
                    background: transparent;
                    transition: background 0.2s ease;
                    text-decoration: none;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .ap-top-weekly-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .ap-top-num {
                    font-size: 36px !important;
                    font-weight: 900 !important;
                    font-style: italic !important;
                    color: transparent !important;
                    -webkit-text-stroke: 1.5px var(--num-color) !important;
                    width: 36px !important;
                    min-width: 36px !important;
                    text-align: center !important;
                    flex-shrink: 0 !important;
                    font-family: 'Inter', sans-serif !important;
                }
                .ap-top-thumb {
                    width: 60px !important;
                    height: 80px !important;
                    min-width: 60px !important;
                    max-width: 60px !important;
                    object-fit: cover !important;
                    border-radius: 8px !important;
                    flex-shrink: 0 !important;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
                    position: static !important;
                }
                .ap-top-info {
                    flex: 1 !important;
                    min-width: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: flex-start !important;
                    justify-content: center !important;
                    gap: 4px !important;
                }
                .ap-top-name {
                    color: #e5e7eb;
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                .ap-top-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: #9ca3af;
                }
                .ap-badge {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                    color: #fff;
                }
                .ap-dot {
                    font-size: 14px;
                }

                /* --- Mobile Horizontal Scroll Layout --- */
                @media (max-width: 1023px) {
                    .ap-top-weekly-list {
                        flex-direction: row;
                        overflow-x: auto;
                        overflow-y: hidden;
                        scroll-snap-type: x mandatory;
                        padding-bottom: 8px;
                        scrollbar-width: none; /* Firefox */
                    }
                    .ap-top-weekly-list::-webkit-scrollbar {
                        display: none; /* Chrome/Safari */
                    }
                    .ap-top-weekly-item {
                        min-width: 260px !important;
                        width: 260px !important;
                        max-width: 260px !important;
                        scroll-snap-align: start;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                }
                .ap-ep {
                    font-size: 12px;
                }
            </style>
        `;

        sidebar.innerHTML = html;

    } catch (error) {
        console.error('Error fetching Top Weekly:', error);
    }
});
