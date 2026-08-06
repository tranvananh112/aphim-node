const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Configuration
const DOMAIN = 'https://aphim.top'; // Replace with your main domain
const API_URL = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
const KEY_FILE = path.join(__dirname, '../tactile-vial-502112-j8-e14ec813058e.json'); // JSON Key from Google Cloud

async function getJwtClient() {
    return new google.auth.JWT({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/indexing']
    });
}

async function fetchLatestMovies() {
    try {
        console.log(`[API] Đang lấy danh sách phim mới cập nhật...`);
        const res = await axios.get(API_URL, { timeout: 15000 });
        if (res.data && res.data.data && res.data.data.items) {
            return res.data.data.items;
        }
        return [];
    } catch (error) {
        console.error('[API Error] Lỗi lấy danh sách phim:', error.message);
        return [];
    }
}

async function pushUrlToIndex(jwtClient, url) {
    try {
        const response = await google.indexing('v3').urlNotifications.publish({
            auth: jwtClient,
            requestBody: {
                url: url,
                type: 'URL_UPDATED',
            },
        });
        console.log(`✅ [Google Indexing API] Gửi thành công: ${url}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            const apiError = error.response.data.error;
            if (apiError.status === 'PERMISSION_DENIED') {
                console.error(`❌ [Google Indexing API] Lỗi Quyền Truy Cập (403). Bạn phải cấp quyền Owner cho email ${require(KEY_FILE).client_email} trong Google Search Console!`);
            } else if (apiError.code === 429) {
                console.error(`⚠️ [Google Indexing API] Lượt gửi đã đạt giới hạn trong ngày (Quota Exceeded). Dừng quá trình gửi.`);
                process.exit(0);
            } else {
                console.error(`❌ [Google Indexing API] Lỗi: ${apiError.message}`);
            }
        } else {
            console.error(`❌ [Google Indexing API] Lỗi gửi request: ${error.message}`);
        }
        return null;
    }
}

(async () => {
    console.log('🚀 Bắt đầu quá trình Đẩy URL lên Google Indexing API...');

    if (!fs.existsSync(KEY_FILE)) {
        console.error(`❌ Không tìm thấy file JSON chìa khóa tại: ${KEY_FILE}`);
        process.exit(1);
    }

    const jwtClient = await getJwtClient();
    try {
        await jwtClient.authorize();
        console.log('✅ Đã xác thực thành công tài khoản ảo (Service Account).');
    } catch (err) {
        console.error('❌ Lỗi xác thực JSON:', err.message);
        process.exit(1);
    }

    const movies = await fetchLatestMovies();
    console.log(`Phát hiện ${movies.length} phim mới/cập nhật.`);

    if (movies.length === 0) {
        console.log('Không có phim nào cần gửi. Hủy bỏ.');
        return;
    }

    // Delay function to avoid rate limiting
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let successCount = 0;
    
    // We only push the top 20 newest movies at a time to save daily quota (Quota is usually 200 per day)
    const moviesToPush = movies.slice(0, 20);

    for (const [index, movie] of moviesToPush.entries()) {
        const url = `${DOMAIN}/phim/${movie.slug}`;
        console.log(`Đang gửi [${index + 1}/${moviesToPush.length}]: ${url}`);
        const result = await pushUrlToIndex(jwtClient, url);
        if (result) successCount++;
        
        // Wait 2 seconds between requests to avoid spamming Google
        await sleep(2000);
    }

    console.log(`\n🎉 Hoàn thành! Đã gửi thành công ${successCount}/${moviesToPush.length} phim cho Google.`);
    console.log(`Googlebot sẽ quét các URL này ngay lập tức.`);
})();
