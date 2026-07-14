/**
 * section-swipe.js v5 — Universal Snap-to-card
 *
 * Hỗ trợ TẤT CẢ loại card trong mọi container:
 *  - .action-premium-card  (BXH, Tình Cảm, Hành Động...)
 *  - .portrait-card        (Phim Việt Nam, Phim Mới...)
 *  - .anime-card           (Hoạt Hình)
 *  - .ranking-item / .sofaflix-card / bất kỳ class nào khác
 *
 * Chiến lược: lấy TẤT CẢ con trực tiếp của container (`:scope > *`)
 * thay vì tìm class cố định.
 *
 * Hành vi:
 *  - Lướt ngang trên BẤT KỲ card nào → snap sang đúng 1 card
 *  - Nhấn nhẹ (< TAP_LIMIT px) → link phim vẫn mở
 *  - Lướt dọc → trang cuộn dọc bình thường
 *  - KHÔNG gây sáng cả ô (tap-highlight đã xử lý trong CSS)
 */
(function () {
    'use strict';

    // ── Danh sách container cần xử lý ───────────────────────────────────────
    var CONTAINER_IDS = [
        'topMoviesContainer',
        'romanceContainer',
        'animationContainer',
        'actionMoviesContainer',
        'adventureContainer',
        'mythologyRankingContainer',
        'vietnamMoviesGrid',
        'comingSoonContainer',
        'latestMoviesGrid',
        'comedyContainer',
        'dramaContainer',
        'sofaflixContainer'
    ];

    // ── Cấu hình ─────────────────────────────────────────────────────────────
    var LOCK_ANGLE   = 28;   // độ: góc < 28° → lướt ngang
    var MIN_DETECT   = 8;    // px: tối thiểu để phát hiện hướng
    var SNAP_THRESH  = 30;   // px: lướt xa hơn → sang card kế
    var VEL_THRESH   = 0.25; // px/ms: velocity đủ → sang card kế dù lướt ít
    var TAP_LIMIT    = 12;   // px: dưới ngưỡng này → coi là tap, cho link mở

    // ── Lấy danh sách card con của container ────────────────────────────────
    function getCards(el) {
        // Lấy tất cả con trực tiếp có width > 0 (tránh loading spinner ẩn)
        var all = el.querySelectorAll(':scope > *');
        var result = [];
        for (var i = 0; i < all.length; i++) {
            var child = all[i];
            // Bỏ qua spinner/loading (thường không có offsetWidth)
            if (child.offsetWidth > 20) {
                result.push(child);
            }
        }
        return result;
    }

    // ── Tìm card gần nhất với vị trí scroll hiện tại ────────────────────────
    function getNearestIdx(el, cards) {
        var scroll = el.scrollLeft;
        var best = 0, bestDist = Infinity;
        for (var i = 0; i < cards.length; i++) {
            var dist = Math.abs(cards[i].offsetLeft - scroll);
            if (dist < bestDist) { bestDist = dist; best = i; }
        }
        return best;
    }

    // ── Smooth scroll đến card theo index ────────────────────────────────────
    function snapTo(el, cards, idx) {
        idx = Math.max(0, Math.min(cards.length - 1, idx));
        el.scrollTo({ left: cards[idx].offsetLeft, behavior: 'smooth' });
    }

    // ── Khởi tạo swipe cho một container ────────────────────────────────────
    function initContainer(el) {
        if (!el || el._snapInited) return;
        el._snapInited = true;

        var startX = 0, startY = 0, startTime = 0, lastX = 0;
        var startScrollLeft = 0;
        var dir = null;       // 'h' | 'v' | null
        var active = false;
        var totalDx = 0;

        var startIdx = 0;

        // TOUCHSTART
        el.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) { active = false; return; }
            var t = e.touches[0];
            startX = lastX = t.clientX;
            startY = t.clientY;
            startTime = Date.now();
            dir = null;
            active = true;
            totalDx = 0;
            
            var cards = getCards(el);
            startIdx = cards.length ? getNearestIdx(el, cards) : 0;
            
            // Lưu lại vị trí cuộn ban đầu để tracking ngón tay
            startScrollLeft = el.scrollLeft;
            
            // Giữ cho trình duyệt không dùng thao tác vuốt ngang để back/forward trang
            el.style.touchAction = 'pan-y';
        }, { passive: true });

        // TOUCHMOVE
        el.addEventListener('touchmove', function (e) {
            if (!active || e.touches.length !== 1) return;
            var t = e.touches[0];
            var dx = t.clientX - startX;
            var dy = t.clientY - startY;

            if (!dir) {
                if (Math.abs(dx) < MIN_DETECT && Math.abs(dy) < MIN_DETECT) return;
                var angle = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI);
                dir = angle < LOCK_ANGLE ? 'h' : 'v';
            }

            if (dir === 'h') {
                totalDx = Math.abs(dx);
                lastX = t.clientX;
                
                // Kéo mượt ngay tức thì theo ngón tay người dùng
                el.scrollLeft = startScrollLeft - dx;
            }
        }, { passive: true });

        // TOUCHEND
        el.addEventListener('touchend', function () {
            active = false;
            el.style.touchAction = '';
            
            if (dir !== 'h') { dir = null; return; }

            var dx = lastX - startX;
            var dt = Math.max(1, Date.now() - startTime);
            var vel = Math.abs(dx) / dt; // px/ms

            var cards = getCards(el);
            if (!cards.length) { dir = null; return; }

            var cur = getNearestIdx(el, cards);
            var target = cur;

            var shouldMove = totalDx > SNAP_THRESH || vel > VEL_THRESH;
            if (shouldMove && cur === startIdx) {
                target = dx < 0 ? cur + 1 : cur - 1;
            }

            // Gọi scrollTo(smooth) sẽ ngắt native momentum và trượt mượt về item chuẩn xác
            snapTo(el, cards, target);

            // Chặn click link nếu thực sự đã swipe (không phải tap)
            if (totalDx > TAP_LIMIT) {
                el.addEventListener('click', function blockClick(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    el.removeEventListener('click', blockClick, true);
                }, { capture: true, once: true });
            }

            dir = null;
            totalDx = 0;
        }, { passive: true });

        el.addEventListener('touchcancel', function () {
            active = false;
            el.style.touchAction = '';
            dir = null;
            totalDx = 0;
        }, { passive: true });
    }

    // ── Gắn vào tất cả container ─────────────────────────────────────────────
    function attachToAll() {
        CONTAINER_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) initContainer(el);
        });
    }

    // Chạy ngay khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachToAll);
    } else {
        attachToAll();
    }

    // Chạy lại sau khi JS async load xong data vào containers
    setTimeout(attachToAll, 1000);
    setTimeout(attachToAll, 2500);
    setTimeout(attachToAll, 5000);

    // API public
    window.sectionSwipeInit   = attachToAll;
    window.sectionSwipeInitEl = initContainer;
})();
