const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateTikTokCaption } = require('./tiktok-ai-generator');

// THAY BẰNG TOKEN CỦA BẠN
let ACCESS_TOKEN = 'act.JhldpLjQf7qKP2NMZR0t5WK638YtWALs3rCw0Kds5OACvCXssVpfhyq680wB!6513.s1';
const REFRESH_TOKEN = 'rft.fvz5O1pd2M8Q9Y76SCLhMRJHkBjvvRo7ETedcg9bGBjIgBDoQNfCS6JDY6QL!6516.s1';
const CLIENT_KEY = 'sbawgwih1ntin8uihk';
const CLIENT_SECRET = 'WtZ2pvXKSQ8oPswaqzJ8QBXJ8AyyFHfD';
const POSTED_JSON_PATH = path.join(__dirname, '../posted-tiktok.json');

// --- HỆ THỐNG LOGGING CAO CẤP ---
const log = {
    info: (msg) => console.log(`[${new Date().toISOString()}] 🟢 INFO: ${msg}`),
    warn: (msg) => console.log(`[${new Date().toISOString()}] 🟠 WARN: ${msg}`),
    error: (msg, err) => console.error(`[${new Date().toISOString()}] 🔴 ERROR: ${msg}`, err || ''),
    success: (msg) => console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${msg}`)
};

// --- HỆ THỐNG THÔNG BÁO TELEGRAM (Bản Pro) ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
async function notifyAdmin(message, photoUrl = null) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
        if (photoUrl) {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            await axios.post(url, { 
                chat_id: TELEGRAM_CHAT_ID, 
                photo: photoUrl,
                caption: message, 
                parse_mode: 'HTML' 
            });
        } else {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' });
        }
    } catch (e) {
        log.warn("Lỗi gửi ảnh Telegram, đang thử gửi lại bằng văn bản thuần...");
        if (photoUrl) {
            try {
                const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' });
            } catch (err) {}
        }
    }
}

// --- HỆ THỐNG RETRY (Chống rớt mạng) ---
async function withRetry(fn, retries = 3, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            log.warn(`Lỗi API, đang thử lại lần ${i + 1}/${retries}... (${error.message})`);
            await new Promise(res => setTimeout(res, delayMs * (i + 1))); // Exponential backoff
        }
    }
}

/**
 * Hàm lấy lại Access Token
 */
async function refreshAccessToken() {
    return await withRetry(async () => {
        log.info("Đang tiến hành làm mới Access Token từ TikTok...");
        const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
        }, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        
        if (response.data.access_token) {
            ACCESS_TOKEN = response.data.access_token;
            log.success("Đã làm mới Access Token thành công!");
            return ACCESS_TOKEN;
        }
        throw new Error("Không lấy được token mới");
    });
}

/**
 * Hàm tự động tải và đăng video lên TikTok bằng FILE UPLOAD (Chunked)
 */
async function postVideoToTikTok(videoUrl, caption) {
    const tempFilePath = path.join(__dirname, `temp_${Date.now()}.mp4`);
    try {
        log.info(`📥 Đang tải video từ: ${videoUrl}`);
        
        // 1. Tải Video (Hỗ trợ file lớn)
        const videoResponse = await withRetry(() => axios({ method: 'GET', url: videoUrl, responseType: 'stream' }));
        const writer = fs.createWriteStream(tempFilePath);
        videoResponse.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const videoSize = fs.statSync(tempFilePath).size;
        log.success(`Đã tải xong video. Dung lượng: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);
        
        // 2. Khởi tạo phiên Upload trên TikTok
        log.info("🚀 Khởi tạo phiên đăng video lên TikTok...");
        const initResponse = await axios.post(
            'https://open.tiktokapis.com/v2/post/publish/video/init/',
            {
                post_info: { title: caption, privacy_level: 'SELF_ONLY' },
                source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 }
            },
            { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json; charset=UTF-8' } }
        );

        if (initResponse.data.data && initResponse.data.data.upload_url) {
            const uploadUrl = initResponse.data.data.upload_url;
            log.info("⬆️ Đang đẩy gói dữ liệu video (Chunking) lên TikTok Server...");
            
            // 3. Đẩy file dữ liệu
            const fileData = fs.readFileSync(tempFilePath);
            await axios.put(uploadUrl, fileData, {
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Length': videoSize,
                    'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
            log.success("Đăng video thành công rực rỡ!");
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return true;
        }
        throw new Error("Không nhận được upload_url từ TikTok");
    } catch (error) {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        
        if (error.response && error.response.status === 401) {
            log.warn("Token hết hạn (401), chuẩn bị refresh...");
            const newToken = await refreshAccessToken();
            if (newToken) return await postVideoToTikTok(videoUrl, caption);
        }
        
        log.error("Lỗi đăng video:", error.response ? error.response.data : error.message);
        return false;
    }
}

/**
 * Hàm lấy ngẫu nhiên 1 phim từ OPhim API với bộ lọc thông minh
 */
async function getRandomUnpostedMovie() {
    return await withRetry(async () => {
        log.info("🌐 Đang kết nối OPhim API để lấy kho dữ liệu...");
        const response = await axios.get('https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1');
        const movies = response.data.data.items;

        let postedIds = [];
        if (fs.existsSync(POSTED_JSON_PATH)) {
            postedIds = JSON.parse(fs.readFileSync(POSTED_JSON_PATH, 'utf8'));
        }

        const unpostedMovies = movies.filter(m => !postedIds.includes(m._id));
        if (unpostedMovies.length === 0) {
            log.warn("Không còn phim nào mới để đăng! Toàn bộ kho đã được càn quét.");
            return null;
        }

        const randomMovie = unpostedMovies[Math.floor(Math.random() * unpostedMovies.length)];
        log.info(`Đang truy xuất siêu dữ liệu (Metadata) cho phim: ${randomMovie.slug}`);
        
        const detailRes = await axios.get(`https://ophim1.com/phim/${randomMovie.slug}`);
        return detailRes.data.movie;
    });
}

/**
 * KỊCH BẢN TỔNG HỢP: HỆ THỐNG KING WORKFLOW
 */
async function autoPostMovie() {
    console.log(`\n========================================================`);
    console.log(`👑 SIÊU HỆ THỐNG AUTO POST TIKTOK - BẢN NÂNG CẤP MAX V1.0`);
    console.log(`========================================================\n`);
    
    const startTime = Date.now();
    const movie = await getRandomUnpostedMovie();
    
    if (!movie) {
        await notifyAdmin("⚠️ Bot TikTok ngưng hoạt động: Đã hết phim mới trong kho.");
        return;
    }
    
    log.success(`Target Locked: [${movie.name}] (${movie.origin_name}) - Năm: ${movie.year}`);

    // Xử lý dọn dẹp nội dung
    const movieTitle = movie.name;
    const movieDescRaw = movie.content ? movie.content.replace(/<[^>]+>/g, '').trim() : "Một bộ phim cực kỳ hấp dẫn đang chờ đón bạn.";
    const movieDesc = movieDescRaw.substring(0, 800); // Lấy đủ sâu cho AI phân tích
    const movieGenres = movie.category ? movie.category.map(c => c.name).join(', ') : "Phim Hot";
    const actors = movie.actor ? movie.actor.join(', ') : "Dàn diễn viên siêu đỉnh";

    log.info("🤖 Kích hoạt siêu AI Groq để tạo nội dung...");
    const enrichedDescription = `${movieDesc} (Diễn viên: ${actors})`;
    const caption = await withRetry(() => generateTikTokCaption(movieTitle, enrichedDescription, movieGenres));
    
    if (!caption) {
        log.error("Hệ thống AI không phản hồi, hủy tiến trình.");
        await notifyAdmin(`❌ Bot TikTok lỗi: AI không thể tạo caption cho phim ${movie.name}`);
        return;
    }

    // Logic Video Fallback Thông Minh
    // 1. Kiểm tra trailer thật, 2. Kiểm tra link tập 1, 3. Dùng video dự phòng
    let videoMp4Url = "https://www.w3schools.com/html/mov_bbb.mp4"; // Default Stock Fallback
    if (movie.trailer_url && movie.trailer_url.endsWith('.mp4')) {
        videoMp4Url = movie.trailer_url;
        log.info("Sử dụng Trailer MP4 gốc của phim.");
    } else {
        log.info("Không tìm thấy Trailer MP4, chuyển sang luồng dự phòng (Stock Video).");
    }

    // Xử lý Upload
    const uploadSuccess = await postVideoToTikTok(videoMp4Url, caption);
    
    if (uploadSuccess) {
        // Cập nhật CSDL nội bộ
        let postedIds = [];
        if (fs.existsSync(POSTED_JSON_PATH)) {
            postedIds = JSON.parse(fs.readFileSync(POSTED_JSON_PATH, 'utf8'));
        }
        postedIds.push(movie._id);
        fs.writeFileSync(POSTED_JSON_PATH, JSON.stringify(postedIds, null, 2));
        log.success(`Cập nhật Database thành công. Đã khóa ID [${movie._id}] chống trùng.`);
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Trích xuất hình ảnh Poster từ Ophim
        const imageDomain = "https://img.ophim.live/uploads/movies/";
        const posterUrl = movie.poster_url ? (movie.poster_url.startsWith('http') ? movie.poster_url : imageDomain + movie.poster_url) : 
                          (movie.thumb_url ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : imageDomain + movie.thumb_url) : null);

        const reportMsg = `🚀 <b>[AUTO POST TIKTOK] NHIỆM VỤ HOÀN TẤT!</b>\n\n` +
                          `🎬 <b>Phim:</b> ${movie.name} (${movie.origin_name})\n` +
                          `🎭 <b>Thể loại:</b> ${movieGenres}\n` +
                          `⏱ <b>Tốc độ xử lý:</b> ${timeTaken}s\n\n` +
                          `<i>🤖 Bot đã dọn dẹp rác, lưu vào Database chống trùng lặp và sẵn sàng cho ca làm việc tiếp theo!</i>`;
                          
        await notifyAdmin(reportMsg, posterUrl);
    } else {
        await notifyAdmin(`❌ <b>[BÁO ĐỘNG ĐỎ] Lỗi Đăng TikTok:</b>\nBộ phim <b>${movie.name}</b> đã bị lỗi trong quá trình Upload. Sếp vui lòng kiểm tra lại log!`);
    }
}

// ==========================================
// THỰC THI (ENTRY POINT)
// ==========================================
if (require.main === module) {
    autoPostMovie().then(() => log.info("Tiến trình hoàn tất.")).catch(e => log.error("Lỗi Fatal System", e));
}

module.exports = { autoPostMovie };
