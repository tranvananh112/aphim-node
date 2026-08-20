/**
 * A PHIM - Firebase Comments Service v4
 * Giữ nguyên Input Box chuẩn ban đầu + Nâng cấp Giao diện bình luận phía dưới
 */

(function () {
    'use strict';

    const COMMENTS_CONFIG = {
        apiKey           : "AIzaSyAY4Lp6JR2zYyDWgfWJGOs5hyPbjC3SgGM",
        authDomain       : "aphim-comments.firebaseapp.com",
        projectId        : "aphim-comments",
        storageBucket    : "aphim-comments.firebasestorage.app",
        messagingSenderId: "369841727524",
        appId            : "1:369841727524:web:4a16c483184d2a9bb350b1",
        measurementId    : "G-7R819RHS99"
    };

    const COMMENTS_APP_NAME = 'aphim-comments';
    const COMMENT_LIMIT = 200;

    const AVATAR_COLORS = [
        '#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6',
        '#f97316','#06b6d4','#ec4899','#84cc16','#6366f1'
    ];

    const AVATAR_LIST = [
        "https://i.ex-cdn.com/giadinhmoi.vn/files/content/2024/12/13/470107535_1156674079362932_3220600486106282952_n-0953.jpg",
        "https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/07/anh-son-tung-2.jpg",
        "https://cdn2.fptshop.com.vn/unsafe/800x0/anh_lisa_6_d83ab4e404.jpg",
        "https://img.tripi.vn/cdn-cgi/image/width=700,height=700/https://gcs.tripi.vn/public-tripi/tripi-feed/img/482756agE/anh-mo-ta.png",
        "https://tophinhanh.net/wp-content/uploads/2023/12/anh-kim-jisoo-cute-1.jpg",
        "https://i.pinimg.com/736x/3c/d7/24/3cd724dd754d0b42bd6599efe18ceff0.jpg"
    ];

    function getAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    function timeAgo(ts) {
        if (!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60)     return 'vừa xong';
        if (diff < 3600)   return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)} giờ trước`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    }

    function sanitize(str) {
        if (typeof str !== 'string') return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Lấy thông tin tập phim tự động
    function getEpisodeInfo() {
        try {
            const activeEp = document.querySelector('#episode-list a.active, .episode-btn.active, .server-btn.active');
            if (activeEp) {
                let epText = activeEp.textContent.trim();
                if (/^\d+$/.test(epText)) epText = `Tập ${epText}`;
                return `P.1 - ${epText}`;
            }
        } catch(e) {}
        return '';
    }

    function getCurrentUser() {
        try {
            if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
                return authService.getCurrentUser();
            }
        } catch (e) {}
        return null;
    }

    // ── API SERVICE (Replaced Firebase) ──────────────────────────────────────────────
    const API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
        ? API_CONFIG.BACKEND_URL 
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api'
            : 'https://a-phim-production-0fc1.up.railway.app/api');

    function getUserToken() {
        if (typeof STORAGE_KEYS !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.TOKEN) || sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        }
        return localStorage.getItem('A Phim_token') || sessionStorage.getItem('A Phim_token');
    }

    class APIComments {
        constructor() {
            this.ready = true;
            this._onReady = [];
            this.currentSlug = null;
            this.pollInterval = null;
        }

        onReady(fn) { fn(); }

        async getMovieIdFromSlug(slug) {
            // Because the Comment API needs movieId, but we only have slug from URL.
            // Let's modify the addComment backend later, or fetch movie details first.
            // For now, we will pass slug only, our backend handles it if we modify it!
            return slug;
        }

        async add(slug, { name, text, isSpoiler, parentId, userEmail, avatarUrl }) {
            text = (text || '').trim();
            if (text.length < 2)    return { ok: false, msg: 'Bình luận quá ngắn!' };
            if (text.length > 1000) return { ok: false, msg: 'Tối đa 1000 ký tự!' };
            
            const token = getUserToken();
            if(!token) return { ok: false, msg: 'Vui lòng đăng nhập để bình luận!' };

            try {
                // Fetch movie info to get MovieId based on slug (The backend requires movieId)
                // We'll just pass slug to backend, and let backend resolve it to ID
                // Alternatively, the website usually stores window.currentMovie.
                let movieId = window.currentMovie ? window.currentMovie._id : slug;

                const res = await fetch(`${API_URL}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        movieId: movieId,
                        movieSlug: slug,
                        content: text,
                        avatar: avatarUrl,
                        parentId: parentId || null
                    })
                });

                const data = await res.json();
                if (data.success) {
                    // Trigger a re-fetch manually
                    if(this._lastCb) this.fetchData(slug, this._lastCb);
                    return { ok: true };
                }
                return { ok: false, msg: data.message || 'Gửi thất bại, thử lại!' };
            } catch (e) {
                console.error(e);
                return { ok: false, msg: 'Lỗi mạng, thử lại!' };
            }
        }

        async vote(slug, commentId, type, userEmail) {
            // To be implemented in backend, ignoring gracefully for now
        }

        async toggleSpoiler(slug, commentId, currentState) {
            // To be implemented in backend, ignoring gracefully for now
        }

        async fetchData(slug, cb) {
            try {
                const res = await fetch(`${API_URL}/comments/movie/${slug}`);
                const data = await res.json();
                
                if(data.success) {
                    const rawList = data.data.map(d => ({
                        id: d._id,
                        name: d.user ? d.user.name : 'Khách',
                        email: d.user ? d.user.email : '',
                        text: d.content,
                        color: getAvatarColor(d.user ? d.user.name : 'U'),
                        avatarUrl: d.user ? (d.user.avatarUrl || d.user.avatar) : '',
                        frameClass: d.user ? d.user.equippedFrameClass : '',
                        frameUrl: d.user ? d.user.equippedFrameUrl : '',
                        userRole: d.user ? d.user.role : 'user',
                        timestamp: new Date(d.createdAt),
                        isSpoiler: d.isSpoiler || false,
                        parentId: d.parent || null, 
                        episodeInfo: '',
                        likedBy: d.likes || [],
                        dislikedBy: []
                    }));
                    
                    // Build nested tree
                    const commentMap = {};
                    const topLevelComments = [];

                    // Sắp xếp tăng dần theo thời gian: cũ nhất ở trên, mới nhất ở dưới
                    rawList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                    rawList.forEach(c => {
                        commentMap[c.id] = { ...c, replies: [] };
                    });

                    rawList.forEach(c => {
                        if (c.parentId && commentMap[c.parentId]) {
                            commentMap[c.parentId].replies.push(commentMap[c.id]);
                        } else {
                            topLevelComments.push(commentMap[c.id]);
                        }
                    });

                    cb({ comments: topLevelComments, count: data.count || data.total || rawList.length });
                }
            } catch(e) {
                console.error("Lỗi fetch comment", e);
                cb({ comments: [], count: 0 });
            }
        }

        listen(slug, cb) {
            this.currentSlug = slug;
            this._lastCb = cb;
            this.fetchData(slug, cb);
            
            // Poll every 10 seconds
            if(this.pollInterval) clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.fetchData(slug, cb), 10000);
        }

        stopListen() { 
            if(this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }
    }

    if(!window.firebaseComments) {
        window.firebaseComments = new APIComments();
    }

    // ════════════════════════════════════════════════════════════════════
    // ── UI CONTROLLER ─────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ap-cmt-css-v4')) return;
        const s = document.createElement('style');
        s.id = 'ap-cmt-css-v4';
        s.textContent = `
        /* ── Wrapper ── */
        .ap-cmt-wrapper { margin-top:0; }

        /* ── BOX CHƯA ĐĂNG NHẬP (LẤY LẠI GIAO DIỆN CŨ) ── */
        .ap-cmt-guest {
            padding: 32px 20px; text-align: center;
            background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12);
            border-radius: 16px; margin-bottom: 24px;
        }
        .ap-guest-icon { font-size: 48px; margin-bottom: 12px; color: rgba(255,255,255,0.3); }
        .ap-cmt-guest h4 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .ap-cmt-guest p { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
        .ap-guest-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .ap-btn-login {
            display:inline-flex; align-items:center; gap:6px;
            padding: 10px 24px; border-radius: 24px;
            background: #fcd576; color: #1a1200;
            font-weight: 700; font-size: 14px; text-decoration: none; transition: background 0.2s; border:none; cursor:pointer;
        }
        .ap-btn-login:hover { background: #e0b84e; }
        .ap-btn-register {
            display:inline-flex; align-items:center; gap:6px;
            padding: 10px 24px; border-radius: 24px;
            background: rgba(255,255,255,0.08); color: #fff;
            font-weight: 600; font-size: 14px; text-decoration: none; border: 1px solid rgba(255,255,255,0.15);
            transition: background 0.2s; cursor:pointer;
        }
        .ap-btn-register:hover { background: rgba(255,255,255,0.14); }

        /* ── BOX ĐÃ ĐĂNG NHẬP (LẤY LẠI GIAO DIỆN CŨ ĐẸP) ── */
        .ap-cmt-form-logged {
            background: rgba(30, 33, 42, 0.85); 
            border: 1px solid rgba(255, 255, 255, 0.05); 
            border-radius: 20px; 
            overflow: hidden; 
            transition: all 0.3s ease; 
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .ap-cmt-form-logged:focus-within { 
            border-color: rgba(252, 213, 118, 0.3); 
            box-shadow: 0 8px 32px rgba(252, 213, 118, 0.05);
        }
        .ap-form-user-bar {
            display: flex; align-items: center; gap: 10px; padding: 14px 18px 4px 18px;
            background: transparent; border-bottom: none;
        }
        .ap-form-user-ava {
            width: 32px; height: 32px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 13px; color: #fff; flex-shrink:0;
            position: relative; overflow: visible;
        }
        .ap-form-user-name { font-size: 13px; font-weight: 600; color: #fff; }
        .ap-form-user-badge {
            font-size: 11px; color: #10b981; font-weight:500;
            background: rgba(16,185,129,0.12); padding: 2px 8px; border-radius: 12px;
        }
        .ap-form-logout-btn {
            margin-left: auto; font-size: 11px; color: #6b7280;
            background: none; border: none; cursor: pointer;
            padding: 4px 8px; border-radius: 8px; transition: color 0.2s;
        }
        .ap-form-logout-btn:hover { color: #ef4444; }

        .ap-cmt-textarea {
            width: 100%; box-sizing: border-box !important; background: transparent; border: none; outline: none;
            color: #e5e7eb; font-size: 14px; line-height: 1.6;
            padding: 10px 18px; resize: none; font-family: inherit;
            box-sizing: border-box; min-height: 60px; max-height: 160px;
            -webkit-appearance: none; box-shadow: none !important; border-radius: 0;
            overflow-y: auto;
        }
        .ap-cmt-textarea::placeholder { color: #6b7280; font-weight: 400; }

        .ap-form-footer-wrap {
            display: flex; flex-direction: column;
            background: rgba(0, 0, 0, 0.15); /* Seamless slight contrast */
            padding: 12px 18px;
            border-top: 1px solid rgba(255,255,255,0.03);
        }

        .ap-form-footer { flex-wrap: wrap; gap: 8px;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0; border-top: none;
        }
        
        /* Chuyển Slider UI (Spoiler Toggle) của cũ */
        .ap-spoiler-row {
            display: flex; align-items: center; gap: 10px; padding: 0 0 12px 0; border-top: none;
        }
        .ap-toggle-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
        .ap-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ap-toggle-track { position: absolute; inset: 0; background: #4b5563; border-radius: 20px; transition: background 0.25s; }
        .ap-toggle input:checked + .ap-toggle-track { background: #fcd576; }
        .ap-toggle-thumb {
            position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; 
            border-radius: 50%; background: #fff; transition: transform 0.25s; pointer-events: none;
        }
        .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(16px); }
        .ap-spoiler-label { font-size: 13px; color: #9ca3af; }
        .ap-spoiler-label.active { color: #fcd576; font-weight: 600; }

        .ap-char-count { font-size: 11px; color: #6b7280; }
        .ap-send-btn { white-space: nowrap; flex-shrink: 0;
            display: flex; align-items: center; gap: 6px;
            padding: 8px 20px; border-radius: 20px;
            background: #fcd576; color: #1a1200;
            font-weight: 700; font-size: 13px; border: none;
            cursor: pointer; transition: all 0.2s;
        }
        .ap-send-btn:hover { background: #e0b84e; transform: scale(1.02); }
        .ap-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        /* ── AVATAR SELECTOR ── */
        .ap-ava-select { position: relative; margin-left: auto; display: flex; align-items: center; }
        .ap-btn-ava { white-space: nowrap; flex-shrink: 0;
            display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px;
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db;
            font-size: 13px; cursor: pointer; transition: background 0.2s;
        }
        .ap-btn-ava:hover { background: rgba(255,255,255,0.1); }
        .ap-ava-preview { width: 20px !important; height: 20px !important; border-radius: 50% !important; object-fit: cover !important; }
        .ap-ava-dropdown {
            position: absolute; bottom: 120%; right: 0; background: #282a3a;
            border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px;
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 220px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); opacity: 0; pointer-events: none;
            transform: translateY(10px); transition: all 0.2s ease; z-index: 100;
        }
        .ap-ava-dropdown.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .ap-ava-option {
            width: 56px !important; height: 56px !important; border-radius: 50% !important; object-fit: cover !important; cursor: pointer;
            border: 2px solid transparent; transition: border-color 0.2s, transform 0.2s;
            display: block !important;
        }
        .ap-ava-option:hover { transform: scale(1.1); }
        .ap-ava-option.selected { border-color: #fcd576; transform: scale(1.1); }

        @media (max-width: 480px) {
            .ap-ava-dropdown { width: 180px; right: -10px; padding: 10px; gap: 6px; }
            .ap-ava-option { width: 44px; height: 44px; }
            .ap-btn-ava { font-size: 11px; padding: 4px 10px; }
            .ap-ava-preview { width: 16px; height: 16px; }
            .ap-send-btn { padding: 6px 16px; font-size: 12px; }
            .ap-char-count { width: 100%; text-align: right; margin-bottom: 4px; }
            .ap-ava-select { margin-left: auto; }
        }

        /* ── GIAO DIỆN BÌNH LUẬN TRẢ LỜI ĐẸP & THANH LỊCH NHƯ TIKTOK/YOUTUBE ── */
        .ap-cmt-list { 
            display: flex; flex-direction: column; text-align: left; gap: 2px;
            max-width: 900px;
            max-height: 600px;
            overflow-y: auto;
            padding-right: 0px; /* Bỏ padding vì không còn scrollbar đè */
            scroll-behavior: smooth;
            scrollbar-width: none; /* Ẩn scrollbar trên Firefox */
        }
        /* Ẩn scrollbar trên Chrome/Safari/Edge */
        .ap-cmt-list::-webkit-scrollbar { display: none; }
        .ap-cmt-item { 
            display: flex; flex-direction: column; gap: 8px; padding: 6px 2px; 
            background: transparent; /* Không có card nền */
            border: none; border-radius: 0;
            animation: ap-in 0.3s ease; position:relative; align-items: flex-start; text-align: left;
        }
        
        .ap-cmt-main-row {
            display: flex; gap: 8px; width: 100%; align-items: flex-start;
        }
        
        /* ── AVATAR FRAME v9 INTEGRATION ── */
        .ap-cmt-avatar, .ap-form-user-ava {
            flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;
        }
        /* Overwrite size-sm specifically for comment context */
        .ap-cmt-avatar.shop-frame-wrap.size-sm { width: 44px; height: 44px; }
        .ap-form-user-ava.shop-frame-wrap.size-sm { width: 30px; height: 30px; }
        .ap-cmt-avatar img, .ap-form-user-ava img {
            width: 100% !important; height: 100% !important; border-radius: 50% !important; object-fit: cover !important; position: relative; z-index: 1;
        }
        
        .ap-cmt-body { flex: 1; min-width: 0; overflow: hidden; display:flex; flex-direction:column; align-items: flex-start; text-align: left; margin-left: 0; }
        
        .ap-cmt-info { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap:wrap; width: 100%;}
        .ap-cmt-badge { font-size: 8px; font-weight: 700; color: #10b981; border: 1px solid rgba(16,185,129,0.5); padding: 1px 4px; border-radius: 4px; background: rgba(16,185,129,0.1); letter-spacing: 0.5px; }
        .ap-cmt-name { font-weight: 600; font-size: 13.5px; color: #fff; display:flex; align-items:center; gap:4px; letter-spacing: 0.1px; }
        .ap-cmt-name .infinity { color: #f59e0b; font-size: 13px; font-weight:bold; line-height: 1;}
        
        .ap-ep-tag { font-size: 12px; color: #9ca3af; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); margin-left:auto; }

        .ap-cmt-text { 
            font-size: 15px; font-weight: 400; color: #FFFFFF; line-height: 1.45; margin-bottom: 4px; margin-top: 2px;
            white-space: pre-wrap; word-break: break-word; transition: filter 0.3s;
            text-align: left; width: 100%; box-sizing: border-box !important;
            background: transparent; padding: 0; border-radius: 0;
            display: inline-block; max-width: 100%;
        }
        .ap-cmt-text.is-spoiler { filter: blur(6px); cursor: pointer; user-select: none; }
        .ap-cmt-text.is-spoiler.revealed { filter: blur(0); }

        .ap-cmt-actions-bottom { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
        .ap-cmt-time { font-size: 11px; color: #9ca3af; }
        .ap-action-reply-btn { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 12px; font-weight: 600; padding: 0; }
        .ap-action-reply-btn:hover { color: #d1d5db; }
        
        .ap-cmt-right-actions { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin-left: 8px; margin-top: 2px; width: 32px; flex-shrink: 0; align-self: flex-start; }
        .ap-right-btn { background: none; border: none; padding: 0; color: #6b7280; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; font-weight: 600;}
        .ap-right-btn .material-icons-round { font-size: 18px; transition: color 0.2s; }
        .ap-right-btn.upvote:hover { color: #FFD700; }
        .ap-right-btn.upvote.active { color: #FFD700; }
        .ap-right-btn.downvote:hover { color: #fcd576; }
        .ap-right-btn.downvote.active { color: #fcd576; }

        /* ── DESKTOP ONLY TWEAKS (>= 768px) ── */
        @media (min-width: 768px) {
            .ap-cmt-avatar.shop-frame-wrap.size-sm { width: 34px; height: 34px; }
            .ap-cmt-list { max-width: 720px; }
            .ap-cmt-item { border-bottom: 1px solid rgba(255,255,255,0.06); padding: 12px 8px; transition: background 0.2s, border-radius 0.2s; }
            .ap-cmt-item:last-child { border-bottom: none; }
            .ap-cmt-item:hover { background: rgba(255,255,255,0.04); border-radius: 12px; border-bottom-color: transparent; }
            
            .ap-cmt-name { font-size: 13px; font-weight: bold; }
            .ap-cmt-text { font-size: 14px; color: #FFFFFF; }
            .ap-cmt-time { font-size: 12px; color: #9ca3af; }
            .ap-action-reply-btn { font-size: 12px; color: #9ca3af; }
            
            .ap-cmt-right-actions { flex-direction: row; gap: 12px; margin-left: 12px; width: auto; align-items: center; justify-content: flex-end; }
            .ap-right-btn { flex-direction: row; gap: 4px; font-size: 12px; color: #9ca3af; }
            .ap-right-btn .material-icons-round { font-size: 16px; }
        }

        /* Dropdown Thêm */
        .ap-dropdown-wrap { position: relative; }
        .ap-dropdown-menu {
            position: absolute; bottom: 100%; right: 0; left: auto; margin-bottom: 8px;
            background: #ffffff; border-radius: 8px; padding: 6px 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 50; min-width: 160px; pointer-events: none;
            opacity: 0; transform: translateY(10px); transition: all 0.2s ease;
        }
        .ap-dropdown-menu.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .ap-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 16px; background: none; border: none; font-size: 14px; color: #1f2937; cursor: pointer; }
        .ap-dropdown-item:hover { background: #f3f4f6; }
        .ap-dropdown-item .material-icons-round { font-size: 18px; color: #4b5563; }

        /* Nested Comments Layout */
        .ap-cmt-replies { 
            display: flex; flex-direction: column;
            margin-left: 52px;
            padding-left: 12px;
            border-left: 1px solid #4b5563;
            gap: 6px; 
            margin-top: 4px;
        }
        .ap-cmt-replies .ap-cmt-item { padding: 4px 0; background: transparent; }
        .ap-cmt-replies .ap-cmt-avatar.shop-frame-wrap.size-sm { width: 28px; height: 28px; }
        .ap-cmt-replies .ap-cmt-name { font-size: 12px; }
        .ap-cmt-replies .ap-cmt-text { font-size: 13px; }
        .ap-cmt-replies .ap-cmt-time { font-size: 11px; }
        .ap-more-replies-btn { color: #9ca3af; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; margin-top: 4px; }
        .ap-more-replies-btn .line { width: 20px; height: 1px; background: #4b5563; margin-right: 8px; }
        
        /* Form Trả lời lồng nhau */
        .ap-reply-form-container { margin-top: 16px; display: none; margin-bottom: 8px; width: 100%; margin-left: 52px; box-sizing: border-box; padding-right: 52px;}
        .ap-reply-form-container.active { display: block; animation: ap-in 0.2s ease; }

        @keyframes ap-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

        /* Toast */
        #ap-cmt-toast {
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%) translateY(20px);
            padding:10px 20px; border-radius:24px; font-size:13px; font-weight:600;
            z-index:9999; opacity:0; transition:all 0.3s; white-space:nowrap;
            box-shadow:0 4px 20px rgba(0,0,0,0.3); color:#fff; pointer-events:none;
        }

        /* =================================================================
           MOBILE FIX — chỉ khóa scroll ngang, không phá layout chữ
           ================================================================= */

        @media (max-width: 768px) {
            /* Cấp page: KHÔNG cho scroll ngang (Chỉ áp dụng trên mobile) */
            body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
            }

            .ap-cmt-wrapper {
                padding: 0 12px 120px 12px !important;
                overflow-x: hidden !important;
                width: 100% !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: 100% !important;
            }

            .ap-cmt-list {
                width: 100% !important;
                max-width: 100% !important;
                max-height: 55vh !important;   /* ngắn hơn desktop (600px) — scroll bên trong */
                overflow-y: auto !important;    /* scroll trong khung */
                overflow-x: hidden !important;
                box-sizing: border-box !important;
                /* Ẩn scrollbar nhưng vẫn scroll được */
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            .ap-cmt-list::-webkit-scrollbar { display: none !important; }

            .ap-cmt-item {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 6px 0 !important;
            }

            /* Avatar cố định kích thước */
            .ap-cmt-avatar.shop-frame-wrap.size-sm {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                max-width: 34px !important;
                flex-shrink: 0 !important;
            }

            /* Body: flex:1 + min-width:0 là đủ — ĐỪNG set width:0 */
            .ap-cmt-body {
                flex: 1 !important;
                min-width: 0 !important;
                max-width: 100% !important;
            }

            /* Text: word-wrap bình thường, đừng bị vỡ */
            .ap-cmt-text {
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
                font-size: 13px !important;
            }

            .ap-cmt-info {
                gap: 4px !important;
                flex-wrap: nowrap !important;
                overflow: hidden !important;
            }
            .ap-cmt-name {
                font-size: 12px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 45vw !important;
            }
            .ap-cmt-time { font-size: 10px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
            .ap-ep-tag { display: none !important; }

            .ap-cmt-actions {
                flex-wrap: nowrap !important;
                gap: 0 !important;
                overflow: hidden !important;
            }
            .ap-action-btn {
                padding: 4px 5px !important;
                font-size: 11px !important;
                flex-shrink: 0 !important;
                white-space: nowrap !important;
            }
            .ap-action-btn .action-label { display: none !important; }

            /* Replies */
            .ap-cmt-replies {
                margin-left: 20px !important;
                padding-left: 10px !important;
                border-left: 2px solid rgba(255,255,255,0.12) !important;
                margin-top: 6px !important;
                gap: 4px !important;
                box-sizing: border-box !important;
            }
            .ap-cmt-replies .ap-cmt-avatar.shop-frame-wrap.size-sm {
                width: 26px !important;
                height: 26px !important;
                min-width: 26px !important;
                max-width: 26px !important;
            }

            /* Form */
            .ap-cmt-form-logged, .ap-cmt-guest {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            .ap-form-footer { flex-wrap: wrap !important; gap: 6px !important; padding: 8px 12px !important; }
            .ap-cmt-textarea { font-size: 14px !important; }
            
            .ap-form-user-bar {
                flex-wrap: nowrap !important;
                gap: 6px !important;
                padding: 12px 14px 4px 14px !important;
            }
            .ap-form-user-name {
                font-size: 12px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 30vw !important;
            }
            .ap-form-user-badge {
                font-size: 10px !important;
                white-space: nowrap !important;
                padding: 2px 6px !important;
            }
            .ap-form-logout-btn {
                font-size: 10px !important;
                white-space: nowrap !important;
                padding: 4px 6px !important;
                margin-left: auto !important;
            }

            .ap-dropdown-menu { right: 0 !important; left: auto !important; max-width: 80vw !important; }
            .ap-ava-dropdown { right: 0 !important; max-width: 75vw !important; }
        }

        @media (max-width: 390px) {
            .ap-cmt-replies { margin-left: 10px !important; }
            .ap-cmt-name { max-width: 35vw !important; }
        }
        `;
        document.head.insertBefore(s, document.head.firstChild);
    }

    function showToast(msg, type = 'info') {
        let t = document.getElementById('ap-cmt-toast');
        if (!t) { t = document.createElement('div'); t.id = 'ap-cmt-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
        requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
        clearTimeout(t._t);
        t._t = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; }, 3000);
    }

    // ── Generate Lại Khung Đăng Nhập / Trả Lời Cũ ────────────────────────
    function renderInputForm(boxId = null, rootId = null) {
        const user = getCurrentUser();
        const pid = boxId || 'main';
        // Tức là khi submit, nó sẽ chèn vào rootId (hoặc nếu là comment đầu thì là null)
        const submitPid = rootId || boxId || '';

        if (!user) {
            return `
            <div class="ap-cmt-guest">
                <div class="ap-guest-icon">💬</div>
                <h4>Đăng nhập để bình luận</h4>
                <p>Tham gia cộng đồng A Phim để chia sẻ cảm nhận về những bộ phim hay nhất!</p>
                <div class="ap-guest-btns">
                    <button class="ap-btn-login" onclick="window.showAuthModal && window.showAuthModal('login')">
                        <span class="material-icons-round" style="font-size:16px">login</span> Đăng nhập
                    </button>
                    <button class="ap-btn-register" onclick="window.showAuthModal && window.showAuthModal('register')">
                        <span class="material-icons-round" style="font-size:16px">person_add</span> Đăng kí tài khoản
                    </button>
                </div>
            </div>`;
        }
        
        const color   = getAvatarColor(user.name || user.email || 'U');
        let initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
        const displayName = sanitize(user.name || user.email || 'Người dùng');
        // Get per-user avatar: use avatarService if available, else legacy key
        const userId = user._id || user.id || user.email;
        const savedAva = (typeof avatarService !== 'undefined' ? avatarService.getAvatar(userId) : null)
                      || user.avatar
                      || localStorage.getItem('ap_chosen_avatar')
                      || '';

        // Lấy frame data
        const frameClass = user.equippedFrameClass || localStorage.getItem('ap_frame_class') || '';

        const avaInner = savedAva 
            ? `<img src="${savedAva}" style="width:100% !important; height:100% !important; border-radius:50% !important; object-fit:cover !important; display:block !important;">` 
            : `<div style="width:100%; height:100%; border-radius:50%; background:${color}; display:flex; align-items:center; justify-content:center;">${initial}</div>`;
        
        const avaHtml = `
            <div class="ap-form-user-ava shop-frame-wrap size-sm ${frameClass}" id="ap-user-ava-${pid}">
                ${avaInner}
            </div>`;
        
        const previewHtml = savedAva ? `<img src="${savedAva}" class="ap-ava-preview" id="ap-preview-${pid}">` : `<span class="material-icons-round" style="font-size:18px" id="ap-preview-${pid}">account_circle</span>`;

        let optionsHtml = '';
        AVATAR_LIST.forEach(link => {
            optionsHtml += `<img src="${link}" class="ap-ava-option ${savedAva === link ? 'selected' : ''}" onclick="window.selectAvatar('${link}', '${pid}')">`;
        });

        return `
        <div class="ap-cmt-form-logged">
            <div class="ap-form-user-bar">
                ${avaHtml}
                <span class="ap-form-user-name">${displayName}</span>
                <span class="ap-form-user-badge">✓ Đã đăng nhập</span>
                <button class="ap-form-logout-btn" onclick="try{ authService.logout(); } catch(e){ window.location.href = 'login.html'; }">Đăng xuất</button>
            </div>
            <textarea class="ap-cmt-textarea" id="ap-input-${pid}" placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..." maxlength="1000"></textarea>
            <div class="ap-form-footer-wrap">
                <div class="ap-spoiler-row">
                    <label class="ap-toggle-wrap">
                        <span class="ap-toggle">
                            <input type="checkbox" id="ap-spoiler-${pid}" onchange="this.parentElement.nextElementSibling.classList.toggle('active', this.checked)">
                            <span class="ap-toggle-track"></span>
                            <span class="ap-toggle-thumb"></span>
                        </span>
                        <span class="ap-spoiler-label">Tiết lộ nội dung?</span>
                    </label>
                </div>
                <div class="ap-form-footer">
                    <span class="ap-char-count" id="ap-count-${pid}">0 / 1000</span>
                    <div class="ap-ava-select" id="ap-ava-select-${pid}">
                        <button class="ap-btn-ava" onclick="document.getElementById('ap-ava-drop-${pid}').classList.toggle('show')">
                            ${previewHtml} Chọn đổi ảnh
                        </button>
                        <div class="ap-ava-dropdown" id="ap-ava-drop-${pid}">
                            ${optionsHtml}
                        </div>
                    </div>
                    <button class="ap-send-btn" onclick="window.submitComment('${submitPid}', '${pid}')" id="ap-btn-${pid}" disabled style="margin-left:12px;">
                        Gửi <span class="material-icons-round" style="font-size:16px">send</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    // ── Generate Comment List Item ───────────────────────────────────
    function generateHtml(c, userEmail, isChild = false, rootId = null) {
        const initial = sanitize((c.name || 'K').charAt(0).toUpperCase());
        const tAgo = sanitize(timeAgo(c.timestamp));
        const txt = sanitize(c.text);
        // Like/Hide logic with localStorage
        const localHidden = localStorage.getItem('ap_hide_' + c.id) === '1';
        const hiddenStyle = localHidden ? 'opacity: 0.4; filter: blur(1.5px);' : '';

        const localLiked = localStorage.getItem('ap_like_' + c.id) === '1';
        const baseLikes = (c.likedBy && c.likedBy.length) ? c.likedBy.length : 0;
        let finalLikes = baseLikes + (localLiked && (!c.likedBy || !c.likedBy.includes(userEmail)) ? 1 : 0);
        const likeCountStr = finalLikes > 0 ? finalLikes : '';
        const liked = localLiked;
        const disliked = localHidden;
        const badgeHtml = `<span class="ap-cmt-badge">ROX</span>`; 
        const currentRootId = rootId || c.id;

        let repliesHtml = '';
        if (c.replies && c.replies.length > 0) {
            let visibleReplies = c.replies.slice(0, 3);
            let hiddenReplies = c.replies.slice(3);
            
            let visibleHtml = visibleReplies.map(r => generateHtml(r, userEmail, true, currentRootId)).join('');
            let hiddenHtml = hiddenReplies.length > 0 ? `<div style="display:none; flex-direction:column; gap:6px;" id="hidden-replies-${c.id}">${hiddenReplies.map(r => generateHtml(r, userEmail, true, currentRootId)).join('')}</div>` : '';
            let moreBtnHtml = hiddenReplies.length > 0 ? `
                <div class="ap-more-replies-btn" id="more-btn-${c.id}" onclick="window.actionToggleReplies('${c.id}', ${hiddenReplies.length})">
                    <div class="line"></div> <span class="btn-text">Xem thêm ${hiddenReplies.length} câu trả lời</span> <span class="material-icons-round btn-icon" style="font-size:16px; margin-left:2px;">expand_more</span>
                </div>
            ` : '';

            repliesHtml = `
            <div class="ap-cmt-replies">
                ${visibleHtml}
                ${hiddenHtml}
                ${moreBtnHtml}
            </div>`;
        }

        const fClass = c.frameClass || '';
        
        const currentUser = getCurrentUser();
        // Fallback cho chính người dùng hiện tại nếu API chưa kịp sync hoặc trả về thiếu
        const finalFrameClass = (fClass && fClass !== 'none') ? fClass : (currentUser && currentUser.email === c.email ? (localStorage.getItem('ap_frame_class') || '') : '');

        const avaInnerList = c.avatarUrl 
            ? `<img src="${sanitize(c.avatarUrl)}" style="width:100% !important; height:100% !important; border-radius:50% !important; object-fit:cover !important; display:block !important; position:relative; z-index:2;">` 
            : `<div style="width:100%; height:100%; border-radius:50%; background:${sanitize(c.color)}; display:flex; align-items:center; justify-content:center; position:relative; z-index:2;">${initial}</div>`;

        const userAva = `
            <div class="ap-cmt-avatar shop-frame-wrap size-sm ${finalFrameClass}" style="z-index:1;">
                ${avaInnerList}
            </div>`;

        return `
        <div class="ap-cmt-item" data-id="${c.id}" style="${hiddenStyle}">
            <div class="ap-cmt-main-row">
                ${userAva}
                <div class="ap-cmt-body">
                    <div class="ap-cmt-info">
                        ${badgeHtml}
                        <span class="ap-cmt-name">${sanitize(c.name)} <span class="infinity">∞</span></span>
                        ${!isChild && c.episodeInfo ? `<span class="ap-ep-tag">${sanitize(c.episodeInfo)}</span>` : ''}
                    </div>
                    
                    <div class="ap-cmt-text ${c.isSpoiler ? 'is-spoiler' : ''}" onclick="this.classList.add('revealed')">${c.isSpoiler ? '<span class="material-icons-round" style="font-size:14px;vertical-align:middle">visibility_off</span> [Nội dung bị ẩn] CLICK ĐỂ XEM<br>' : ''}${txt}</div>
                    
                    <div class="ap-cmt-actions-bottom">
                        <span class="ap-cmt-time">${tAgo}</span>
                        <button class="ap-action-reply-btn" onclick="window.actionReplyToggle('${c.id}', '${currentRootId}')">Trả lời</button>
                    </div>
                </div>
                
                <div class="ap-cmt-right-actions">
                    <button class="ap-right-btn upvote ${liked ? 'active' : ''}" onclick="window.actionVote('${c.id}', 'up', event)">
                        <span class="material-icons-round">${liked ? 'favorite' : 'favorite_border'}</span>${likeCountStr ? `<span class="like-count">${likeCountStr}</span>` : ''}
                    </button>
                    <button class="ap-right-btn downvote ${disliked ? 'active' : ''}" onclick="window.actionVote('${c.id}', 'down', event)"><span class="material-icons-round">thumb_down</span></button>
                </div>
            </div>
            
            <div class="ap-reply-form-container" id="reply-form-${c.id}"></div>

            ${repliesHtml}
        </div>
        `;
    }

    // ── Global Handlers for clicks ────────────────────────────────────
    window.actionToggleReplies = function(cmtId, count) {
        const hiddenDiv = document.getElementById(`hidden-replies-${cmtId}`);
        const btnText = document.querySelector(`#more-btn-${cmtId} .btn-text`);
        const btnIcon = document.querySelector(`#more-btn-${cmtId} .btn-icon`);
        if (!hiddenDiv) return;
        
        if (hiddenDiv.style.display === 'none') {
            hiddenDiv.style.display = 'flex';
            if (btnText) btnText.innerText = 'Ẩn ∧';
            if (btnIcon) btnIcon.style.display = 'none';
        } else {
            hiddenDiv.style.display = 'none';
            if (btnText) btnText.innerText = `Xem thêm ${count} câu trả lời`;
            if (btnIcon) {
                btnIcon.style.display = 'inline-block';
                btnIcon.innerText = 'expand_more';
            }
        }
    };

    window.actionReplyToggle = function(clickId, rootId) {
        const user = getCurrentUser();
        if (!user) { window.showAuthModal && window.showAuthModal('login'); return; }

        if(!rootId) rootId = clickId;

        const box = document.getElementById(`reply-form-${clickId}`);
        if (!box) return;
        
        document.querySelectorAll('.ap-reply-form-container.active').forEach(el => {
            if (el.id !== `reply-form-${clickId}`) {
                el.innerHTML = ''; el.classList.remove('active');
            }
        });

        if (box.classList.contains('active')) {
            box.innerHTML = ''; box.classList.remove('active');
        } else {
            box.innerHTML = renderInputForm(clickId, rootId);
            box.classList.add('active');
            setupInputEvents(clickId);
            document.getElementById(`ap-input-${clickId}`).focus();
        }
    }

    window.actionToggleMore = function(commentId) {
        const mId = `ap-menu-${commentId}`;
        document.querySelectorAll('.ap-dropdown-menu').forEach(menu => {
            if (menu.id !== mId) menu.classList.remove('show');
        });
        const m = document.getElementById(mId);
        if (m) m.classList.toggle('show');
    }

    window.selectAvatar = function(url, pid) {
        // Save with avatarService (per-user) OR fallback to legacy key
        const user = getCurrentUser();
        if (user && typeof avatarService !== 'undefined') {
            const userId = user._id || user.id || user.email;
            avatarService.saveAvatar(userId, url).catch(()=>{});
        } else {
            localStorage.setItem('ap_chosen_avatar', url);
        }
        // Legacy key for backward compat
        localStorage.setItem('ap_chosen_avatar', url);
        document.querySelectorAll(`#ap-ava-drop-${pid} .ap-ava-option`).forEach(img => img.classList.remove('selected'));
        event.target.classList.add('selected');
        
        const preview = document.getElementById(`ap-preview-${pid}`);
        if(preview) {
            if(preview.tagName === 'SPAN') {
                preview.outerHTML = `<img src="${url}" class="ap-ava-preview" id="ap-preview-${pid}">`;
            } else {
                preview.src = url;
            }
        }
        document.getElementById(`ap-ava-drop-${pid}`).classList.remove('show');
        
        // Cập nhật DOM ảnh đại diện ở bar góc trên (Bar User) cho tất cả các form hiện tại
        document.querySelectorAll('div[id^="ap-user-ava-"], img[id^="ap-user-ava-"]').forEach(barAva => {
            if(barAva.tagName === 'DIV') {
                barAva.outerHTML = `<img src="${url}" class="ap-form-user-ava" id="${barAva.id}" style="object-fit:cover;">`;
            } else {
                barAva.src = url;
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ap-dropdown-wrap')) {
            document.querySelectorAll('.ap-dropdown-menu.show').forEach(m => m.classList.remove('show'));
        }
        if (!e.target.closest('.ap-ava-select')) {
            document.querySelectorAll('.ap-ava-dropdown.show').forEach(m => m.classList.remove('show'));
        }
    });

    window.actionVote = async function(commentId, type, e) {
        if (e) e.preventDefault();
        const btn = e ? e.currentTarget : (event ? event.currentTarget : null);

        if (type === 'down') {
            if (!btn) return;
            const isDisliked = localStorage.getItem('ap_hide_' + commentId) === '1';
            const item = document.querySelector(`.ap-cmt-item[data-id="${commentId}"]`);
            
            if (isDisliked) {
                localStorage.removeItem('ap_hide_' + commentId);
                btn.classList.remove('active');
                if (item) {
                    item.style.opacity = '1';
                    item.style.filter = 'none';
                }
            } else {
                localStorage.setItem('ap_hide_' + commentId, '1');
                btn.classList.add('active');
                if (item) {
                    item.style.opacity = '0.4';
                    item.style.filter = 'blur(1.5px)';
                }
                showToast('Đã làm mờ bình luận!', 'info');
            }
            return;
        }

        if (type === 'up') {
            if (!btn) return;
            const isLiked = localStorage.getItem('ap_like_' + commentId) === '1';
            
            // Toggle local state
            if (isLiked) {
                localStorage.removeItem('ap_like_' + commentId);
                btn.classList.remove('active');
            } else {
                localStorage.setItem('ap_like_' + commentId, '1');
                btn.classList.add('active');
            }

            // Update UI count
            const countSpan = btn.querySelector('.like-count');
            let currentCount = countSpan ? parseInt(countSpan.innerText) : 0;
            if (isNaN(currentCount)) currentCount = 0;
            
            let newCount = isLiked ? currentCount - 1 : currentCount + 1;
            
            if (newCount > 0) {
                if (countSpan) {
                    countSpan.innerText = newCount;
                } else {
                    btn.insertAdjacentHTML('beforeend', `<span class="like-count">${newCount}</span>`);
                }
            } else {
                if (countSpan) countSpan.remove();
            }
        }
    }

    window.actionToggleSpoiler = async function(commentId, isCurrentlySpoiler) {
        const user = getCurrentUser();
        if(!user) return;
        await window.firebaseComments.toggleSpoiler(window.firebaseComments.currentSlug, commentId, isCurrentlySpoiler);
        document.getElementById(`ap-menu-${commentId}`).classList.remove('show');
        showToast('Đã cập nhật trạng thái hiển thị!', 'success');
    }

    window.submitComment = async function(submitParentId, boxId) {
        const user = getCurrentUser();
        if (!user) return;
        const slug = window.firebaseComments.currentSlug;
        const pid = boxId || 'main';
        // Get per-user avatar
        const userId2 = user._id || user.id || user.email;
        const avatarUrl = (typeof avatarService !== 'undefined' ? avatarService.getAvatar(userId2) : null)
                       || user.avatar
                       || localStorage.getItem('ap_chosen_avatar')
                       || '';

        
        const ta = document.getElementById(`ap-input-${pid}`);
        const text = ta.value.trim();
        const sc = document.getElementById(`ap-spoiler-${pid}`);
        const isSpoiler = sc ? sc.checked : false;
        
        const btn = document.getElementById(`ap-btn-${pid}`);
        if(btn) { btn.disabled = true; btn.innerHTML = 'Đang gửi...'; }

        const res = await window.firebaseComments.add(slug, {
            name: user.name, userEmail: user.email, text, isSpoiler, parentId: submitParentId || null, avatarUrl
        });

        if (res.ok) {
            ta.value = '';
            if (boxId && boxId !== 'main') {
                const b = document.getElementById(`reply-form-${boxId}`);
                if (b) { b.classList.remove('active'); b.innerHTML = ''; }
            }
            showToast('Bình luận đã được gửi! ✅', 'success');
            // ✅ Auto-scroll xuống cuối list (như Facebook)
            setTimeout(() => {
                const cList = document.querySelector('.ap-cmt-list');
                if (cList) cList.scrollTop = cList.scrollHeight;
            }, 500);
        } else {
            showToast(res.msg, 'error');
            if(btn) { btn.disabled = false; btn.innerHTML = 'Gửi <span class="material-icons-round" style="font-size:16px">send</span>'; }
        }
    }

    // ── Input Length Helper ────────────────────────────────────
    function setupInputEvents(idSuffix) {
        const ta = document.getElementById(`ap-input-${idSuffix}`);
        const c  = document.getElementById(`ap-count-${idSuffix}`);
        const sb = document.getElementById(`ap-btn-${idSuffix}`);
        if(!ta || !c || !sb) return;
        ta.addEventListener('input', () => {
            const l = ta.value.trim().length;
            c.textContent = `${l} / 1000`;
            c.style.color = l > 900 ? '#ef4444' : l > 700 ? '#f59e0b' : '#6b7280';
            sb.disabled = l < 1;
        });
    }

    // ── Khởi Tạo Chính ──────────────────────────────────────────────────
    function initCommentUI() {
        const params = new URLSearchParams(window.location.search);
        let slug = params.get('slug');
        if(!slug) {
            const m = window.location.pathname.match(/\/phim\/([^\/]+)/);
            if(m) slug = m[1];
        }
        if (!slug && window.location.pathname.includes('watch.html')) slug = 'demo-cam-nang-yeu';
        if (!slug) return;

        const section = document.getElementById('comments-section');
        if (!section) return;

        injectStyles();
        window._apInitComment = initCommentUI;

        const innerBox = section.querySelector('.mt-8') || section.querySelector('div');
        if (!innerBox) return;

        const heading = innerBox.querySelector('h3');
        Array.from(innerBox.children).forEach(child => { if (child !== heading) child.remove(); });

        const wrapper = document.createElement('div');
        wrapper.className = 'ap-cmt-wrapper';
        innerBox.appendChild(wrapper);

        // FORM nhập ở TRÊN (như layout cũ)
        const formWrap = document.createElement('div');
        formWrap.style.cssText = 'margin-bottom: 16px;';
        formWrap.innerHTML = renderInputForm(null);
        wrapper.appendChild(formWrap);
        setupInputEvents('main');

        // LIST bình luận ở DƯỚI
        const listEl = document.createElement('div');
        listEl.className = 'ap-cmt-list';
        listEl.innerHTML = '<div style="text-align:center;color:#6b7280;padding:20px;width:100%;">⏳ Đang tải bình luận...</div>';
        wrapper.appendChild(listEl);

        const user = getCurrentUser();
        const userEmail = user ? user.email : null;

        // Firebase Sync — Smart re-render: giữ scroll, giữ reply form đang mở
        let _lastCommentCount = -1;
        let _lastCommentIds = null;

        window.firebaseComments.onReady(() => {
            window.firebaseComments.listen(slug, ({ comments, count }) => {
                if (heading) heading.innerHTML = `<span class="material-icons-round text-primary outline-none">sentiment_satisfied_alt</span> Bình luận (${count})`;

                // ── Luôn re-render khi có cập nhật để đảm bảo dữ liệu like/dislike chính xác ──

                // ── Lưu trạng thái trước khi re-render ──
                const scrollTop = listEl.scrollTop;
                const wasAtBottom = (listEl.scrollHeight - listEl.clientHeight - scrollTop) < 60;

                // Lưu reply form đang mở (ID + nội dung đang gõ)
                const openForms = {};
                document.querySelectorAll('.ap-reply-form-container.active').forEach(el => {
                    const id = el.id.replace('reply-form-', '');
                    const ta = el.querySelector(`#ap-input-${id}`);
                    openForms[id] = ta ? ta.value : '';
                });

                // ── Fade out nhẹ → re-render → fade in ──
                listEl.style.transition = 'opacity 0.15s';
                listEl.style.opacity = '0.4';

                setTimeout(() => {
                    if (comments.length === 0) {
                        listEl.innerHTML = '<div style="text-align:center;color:#6b7280;padding:32px 20px;width:100%;">💬 Hãy là người đầu tiên bình luận!</div>';
                    } else {
                        listEl.innerHTML = comments.map(c => generateHtml(c, userEmail, false)).join('');
                    }

                    // ── Khôi phục reply form đang mở ──
                    Object.entries(openForms).forEach(([id, draft]) => {
                        const box = document.getElementById(`reply-form-${id}`);
                        if (!box) return;
                        // Tìm rootId từ comment cha
                        const parentItem = box.closest('.ap-cmt-item');
                        const rootId = parentItem ? parentItem.dataset.id : id;
                        box.innerHTML = renderInputForm(id, rootId);
                        box.classList.add('active');
                        setupInputEvents(id);
                        // Khôi phục draft đang gõ dở
                        const ta = document.getElementById(`ap-input-${id}`);
                        if (ta && draft) { ta.value = draft; ta.dispatchEvent(new Event('input')); }
                    });

                    setupInputEvents('main');

                    // ── Khôi phục scroll ──
                    if (wasAtBottom) {
                        // Nếu đang ở cuối thì auto-scroll xuống (xem bình luận mới)
                        listEl.scrollTop = listEl.scrollHeight;
                    } else {
                        // Giữ nguyên vị trí scroll
                        listEl.scrollTop = scrollTop;
                    }

                    listEl.style.opacity = '1';
                }, 150);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommentUI);
    } else {
        setTimeout(initCommentUI, 100);
    }

    window.addEventListener('beforeunload', () => {
        if (window.firebaseComments) window.firebaseComments.stopListen();
    });

})();
