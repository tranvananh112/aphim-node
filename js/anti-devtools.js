/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          APHIM - ANTI DEVTOOLS PROTECTION v2.0              ║
 * ║   Bảo vệ website khỏi inspect element & console access     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ⚠️  LƯU Ý QUAN TRỌNG:
 *  - Script này KHÔNG thể chặn 100% DevTools (đây là giới hạn của browser).
 *  - Mục tiêu: Gây khó khăn tối đa cho người dùng thông thường.
 *  - Bảo mật thực sự PHẢI ở backend (không để API key / data nhạy cảm ở frontend).
 */

(function () {
    'use strict';

    // ══════════════════════════════════════════════════════
    // 0. CHỈ KÍCH HOẠT TRÊN PRODUCTION — bỏ qua localhost
    // ══════════════════════════════════════════════════════
    const _host = window.location.hostname;

    // Danh sách môi trường DEV — script sẽ TẮT hoàn toàn
    const _devHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '',           // file:// protocol
    ];

    // Nếu đang chạy local → thoát ngay, không làm gì cả
    if (_devHosts.includes(_host) || _host.startsWith('192.168.') || _host.startsWith('10.')) {
        console.log('%c[APhim Dev Mode] Anti-DevTools TẮT trên localhost ✓', 'color:#4ade80;font-weight:bold;font-size:13px;');
        return; // ← Thoát IIFE ngay lập tức
    }

    // Chỉ chạy trên production domains
    // const _allowedDomains = ['aphim.io.vn', 'www.aphim.io.vn'];
    // if (!_allowedDomains.includes(_host)) return; // Bỏ comment nếu muốn whitelist cứng

    // ══════════════════════════════════════════════════════
    // 1. XÓA TOÀN BỘ CONSOLE LOGS (che giấu thông tin)
    // ══════════════════════════════════════════════════════
    const _noop = () => {};
    ['log', 'warn', 'error', 'info', 'debug', 'table', 'dir', 'group', 'groupEnd', 'time', 'timeEnd'].forEach(method => {
        console[method] = _noop;
    });

    // ══════════════════════════════════════════════════════
    // 2. CHẶN PHÍM TẮT MỞ DEVTOOLS
    // ══════════════════════════════════════════════════════
    document.addEventListener('keydown', function (e) {
        const blockedKeys = [
            // F12
            e.key === 'F12',
            // Ctrl+Shift+I (Inspect)
            e.ctrlKey && e.shiftKey && e.key === 'I',
            // Ctrl+Shift+J (Console)
            e.ctrlKey && e.shiftKey && e.key === 'J',
            // Ctrl+Shift+C (Element picker)
            e.ctrlKey && e.shiftKey && e.key === 'C',
            // Ctrl+U (View source)
            e.ctrlKey && e.key === 'u',
            // Ctrl+S (Save page)
            e.ctrlKey && e.key === 's',
            // Ctrl+A (Select all - tránh copy source)
            // e.ctrlKey && e.key === 'a',  // Bỏ comment nếu muốn chặn
        ];

        if (blockedKeys.some(Boolean)) {
            e.preventDefault();
            e.stopPropagation();
            _showWarningToast();
            return false;
        }
    }, true);

    // ══════════════════════════════════════════════════════
    // 3. VÔ HIỆU HÓA CHUỘT PHẢI (Right-click)
    // ══════════════════════════════════════════════════════
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        _showWarningToast();
        return false;
    });

    // ══════════════════════════════════════════════════════
    // 4. PHÁT HIỆN DEVTOOLS ĐANG MỞ (Kỹ thuật đo thời gian)
    // ══════════════════════════════════════════════════════
    let _devToolsOpen = false;
    let _overlayShownThisSession = false; // Chỉ hiện 1 lần mỗi lần mở DevTools
    const _THRESHOLD = 160; // px — DevTools thường rộng hơn 160px

    function _detectDevTools() {
        // ⚠️ TẮT HOÀN TOÀN TRÊN MOBILE ĐỂ TRÁNH FALSE POSITIVE
        // Trên điện thoại (đặc biệt Safari iOS), size viewport thay đổi liên tục do address bar gây nhiễu
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
        if (isMobile) {
            // Đảm bảo ẩn overlay nếu lỡ hiện (dù hiếm)
            if (_devToolsOpen) {
                _devToolsOpen = false;
                _onDevToolsClosed();
            }
            return;
        }

        const widthThreshold  = window.outerWidth  - window.innerWidth  > _THRESHOLD;
        const heightThreshold = window.outerHeight - window.innerHeight > _THRESHOLD;

        if (widthThreshold || heightThreshold) {
            if (!_devToolsOpen) {
                _devToolsOpen = true;
                _overlayShownThisSession = false; // reset khi vừa mở lại
                _onDevToolsOpen();
            }
        } else {
            if (_devToolsOpen) {
                _devToolsOpen = false;
                _overlayShownThisSession = false; // reset khi đóng — cho phép hiện lại lần sau
                _onDevToolsClosed();
            }
        }
    }

    // ══════════════════════════════════════════════════════
    // 5. XỬ LÝ KHI DEVTOOLS MỞ / ĐÓNG
    // ══════════════════════════════════════════════════════
    let _overlayAutoHideTimer = null;
    const _OVERLAY_DISPLAY_DURATION = 3000; // ms — hiện 3 giây rồi tự ẩn

    function _onDevToolsOpen() {
        if (_overlayShownThisSession) return; // Đã hiện rồi, không hiện lại
        _overlayShownThisSession = true;

        // Hiện overlay cảnh báo
        _showDevToolsOverlay();

        // Xóa console liên tục khi đang mở
        _startConsoleCleaner();

        // Tự ẩn sau _OVERLAY_DISPLAY_DURATION ms
        clearTimeout(_overlayAutoHideTimer);
        _overlayAutoHideTimer = setTimeout(() => {
            _hideDevToolsOverlay();
        }, _OVERLAY_DISPLAY_DURATION);
    }

    function _onDevToolsClosed() {
        // Hủy timer nếu đang chờ
        clearTimeout(_overlayAutoHideTimer);
        // Ẩn overlay ngay
        _hideDevToolsOverlay();
        _stopConsoleCleaner();
    }

    // ══════════════════════════════════════════════════════
    // 6. XÓA CONSOLE LIÊN TỤC KHI DEVTOOLS ĐANG MỞ
    // ══════════════════════════════════════════════════════
    let _consoleCleanerInterval = null;

    function _startConsoleCleaner() {
        if (_consoleCleanerInterval) return;
        _consoleCleanerInterval = setInterval(() => {
            // Không thể gọi console.clear vì đã override thành noop
            // Tạm thời dùng native clear
            try { window.console.clear(); } catch(e) {}
        }, 100);
    }

    function _stopConsoleCleaner() {
        if (_consoleCleanerInterval) {
            clearInterval(_consoleCleanerInterval);
            _consoleCleanerInterval = null;
        }
    }

    // ══════════════════════════════════════════════════════
    // 7. OVERLAY CẢNH BÁO (UI khi DevTools mở)
    // Tự ẩn sau vài giây, chỉ hiện lại khi đóng/mở DevTools
    // ══════════════════════════════════════════════════════
    let _overlayEl = null;

    function _createOverlay() {
        if (_overlayEl) return;

        _overlayEl = document.createElement('div');
        _overlayEl.id = 'aphim-devtools-overlay';

        // ✅ QUAN TRỌNG: Dùng setAttribute để set style với !important
        //    Append vào <html> thay vì <body> để TRÁNH bị CSS splash loader
        //    của index.html che khuất (body > * { opacity:0 !important })
        _overlayEl.setAttribute('style', [
            'position:fixed',
            'top:0', 'left:0', 'right:0', 'bottom:0',
            'z-index:2147483647',
            'background:rgba(0,0,0,0.92)',
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'justify-content:center',
            'font-family:Segoe UI,Arial,sans-serif',
            'color:white',
            'text-align:center',
            'padding:40px',
            'backdrop-filter:blur(20px)',
            'opacity:0',
            'visibility:visible',
            'pointer-events:none',
            'transition:opacity 0.4s ease',
            'will-change:opacity'
        ].join(';'));

        _overlayEl.innerHTML = `
            <div id="_aphim_overlay_card" style="
                background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
                border:1px solid rgba(229,9,20,0.4);
                border-radius:20px;
                padding:50px 60px;
                max-width:500px;
                box-shadow:0 0 60px rgba(229,9,20,0.2),0 30px 60px rgba(0,0,0,0.5);
                transform:scale(0.9);
                transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
            ">
                <div style="font-size:72px;margin-bottom:20px;">🛡️</div>
                <h1 style="font-size:28px;font-weight:800;color:#e50914;margin:0 0 12px;letter-spacing:-0.5px;">
                    Khu Vực Được Bảo Vệ
                </h1>
                <p style="font-size:16px;color:rgba(255,255,255,0.7);margin:0 0 20px;line-height:1.6;">
                    Nội dung trang được bảo vệ.<br>
                    <strong style="color:white;">Developer Tools</strong> đã bị phát hiện.
                </p>
                <div id="_aphim_countdown" style="
                    background: rgba(229, 9, 20, 0.15);
                    border: 1px solid rgba(229, 9, 20, 0.4);
                    border-radius: 10px;
                    padding: 12px 20px;
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                    font-weight: 600;
                ">Thông báo sẽ ẩn sau 3 giây...</div>
            </div>
        `;
        document.body.appendChild(_overlayEl);
        // Force reflow trước khi animate
        void _overlayEl.offsetHeight;
    }

    function _showDevToolsOverlay() {
        // Không hiển thị cảnh báo trên trang chủ (index.html) theo yêu cầu
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/index.html')) return;

        _createOverlay();
        if (!_overlayEl) return;

        // Thêm class để CSS override splash loader cho phép hiển thị
        _overlayEl.classList.add('is-visible');
        _overlayEl.style.pointerEvents = 'auto';
        const card = document.getElementById('_aphim_overlay_card');
        if (card) card.style.transform = 'scale(1)';

        // Countdown đếm ngược
        let secs = Math.round(_OVERLAY_DISPLAY_DURATION / 1000);
        const countdownEl = document.getElementById('_aphim_countdown');
        const tick = setInterval(() => {
            secs--;
            if (countdownEl && secs > 0) {
                countdownEl.textContent = 'Th\u00f4ng b\u00e1o s\u1ebd \u1ea9n sau ' + secs + ' gi\u00e2y...';
            } else {
                clearInterval(tick);
            }
        }, 1000);
    }

    function _hideDevToolsOverlay() {
        if (!_overlayEl) return;
        // Xóa class để CSS override ẩn lại
        _overlayEl.classList.remove('is-visible');
        _overlayEl.style.pointerEvents = 'none';
        const card = document.getElementById('_aphim_overlay_card');
        if (card) card.style.transform = 'scale(0.9)';
        // Reset countdown text
        setTimeout(() => {
            const countdownEl = document.getElementById('_aphim_countdown');
            if (countdownEl) countdownEl.textContent = 'Th\u00f4ng b\u00e1o s\u1ebd \u1ea9n sau 3 gi\u00e2y...';
        }, 450);
    }

    // ══════════════════════════════════════════════════════
    // 8. TOAST CẢNH BÁO NHỎ (khi nhấn phím bị chặn)
    // ══════════════════════════════════════════════════════
    let _toastTimeout = null;
    let _toastEl = null;
    let _toastReady = false;

    function _createToast() {
        if (_toastEl) return;
        _toastEl = document.createElement('div');
        _toastEl.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(120px);
            opacity: 0;
            z-index: 2147483646;
            background: linear-gradient(135deg, #e50914, #c1121f);
            color: white;
            padding: 14px 28px;
            border-radius: 50px;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(229, 9, 20, 0.4);
            transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                        opacity 0.25s ease;
            pointer-events: none;
            white-space: nowrap;
            will-change: transform, opacity;
        `;
        _toastEl.textContent = '\uD83D\uDD12 Tính năng này bị vô hiệu hóa';
        document.body.appendChild(_toastEl);

        // Buộc browser render trạng thái ẩn trước (reflow)
        // rồi mới cho phép animation chạy
        void _toastEl.offsetHeight;
        _toastReady = true;
    }

    function _showWarningToast() {
        // Không hiển thị cảnh báo trên trang chủ (index.html) theo yêu cầu
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/index.html')) return;

        _createToast();

        clearTimeout(_toastTimeout);

        // Slide UP + fade in
        requestAnimationFrame(() => {
            _toastEl.style.transform = 'translateX(-50%) translateY(0)';
            _toastEl.style.opacity   = '1';
        });

        // Tự ẩn sau 1.2 giây — slide DOWN + fade out
        _toastTimeout = setTimeout(() => {
            _toastEl.style.transform = 'translateX(-50%) translateY(120px)';
            _toastEl.style.opacity   = '0';
        }, 1200);
    }

    // ══════════════════════════════════════════════════════
    // 9. KHỞI ĐỘNG GIÁM SÁT
    // ══════════════════════════════════════════════════════
    // Kiểm tra mỗi 500ms
    setInterval(_detectDevTools, 500);

    // Kiểm tra ngay lập tức khi load
    window.addEventListener('load', _detectDevTools);
    window.addEventListener('resize', _detectDevTools);

    // ══════════════════════════════════════════════════════
    // 10. XÓA SOURCE MAP REFERENCES (Tránh lộ code gốc)
    // ══════════════════════════════════════════════════════
    // Ghi đè Error.prepareStackTrace để ẩn stack trace
    if (Error.prepareStackTrace) {
        Error.prepareStackTrace = (err, stack) => err.toString();
    }

    // ══════════════════════════════════════════════════════
    // 11. CHẶN DRAG & DROP (kéo thả ảnh/video)
    // ══════════════════════════════════════════════════════
    document.addEventListener('dragstart', function (e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
            e.preventDefault();
        }
    });

    // ══════════════════════════════════════════════════════
    // 12. CHẶN IN TRANG (Ctrl+P)
    // ══════════════════════════════════════════════════════
    window.addEventListener('beforeprint', function (e) {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
                <div style="text-align:center;">
                    <h1 style="color:#e50914;">🔒 Không thể in trang này</h1>
                    <p>Nội dung APhim được bảo vệ bản quyền.</p>
                </div>
            </div>
        `;
    });

})(); // IIFE - tự thực thi, không leak variable ra global scope
