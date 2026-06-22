/**
 * A PHIM - Auth Modal (Login / Register)
 * Hiện popup đăng nhập / đăng ký ngay tại trang mà không redirect
 */
(function () {
    'use strict';

    // ── Guard: Không chạy modal overlay trên các trang standalone login/register ──
    const _currentPage = window.location.pathname.replace(/.*\//, '');
    const _isAuthPage  = _currentPage === 'login.html' || _currentPage === 'register.html';


    // ── Styles ────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ap-auth-modal-css')) return;
        const s = document.createElement('style');
        s.id = 'ap-auth-modal-css';
        s.textContent = `
        /* ── Backdrop ── */
        #ap-auth-backdrop {
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(10,10,20,0.85);
            backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            padding: 12px;
            animation: ap-modal-fadein 0.3s ease;
            
        }
        @keyframes ap-modal-fadein {
            from { opacity:0; } to { opacity:1; }
        }

        /* ── Modal box ── */
        #ap-auth-modal {
            width: 100%; max-width: 720px;
            max-height: calc(100vh - 24px);
            background: #1e2030;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            box-shadow: 0 40px 100px rgba(0,0,0,0.7);
            animation: ap-modal-slidein 0.4s cubic-bezier(0.34,1.56,0.64,1);
            position: relative;
            border: 1px solid rgba(255,255,255,0.08);
        }
        @keyframes ap-modal-slidein {
            from { transform: scale(0.9) translateY(40px); opacity:0; }
            to   { transform: scale(1) translateY(0); opacity:1; }
        }

        /* ── Left panel ── */
        .ap-auth-left {
            width: 280px; flex-shrink: 0;
            background:
                linear-gradient(160deg, rgba(15,15,30,0.6) 0%, rgba(30,32,60,0.8) 100%),
                url('https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8Ez05N5cKk.jpg') center / cover no-repeat;
            display: flex; flex-direction: column;
            align-items: center; justify-content: flex-end;
            padding: 40px 24px;
            gap: 12px;
        }
        @media (max-width: 600px) { .ap-auth-left { display: none; } }
        .ap-auth-brand {
            display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .ap-auth-brand-logo {
            width: 56px; height: 56px; border-radius: 50%;
            border: 2px solid #fcd576;
            overflow: hidden; background: #000;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px rgba(252,213,118,0.3);
        }
        .ap-auth-brand-logo img { width: 38px; height: 38px; object-fit: contain; }
        .ap-auth-brand-name {
            font-size: 24px; font-weight: 800; color: #fff;
            letter-spacing: 0.5px;
        }
        .ap-auth-brand-name span { color: #fcd576; }
        .ap-auth-brand-tagline {
            font-size: 13px; color: rgba(255,255,255,0.6);
            text-align: center; font-weight: 500;
        }

        /* ── Right panel ── */
        .ap-auth-right {
            flex: 1; padding: 48px 40px;
            display: flex; flex-direction: column;
            gap: 0;
            overflow-y: auto;
        }
        @media (max-width: 600px) {
            .ap-auth-right { padding: 24px 20px; }
            #ap-auth-modal { border-radius: 20px; }
            .ap-auth-field { margin-bottom: 12px; }
            .ap-auth-input { padding: 12px 14px; font-size: 14px; border-radius: 10px; }
            .ap-auth-field label { margin-bottom: 6px; font-size: 11px; }
            .ap-auth-submit { padding: 12px; font-size: 15px; margin-top: 6px; }
        }
        @media (max-width: 400px) {
            .ap-auth-right { padding: 20px 16px; }
            .ap-auth-title { font-size: 20px !important; margin-bottom: 4px; }
            .ap-auth-input { padding: 10px 12px; font-size: 13px; }
            .ap-auth-field { margin-bottom: 10px; }
        }

        .ap-auth-close {
            position: absolute; top: 16px; right: 16px;
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,0.06); border: none;
            color: rgba(255,255,255,0.6); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; transition: all 0.2s;
            z-index: 10;
        }
        .ap-auth-close:hover { background: rgba(255,255,255,0.12); color: #fff; transform: rotate(90deg); }


        .ap-auth-title {
            font-size: 28px; font-weight: 800; color: #fff;
            margin: 0 0 8px;
        }
        .ap-auth-subtitle {
            font-size: 14px; color: #9ca3af; margin: 0 0 32px;
        }
        .ap-auth-subtitle a {
            color: #fcd576; text-decoration: none; font-weight: 700;
            cursor: pointer; position: relative;
        }
        .ap-auth-subtitle a:after {
            content:''; position:absolute; bottom:-2px; left:0; width:0; height:1px; background:#fcd576; transition:width 0.2s;
        }
        .ap-auth-subtitle a:hover:after { width:100%; }

        /* ── Inputs ── */
        .ap-auth-field { margin-bottom: 18px; }
        .ap-auth-field label {
            display: block; font-size: 12px; font-weight: 700;
            color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;
        }
        .ap-auth-input {
            width: 100%; box-sizing: border-box;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; padding: 14px 16px;
            color: #fff; font-size: 15px; font-family: inherit;
            outline: none; transition: all 0.2s;
        }
        .ap-auth-input:focus { 
            border-color: #fcd576; 
            background: rgba(255,255,255,0.07);
            box-shadow: 0 0 0 4px rgba(252,213,118,0.1);
        }
        .ap-auth-input::placeholder { color: #4b5563; }

        /* ── Submit button ── */
        .ap-auth-submit {
            width: 100%; padding: 15px;
            background: #fcd576; color: #1a1200;
            font-size: 16px; font-weight: 800;
            border: none; border-radius: 14px; cursor: pointer;
            transition: all 0.3s; margin-top: 10px;
            letter-spacing: 0.5px;
            box-shadow: 0 10px 20px rgba(252,213,118,0.2);
        }
        .ap-auth-submit:hover { background: #ffdf94; transform: translateY(-2px); box-shadow: 0 12px 25px rgba(252,213,118,0.3); }
        .ap-auth-submit:active { transform: translateY(0); }
        .ap-auth-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── Error/Success msg ── */
        .ap-auth-msg {
            font-size: 14px; padding: 12px 16px;
            border-radius: 10px; margin-bottom: 20px;
            display: none; font-weight: 500;
        }
        .ap-auth-msg.error   { background: rgba(239,68,68,0.15);  color: #fca5a5; display: block; border-left: 4px solid #ef4444; }
        .ap-auth-msg.success { background: rgba(16,185,129,0.15); color: #6ee7b7; display: block; border-left: 4px solid #10b981; }

        /* ── Forgot password link ── */
        .ap-auth-forgot {
            text-align: center; margin-top: 20px;
            font-size: 13px; color: #6b7280;
            cursor: pointer; transition: color 0.2s;
        }
        .ap-auth-forgot:hover { color: #fcd576; }

        /* Scroll lock for mobile */
        body.ap-modal-open {
            overflow: hidden !important;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Preload images silently in background so modal opens instantly ──
    let dynamicPosterURL = 'https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8Ez05N5cKk.jpg'; // fallback
    
    if (typeof window !== 'undefined') {
        setTimeout(async () => {
            try {
                const res = await fetch('https://ophim1.com/v1/api/quoc-gia/viet-nam');
                const data = await res.json();
                if (data?.data?.items?.length > 0) {
                    const latestMovie = data.data.items[0];
                    const url = `https://img.ophim.live/uploads/movies/${latestMovie.thumb_url || latestMovie.poster_url}`;
                    dynamicPosterURL = url;
                    const img = new Image();
                    img.src = url;
                }
            } catch(e) {}
        }, 100);
    }

    // ── Create modal ─────────────────────────────────────────────────
    function createModal(mode) {
        // Đóng các modal cũ (nếu có) trước khi tạo mới
        const oldBackdrops = document.querySelectorAll('#ap-auth-backdrop');
        oldBackdrops.forEach(b => removeModal(b));

        injectStyles();

        const randomBg = dynamicPosterURL;
        const isLogin  = mode !== 'register';

        const backdrop = document.createElement('div');
        backdrop.id = 'ap-auth-backdrop';

        backdrop.innerHTML = `
        <div id="ap-auth-modal">
            <button class="ap-auth-close" id="ap-auth-close-btn" aria-label="Đóng">✕</button>

            <div class="ap-auth-left" style="background: linear-gradient(to bottom, rgba(15,15,30,0.15) 0%, rgba(15,15,30,0.95) 100%), url('${randomBg}') center / cover no-repeat;">

                <div class="ap-auth-brand">
                    <div class="ap-auth-brand-logo">
                        <img src="/apple-touch-icon.png" alt="A Phim">
                    </div>
                    <div class="ap-auth-brand-name">A <span>Phim</span></div>
                    <div class="ap-auth-brand-tagline">Phim hay cả rổ</div>
                </div>
            </div>

            <div class="ap-auth-right">
                <h2 class="ap-auth-title">${isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
                <p class="ap-auth-subtitle">
                    ${isLogin
                        ? 'Chưa có tài khoản? <a id="ap-switch-to-register">Đăng ký ngay</a>'
                        : 'Đã có tài khoản? <a id="ap-switch-to-login">Đăng nhập</a>'
                    }
                </p>

                <div class="ap-auth-msg" id="ap-auth-msg"></div>

                <form id="ap-auth-form" autocomplete="off">
                    ${!isLogin ? `
                    <div class="ap-auth-field">
                        <label>Họ và tên</label>
                        <input class="ap-auth-input" type="text" id="ap-field-name" placeholder="Nguyễn Văn A" required>
                    </div>` : ''}

                    <div class="ap-auth-field">
                        <label>Email</label>
                        <input class="ap-auth-input" type="email" id="ap-field-email" placeholder="email@example.com" required>
                    </div>

                    ${!isLogin ? `
                    <div class="ap-auth-field">
                        <label>Số điện thoại</label>
                        <input class="ap-auth-input" type="tel" id="ap-field-phone" placeholder="0123456789">
                    </div>` : ''}

                    <div class="ap-auth-field">
                        <label>Mật khẩu</label>
                        <input class="ap-auth-input" type="password" id="ap-field-password" placeholder="••••••••" required>
                    </div>

                    ${!isLogin ? `
                    <div class="ap-auth-field">
                        <label>Xác nhận mật khẩu</label>
                        <input class="ap-auth-input" type="password" id="ap-field-confirm" placeholder="••••••••" required>
                    </div>` : ''}

                    <button class="ap-auth-submit" type="submit" id="ap-auth-submit-btn">
                        ${isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}
                    </button>
                </form>

                ${isLogin ? `<div class="ap-auth-forgot" id="ap-forgot-link">Quên mật khẩu?</div>` : ''}
            </div>
        </div>`;

        document.body.appendChild(backdrop);

        
        // Lock scroll
        document.body.classList.add("ap-modal-open");
// ── Event listeners ──────────────────────────────────────────
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) removeModal();
        });
        // Mobile: touch on backdrop
        backdrop.addEventListener('touchend', (e) => { if (e.target === backdrop) { e.preventDefault(); removeModal(); } }, { passive: false });
          backdrop.addEventListener('touchmove', (e) => { if (!e.target.closest('.ap-auth-right')) { e.preventDefault(); } }, { passive: false });

        const closeBtn2 = backdrop.querySelector('#ap-auth-close-btn');
        if (closeBtn2) {
            closeBtn2.addEventListener('click', (e) => { e.stopPropagation(); removeModal(backdrop); });
            closeBtn2.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); removeModal(backdrop); }, { passive: false });
        }

        document._apModalEsc = (e) => { if (e.key === 'Escape') removeModal(backdrop); };
        document.addEventListener('keydown', document._apModalEsc);

        const switchRegister = backdrop.querySelector('#ap-switch-to-register');
        const switchLogin    = backdrop.querySelector('#ap-switch-to-login');
        if (switchRegister) switchRegister.addEventListener('click', () => createModal('register'));
        if (switchLogin)    switchLogin.addEventListener('click', () => createModal('login'));

        setTimeout(() => {
            const firstInput = backdrop.querySelector('#ap-auth-form .ap-auth-input');
            if (firstInput) firstInput.focus();
        }, 100);

        const form = backdrop.querySelector('#ap-auth-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleSubmit(isLogin, backdrop);
            });
        }
    }

    // ── Handle submit ─────────────────────────────────────────────────
    async function handleSubmit(isLogin, backdrop) {
        const btn      = backdrop.querySelector('#ap-auth-submit-btn');
        const msgEl    = backdrop.querySelector('#ap-auth-msg');
        const email    = (backdrop.querySelector('#ap-field-email')?.value || '').trim();
        const password = backdrop.querySelector('#ap-field-password')?.value || '';

        if (!email || !password) {
            showMsg(msgEl, 'Vui lòng nhập đầy đủ thông tin', 'error'); return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = isLogin ? 'Đang đăng nhập...' : 'Đang đăng ký...';
        msgEl.className = 'ap-auth-msg';

        try {
            let result;
            if (isLogin) {
                result = await authService.login(email, password);
            } else {
                const name    = (backdrop.querySelector('#ap-field-name')?.value || '').trim();
                const phone   = (backdrop.querySelector('#ap-field-phone')?.value || '').trim();
                const confirm = backdrop.querySelector('#ap-field-confirm')?.value || '';

                if (!name) { showMsg(msgEl, 'Vui lòng nhập họ tên', 'error'); resetBtn(btn, originalText); return; }
                if (password !== confirm) { showMsg(msgEl, 'Mật khẩu xác nhận không khớp', 'error'); resetBtn(btn, originalText); return; }
                if (password.length < 6) { showMsg(msgEl, 'Mật khẩu tối thiểu 6 ký tự', 'error'); resetBtn(btn, originalText); return; }

                result = await authService.register(email, password, name, phone);
            }

            if (result.success) {
                showMsg(msgEl, isLogin ? '✅ Đăng nhập thành công!' : '✅ Đăng ký thành công!', 'success');
                setTimeout(() => {
                    removeModal(backdrop);
                    refreshCommentSection();
                    if (typeof updateUserUI === 'function') updateUserUI();
                    else if (window.userUI) window.userUI.update?.();
                    
                    if (typeof window.rebuildMobileMenu === 'function') {
                        window.rebuildMobileMenu();
                    }
                }, 800);
            } else {
                showMsg(msgEl, result.message || 'Thất bại, vui lòng thử lại', 'error');
                resetBtn(btn, originalText);
            }
        } catch (err) {
            showMsg(msgEl, 'Lỗi kết nối server', 'error');
            resetBtn(btn, originalText);
        }
    }

    function showMsg(msgEl, text, type) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.className   = 'ap-auth-msg ' + type;
    }

    function resetBtn(btn, text) {
        btn.disabled    = false;
        btn.textContent = text;
    }

    function refreshCommentSection() {
        const wrapper = document.getElementById('ap-cmt-wrapper');
        if (wrapper) wrapper.remove();
        if (typeof window._apInitComment === 'function') {
            window._apInitComment();
        } else {
            document.dispatchEvent(new CustomEvent('ap-auth-changed'));
        }
    }

    function removeModal(specificBackdrop) {
        const el = specificBackdrop || document.getElementById('ap-auth-backdrop');
        if (!el) return;
        
        el.id = 'ap-auth-backdrop-removing'; // Đổi ID để tránh conflict
        el.style.opacity = '0';
        const modal = el.querySelector('#ap-auth-modal');
        if (modal) {
            modal.id = 'ap-auth-modal-removing'; // Đổi ID luôn
            modal.style.transform = 'scale(0.9) translateY(20px)';
        }
        
        setTimeout(() => {
            el.remove();
            
            // Chỉ unlock scroll nếu không còn modal nào khác đang mở
            if (!document.getElementById('ap-auth-backdrop')) {
                document.body.classList.remove('ap-modal-open');
            }
            
            if (document._apModalEsc) {
                document.removeEventListener('keydown', document._apModalEsc);
                delete document._apModalEsc;
            }
        }, 300);
    }


    // ── Public API ────────────────────────────────────────────────────
    window.showAuthModal = function(mode) {
        // Trên trang login/register standalone: redirect thay vì mở modal
        if (_isAuthPage) {
            const page = (mode === 'register') ? 'register.html' : 'login.html';
            if (!window.location.pathname.endsWith(page)) {
                window.location.href = page;
            }
            return;
        }
        createModal(mode || 'login');
    };

    // ── Intercept ALL clicks (capture phase) ──────────────────────────
    // Không chạy trên các trang auth standalone
    if (!_isAuthPage) {
        document.addEventListener('click', function (e) {
            // Ignore if clicking inside the auth modal itself
            if (e.target.closest('#ap-auth-modal')) return;

            // 1. Check link closest
            const el = e.target.closest('a');
            if (!el) {
                // 2. Check if clicking something with "đăng nhập" text that isn't already handled
                const text = (e.target.textContent || '').toLowerCase().trim();
                if (text === 'đăng nhập' || text === 'đăng ký') {
                    // If it's a span/button without a specific handler, we can try to intercept
                    if (e.target.tagName !== 'A' && !e.target.onclick) {
                        e.preventDefault();
                        window.showAuthModal(text === 'đăng ký' ? 'register' : 'login');
                    }
                }
                return;
            }

            const href = el.getAttribute('href') || '';
            const isLogin    = href === 'login.html'    || href.startsWith('login.html?');
            const isRegister = href === 'register.html' || href.startsWith('register.html?');

            if (isLogin || isRegister) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();
                window.showAuthModal(isRegister ? 'register' : 'login');
            }
        }, { capture: true, passive: false });
    }

})();


