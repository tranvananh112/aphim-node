const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { execSync } = require('child_process');
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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8868443300:AAG0ORApQTDPwfHJ-GAOE5GWtefIPGoR4Gw';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1882374365';
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
 * Đăng video lên TikTok bằng FILE_UPLOAD:
 * 1. Dùng FFmpeg tải và cắt 15s từ link M3U8 về file local
 * 2. Đẩy file lên TikTok Server bằng upload URL chính hãng
 */
async function postToTikTok(videoUrl, caption) {
    const tempFilePath = path.join(__dirname, `temp_upload_${Date.now()}.mp4`);
    
    try {
        // --- Buước 1: Dùng FFmpeg cắt 15s từ M3U8 ---
        let videoReady = false;
        try {
            // Kiểm tra FFmpeg có sẵn trên máy chủ không (Linux và Windows)
            try { execSync('ffmpeg -version', { stdio: 'ignore' }); } 
            catch { execSync('where ffmpeg', { stdio: 'ignore' }); }
            
            log.info(`✂️ FFmpeg phát hiện, bắt đầu cắt 30 giây Highlight từ link M3U8...`);
            await new Promise((resolve, reject) => {
                ffmpeg(videoUrl)
                    .inputOptions([
                        '-headers', 'Referer: https://phimapi.com/\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n',
                        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto'
                    ])
                    .seekInput('00:03:00')
                    .duration(30)
                    .outputOptions(['-c:v libx264', '-c:a aac', '-preset ultrafast', '-pix_fmt yuv420p', '-movflags faststart'])
                    .save(tempFilePath)
                    .on('end', () => { log.success('FFmpeg cắt 15s Highlight thành công!'); resolve(); })
                    .on('error', (err) => reject(err));
            });
            
            // Xác nhận file đầu ra hợp lệ (phải lớn hơn 100KB)
            const stat = fs.statSync(tempFilePath);
            if (stat.size < 100 * 1024) throw new Error('File output quá nhỏ, render thất bại.');
            
            videoReady = true;
            log.info(`Kích thước video: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (e) {
            log.warn(`Lỗi FFmpeg: ${e.message}`);
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        }

        if (!videoReady) {
            // FFmpeg không có hoặc thất bại - Chỉ có FFmpeg mới decode HLS được
            log.error('KHÔNG THỂ TẢI VIDEO: FFmpeg bắt buộc để cắt video HLS/M3U8. Bỏ qua bài đăng này.');
            return { success: false, reason: 'ffmpeg_unavailable' };
        }

        // Đăng với chế độ Công khai, nếu bị từ chối thì tự động chuyển Riêng tư
        const videoSize = fs.statSync(tempFilePath).size;
        const privacyLevels = ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'];
        let uploadUrl = null;
        let finalPrivacy = null;

        for (const privacy of privacyLevels) {
            log.info(`🚀 Khởi tạo phiên FILE_UPLOAD (${privacy}): ${(videoSize/1024/1024).toFixed(2)} MB`);
            const initResp = await axios.post(
                'https://open.tiktokapis.com/v2/post/publish/video/init/',
                {
                    post_info: { title: caption, privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false },
                    source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 }
                },
                { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json; charset=UTF-8' } }
            );

            const errCode = initResp.data?.error?.code;
            if (errCode === 'unaudited_client_can_only_post_to_private_accounts') {
                if (privacy === 'PUBLIC_TO_EVERYONE') {
                    log.warn('App Sandbox: không đăng Công khai được, tự động chuyển sang Riêng tư...');
                    continue; // Thử lần tiếp với SELF_ONLY
                }
            }

            uploadUrl = initResp.data?.data?.upload_url;
            if (uploadUrl) { finalPrivacy = privacy; break; }
            throw new Error(`Init thất bại: ${JSON.stringify(initResp.data)}`);
        }

        if (!uploadUrl) throw new Error('Không khởi tạo được phiên upload sau khi thử tất cả mức riêng tư.');

        log.info(`⬆️ Đẩy file MP4 lên TikTok Upload Server...`);
        const fileBuffer = fs.readFileSync(tempFilePath);
        await axios.put(uploadUrl, fileBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': videoSize,
                'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 120000
        });

        log.success(`Đăng video lên TikTok thành công! (Chế độ: ${finalPrivacy === 'SELF_ONLY' ? '🔒 Riêng tư - App chưa được duyệt' : '🌍 Công khai'})`);
        return { success: true };

    } catch (error) {
        if (error.response?.status === 401) {
            log.warn('Token hết hạn, refresh...');
            const newToken = await refreshAccessToken();
            if (newToken) return await postToTikTok(videoUrl, caption);
        }
        const errData = error.response?.data || error.message;
        log.error('Lỗi đăng video:', JSON.stringify(errData));
        return { success: false, reason: JSON.stringify(errData) };
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
}


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

        const errData = error.response ? error.response.data : {};
        if (errData.error && errData.error.code === 'unaudited_client_can_only_post_to_private_accounts') {
            log.error("Lỗi TikTok Sandbox: Ứng dụng chưa được duyệt chỉ có thể đăng lên tài khoản Riêng Tư (Private Account).");
            return { success: false, reason: "sandbox_privacy" };
        }
        
        log.error("Lỗi đăng video:", errData || error.message);
        return { success: false, reason: "unknown" };
    }
}

/**
 * Kỹ thuật Tạo Video Độc Bản: Biến Ảnh Poster Phim thành Video MP4 5 giây
 * (Đảm bảo 100% lách qua hệ thống quét Spam/Trùng lặp của TikTok)
 */
async function generateUniqueVideo(posterUrl, tempVideoPath) {
    return new Promise(async (resolve) => {
        try {
            // Kiểm tra xem máy chủ có cài FFmpeg không
            execSync('ffmpeg -version', { stdio: 'ignore' });
            
            log.info("Khởi động Lò Phản Ứng: Đang render Video Độc Bản từ Poster phim...");
            
            // 1. Tải ảnh Poster về
            const tempImagePath = path.join(__dirname, `temp_poster_${Date.now()}.jpg`);
            const response = await axios({ url: posterUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(tempImagePath);
            response.data.pipe(writer);
            
            await new Promise((res, rej) => {
                writer.on('finish', res);
                writer.on('error', rej);
            });

            // 2. Dùng FFmpeg biến ảnh thành Video dài 5 giây, có hiệu ứng Zoom In nhẹ
            ffmpeg()
                .input(tempImagePath)
                .loop(5)
                .videoFilters([
                    "scale=1080:1920:force_original_aspect_ratio=increase",
                    "crop=1080:1920",
                    "zoompan=z='min(zoom+0.0015,1.5)':d=125"
                ])
                .outputOptions([
                    '-c:v libx264',
                    '-t 5',
                    '-pix_fmt yuv420p',
                    '-r 25'
                ])
                .save(tempVideoPath)
                .on('end', () => {
                    log.success("Render Video độc bản thành công!");
                    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
                    resolve(true);
                })
                .on('error', (err) => {
                    log.warn("Lỗi render video: " + err.message);
                    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
                    resolve(false);
                });

        } catch (e) {
            log.warn("Máy chủ chưa cài đặt FFmpeg. Chuyển sang luồng Stock Video.");
            resolve(false);
        }
    });
}

/**
 * Cắt 15 giây Highlight từ M3U8 Stream (Tự động bỏ qua 5 phút đầu)
 */
async function cutHighlightClip(m3u8Url, tempVideoPath) {
    return new Promise(async (resolve) => {
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
            log.info("Khởi động Lò Phản Ứng: Đang trích xuất Video Highlight chân thực từ phim...");
            
            ffmpeg(m3u8Url)
                .seekInput('00:05:00') // Bỏ qua 5 phút đầu
                .duration(15) // Cắt 15 giây
                .outputOptions([
                    '-c:v libx264',
                    '-c:a aac',
                    '-preset fast',
                    '-pix_fmt yuv420p',
                    '-r 25'
                ])
                .save(tempVideoPath)
                .on('end', () => {
                    log.success("Cắt Video Highlight 15s thành công rực rỡ!");
                    resolve(true);
                })
                .on('error', (err) => {
                    log.warn("Lỗi cắt video highlight: " + err.message);
                    resolve(false);
                });
        } catch (e) {
            log.warn("Máy chủ chưa cài FFmpeg hoặc lỗi khởi tạo. Bỏ qua cắt video.");
            resolve(false);
        }
    });
}

/**
 * Hàm lấy ngẫu nhiên 1 phim từ OPhim API với bộ lọc thông minh
 */
async function getRandomUnpostedMovie() {
    return await withRetry(async () => {
        log.info("🌐 Đang kết nối OPhim API để lấy kho dữ liệu...");
        const response = await axios.get('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
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
        
        const detailRes = await axios.get(`https://phimapi.com/phim/${randomMovie.slug}`);
        const movieData = detailRes.data.movie;
        const episodes = detailRes.data.episodes || [];
        
        // Trích xuất link m3u8 từ tập 1 đầu tiên
        let m3u8_url = null;
        if (episodes.length > 0 && episodes[0].server_data && episodes[0].server_data.length > 0) {
            m3u8_url = episodes[0].server_data[0].link_m3u8;
            log.info(`✅ Tìm thấy link M3U8: ${m3u8_url ? m3u8_url.substring(0, 60) + '...' : 'không có'}`);
        } else {
            log.warn("Phim này không có link tập.");
        }
        
        return { ...movieData, m3u8_url };
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

    // Trích xuất hình ảnh Poster từ Ophim
    const imageDomain = "https://phimimg.com/uploads/movies/";
    const posterUrl = movie.poster_url ? (movie.poster_url.startsWith('http') ? movie.poster_url : imageDomain + movie.poster_url) : 
                      (movie.thumb_url ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : imageDomain + movie.thumb_url) : null);

    // Logic Video: Ưu tiên lấy link M3U8 từ tập phim, sau đó Trailer, rồi mới dùng Poster
    let videoUrl = null;

    // Lớp 1: Link M3U8 từ tập 1 (Tự động làm mau hết nét căng)
    if (movie.m3u8_url) {
        videoUrl = movie.m3u8_url;
        log.info(`🎞️ Chế độ VIP: Dùng trực tiếp link M3U8 từ OPhim.`);
    }
    // Lớp 2: Trailer MP4 gốc
    else if (movie.trailer_url && movie.trailer_url.endsWith('.mp4')) {
        videoUrl = movie.trailer_url;
        log.info("Sử dụng Trailer MP4 gốc của phim.");
    }
    // Lớp 3: Fallback - Lấy link embed tập 1 nếu có (embed player)
    else {
        log.warn("⚠️ Không tìm thấy link video nào hợp lệ cho bộ phim này, bỏ qua.");
        await notifyAdmin(`⚠️ Không tìm thấy link video cho phim: ${movie.name}`);
        return;
    }

    // Upload video lên TikTok bằng PULL_FROM_URL
    const uploadResult = await postToTikTok(videoUrl, caption);
    
    // Dọn file tạm (nếu có)
    
    // Nếu uploadResult trả về true (kiểu cũ) hoặc object có success = true
    const isSuccess = uploadResult === true || (uploadResult && uploadResult.success);

    if (isSuccess) {
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
        const reportMsg = `🚀 <b>[AUTO POST TIKTOK] NHIỆM VỤ HOÀN TẤT!</b>\n\n` +
                          `🎬 <b>Phim:</b> ${movie.name} (${movie.origin_name})\n` +
                          `🎭 <b>Thể loại:</b> ${movieGenres}\n` +
                          `⏱ <b>Tốc độ xử lý:</b> ${timeTaken}s\n\n` +
                          `<i>🤖 Bot đã dọn dẹp rác, lưu vào Database chống trùng lặp và sẵn sàng cho ca làm việc tiếp theo!</i>`;
                          
        await notifyAdmin(reportMsg, posterUrl);
    } else {
        if (uploadResult && uploadResult.reason === "sandbox_privacy") {
            await notifyAdmin(`❌ <b>[BÁO ĐỘNG] CẦN CẤU HÌNH LẠI TIKTOK:</b>\nBộ phim <b>${movie.name}</b> không thể đăng được vì Ứng dụng TikTok của sếp chưa được duyệt (Đang ở chế độ Test).\n\n<b>Cách khắc phục:</b> Vào app TikTok trên điện thoại -> Cài đặt quyền riêng tư -> Chuyển tài khoản thành <b>"Tài khoản riêng tư (Private Account)"</b> thì Bot mới đăng video lên được!`);
        } else {
            await notifyAdmin(`❌ <b>[BÁO ĐỘNG ĐỎ] Lỗi Đăng TikTok:</b>\nBộ phim <b>${movie.name}</b> đã bị lỗi trong quá trình Upload. Sếp vui lòng kiểm tra lại log!`);
        }
    }
}

// ==========================================
// THỰC THI (ENTRY POINT)
// ==========================================
if (require.main === module) {
    autoPostMovie().then(() => log.info("Tiến trình hoàn tất.")).catch(e => log.error("Lỗi Fatal System", e));
}

module.exports = { autoPostMovie };
