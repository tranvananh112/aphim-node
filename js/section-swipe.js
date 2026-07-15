/**
 * section-swipe.js v6 — Universal High-Performance Snap-to-card
 *
 * Hỗ trợ TẤT CẢ loại card trong mọi container:
 *  - .action-premium-card  (BXH, Tình Cảm, Hành Động...)
 *  - .portrait-card        (Phim Việt Nam, Phim Mới...)
 *  - .anime-card           (Hoạt Hình)
 *  - .interest-card        (Bạn đang quan tâm gì?)
 *  - .ranking-item / .sofaflix-card / bất kỳ class nào khác
 *
 * Chiến lược v6 Nâng cấp vượt trội:
 *  1. Không can thiệp `el.scrollLeft = ...` trong lúc ngón tay kéo (`touchmove`),
 *     để trình duyệt tận dụng tối đa GPU native touch momentum (`-webkit-overflow-scrolling: touch`).
 *  2. Tạm khóa `scroll-behavior: smooth !important` khi đang giữ ngón tay trên màn hình,
 *     ngăn xung đột giữa animation smooth của CSS và gia tốc kéo tay thực tế của người dùng.
 *  3. Tính toán tọa độ chính xác 100% bằng `getBoundingClientRect()` chuẩn theo padding container,
 *     khắc phục hoàn toàn lỗi lệch card khi container không có `position: relative`.
 *  4. Tự động quét và nhận diện TẤT CẢ các container cuộn ngang trên mọi trang
 *     cùng MutationObserver tự động gá sự kiện khi API load thêm dữ liệu mới.
 */
(function () {
    'use strict';

    // ── Danh sách container ưu tiên cần xử lý ───────────────────────────────
    var CONTAINER_IDS = [
        'heroThumbnails',
        'interestsContainer',
        'topMoviesContainer',
        'romanceContainer',
        'animationContainer',
        'tc-featured-container',
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
        var all = el.querySelectorAll(':scope > *');
        var result = [];
        for (var i = 0; i < all.length; i++) {
            var child = all[i];
            // Bỏ qua spinner/loading (thường không có offsetWidth hoặc rất nhỏ)
            if (child.offsetWidth > 20) {
                result.push(child);
            }
        }
        return result;
    }

    // ── Tính chính xác vị trí scrollLeft mục tiêu để card [idx] căn thẳng mép trái ban đầu
    function getTargetScrollLeft(el, cards, idx) {
        if (!cards || !cards.length || idx < 0 || idx >= cards.length) return el.scrollLeft;
        var elRect = el.getBoundingClientRect();
        var cardRect = cards[idx].getBoundingClientRect();
        var firstCardRect = cards[0].getBoundingClientRect();
        
        // Tính padding/margin ban đầu của card đầu tiên so với mép trái container
        var basePadding = Math.max(0, firstCardRect.left - elRect.left + el.scrollLeft);
        var target = cardRect.left - elRect.left + el.scrollLeft - basePadding;
        return Math.max(0, target);
    }

    // ── Tìm index của card gần nhất với vị trí cuộn hiện tại ────────────────────────
    function getNearestIdx(el, cards) {
        if (!cards || !cards.length) return 0;
        var currentScroll = el.scrollLeft;
        var best = 0, bestDist = Infinity;
        for (var i = 0; i < cards.length; i++) {
            var targetScroll = getTargetScrollLeft(el, cards, i);
            var dist = Math.abs(targetScroll - currentScroll);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        }
        return best;
    }

    // ── Smooth scroll đến card theo index ────────────────────────────────────
    function snapTo(el, cards, idx) {
        if (!cards || !cards.length) return;
        idx = Math.max(0, Math.min(cards.length - 1, idx));
        var targetScroll = getTargetScrollLeft(el, cards, idx);
        
        // Bật lại scroll-behavior smooth để trượt êm ái về vị trí snap
        el.style.setProperty('scroll-behavior', 'smooth', 'important');
        el.scrollTo({ left: targetScroll, behavior: 'smooth' });
        
        // Trả lại trạng thái scroll-behavior sau khi snap hoàn tất
        setTimeout(function () {
            if (!el._isSwiping) {
                el.style.removeProperty('scroll-behavior');
            }
        }, 350);
    }

    // ── Khởi tạo swipe cho một container ────────────────────────────────────
    function initContainer(el) {
        if (!el || el._snapInited) return;
        el._snapInited = true;

        var startX = 0, startY = 0, startTime = 0, lastX = 0;
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
            el._isSwiping = true;

            var cards = getCards(el);
            startIdx = cards.length ? getNearestIdx(el, cards) : 0;

            // Tắt tạm thời scroll-behavior: smooth để ngón tay kéo mượt 1:1 không bị delay bởi CSS
            el.style.setProperty('scroll-behavior', 'auto', 'important');
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
                // V6: Không gán el.scrollLeft = ... trong touchmove!
                // Trình duyệt tự động dùng hardware-accelerated momentum cuộn mượt 100% theo tay.
            }
        }, { passive: true });

        // TOUCHEND
        el.addEventListener('touchend', function () {
            if (!active) return;
            active = false;
            el._isSwiping = false;
            el.style.touchAction = '';

            if (dir !== 'h') {
                dir = null;
                el.style.removeProperty('scroll-behavior');
                return;
            }

            var dx = lastX - startX;
            var dt = Math.max(1, Date.now() - startTime);
            var vel = Math.abs(dx) / dt; // px/ms

            var cards = getCards(el);
            if (!cards.length) {
                dir = null;
                el.style.removeProperty('scroll-behavior');
                return;
            }

            var cur = getNearestIdx(el, cards);
            var target = cur;

            var shouldMove = totalDx > SNAP_THRESH || vel > VEL_THRESH;
            if (shouldMove && cur === startIdx) {
                target = dx < 0 ? cur + 1 : cur - 1;
            }

            // trượt mượt về item chuẩn xác
            snapTo(el, cards, target);

            // Chặn click link nếu thực sự đã lướt ngang (không phải tap)
            if (totalDx > TAP_LIMIT) {
                el.addEventListener('click', function blockClick(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    el.removeEventListener('click', blockClick, true);
                }, { capture: true, once: true });

                // Dọn dẹp listener chặn click sau 400ms đề phòng trường hợp click không kích hoạt
                setTimeout(function () {
                    el.removeEventListener('click', blockClick, true);
                }, 400);
            }

            dir = null;
            totalDx = 0;
        }, { passive: true });

        el.addEventListener('touchcancel', function () {
            active = false;
            el._isSwiping = false;
            el.style.touchAction = '';
            el.style.removeProperty('scroll-behavior');
            dir = null;
            totalDx = 0;
        }, { passive: true });
    }

    // ── Gắn vào tất cả container ─────────────────────────────────────────────
    function attachToAll() {
        // 1. Gắn theo danh sách ID ưu tiên
        CONTAINER_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) initContainer(el);
        });

        // 2. Tự động nhận diện TẤT CẢ các danh sách lướt ngang trên trang
        var autoContainers = document.querySelectorAll('.overflow-x-auto, .scrollbar-hide, [class*="overflow-x-auto"], #heroThumbnails, .interests-wrapper, .mobile-thumb-wrapper, .cat-tab-container, #episode-list');
        for (var i = 0; i < autoContainers.length; i++) {
            var c = autoContainers[i];
            if (!c._snapInited && (c.scrollWidth > c.clientWidth || c.children.length >= 2)) {
                initContainer(c);
            }
        }
    }

    // Chạy ngay khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachToAll);
    } else {
        attachToAll();
    }

    // Chạy lại sau khi JS async load xong data vào containers
    setTimeout(attachToAll, 800);
    setTimeout(attachToAll, 2000);
    setTimeout(attachToAll, 4500);

    // Tự động lắng nghe DOM thay đổi (khi tải phim thêm hoặc chuyển tab)
    if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function (mutations) {
            var shouldCheck = false;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                    shouldCheck = true;
                    break;
                }
            }
            if (shouldCheck) {
                attachToAll();
            }
        });
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    // API public
    window.sectionSwipeInit   = attachToAll;
    window.sectionSwipeInitEl = initContainer;
})();
