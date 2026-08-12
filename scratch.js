const axios = require('axios');
async function fetchAndMergeMovieData(slug) {
    try {
        const [ophimRes, ncRes, vsRes] = await Promise.allSettled([
            axios.get(`https://ophim1.com/phim/${slug}`, { timeout: 5000 }),
            axios.get(`https://phim.nguonc.com/api/film/${slug}`, { timeout: 5000 }),
            axios.get(`https://vsmov.com/api/phim/${slug}`, { timeout: 5000 })
        ]);
        
        let ophimData = null;
        if (ophimRes.status === 'fulfilled' && ophimRes.value && ophimRes.value.data) {
            ophimData = ophimRes.value.data;
        } else {
            return null; // OPhim is required
        }
        
        if (ncRes.status === 'fulfilled' && ncRes.value && ncRes.value.data && ncRes.value.data.movie && ncRes.value.data.movie.episodes) {
            const ncData = ncRes.value.data;
            const mappedEps = ncData.movie.episodes.map(s => ({
                server_name: s.server_name || 'Vietsub',
                server_data: (s.items || []).map(it => ({
                    name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                    slug: it.slug || `tap-${it.name}`,
                    link_embed: it.embed || '',
                    link_m3u8: it.m3u8 || ''
                }))
            }));
            if (!ophimData.episodes) ophimData.episodes = [];
            mappedEps.forEach(s => ophimData.episodes.push(s));
        }
        
        if (vsRes.status === 'fulfilled' && vsRes.value && vsRes.value.data && vsRes.value.data.episodes) {
            const vsData = vsRes.value.data;
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
        
        return ophimData;
    } catch (e) {
        console.error('Lỗi khi fetch và gộp dữ liệu SSR:', e.message);
        return null;
    }
}
fetchAndMergeMovieData('dac-vu-kim-tai-khoi-dong').then(data => {
    console.log(JSON.stringify(data.episodes.map(e => e.server_name)));
}).catch(console.error);
