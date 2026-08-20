/**
 * A PHIM — Mobile Bottom Navigation Dock JS
 * SofaFlix / MB Bank style — Bottom Dock + Bottom Sheet Modal
 */
(function () {
    'use strict';

    /* ────────────────────────────────────────────
       DATA: Danh mục nội dung
    ──────────────────────────────────────────── */
    const MOVIE_TYPES = [
        { href: 'danh-sach.html?list=phim-moi', label: 'Phim Mới' },
        { href: 'danh-sach.html?list=phim-bo', label: 'Phim Bộ' },
        { href: 'danh-sach.html?list=phim-le', label: 'Phim Lẻ' },
        { href: 'danh-sach.html?list=tv-shows', label: 'TV Shows' },
        { href: 'danh-sach.html?list=hoat-hinh', label: 'Hoạt Hình' },
        { href: 'danh-sach.html?list=phim-chieu-rap', label: 'Chiếu Rạp' },
        { href: 'danh-sach.html?list=phim-vietsub', label: 'Vietsub' },
        { href: 'danh-sach.html?list=phim-thuyet-minh', label: 'Thuyết Minh' },
        { href: 'danh-sach.html?list=phim-long-tien', label: 'Lồng Tiếng' },
        { href: 'danh-sach.html?list=phim-bo-dang-chieu', label: 'Đang Chiếu' },
        { href: 'danh-sach.html?list=phim-bo-hoan-thanh', label: 'Đã Xong' },
        { href: 'danh-sach.html?list=phim-sap-chieu', label: 'Sắp Chiếu' },
    ];

    const CATEGORIES = [
        { slug: 'hanh-dong', name: 'Hành Động' }, { slug: 'tinh-cam', name: 'Tình Cảm' },
        { slug: 'hai-huoc', name: 'Hài Hước' }, { slug: 'co-trang', name: 'Cổ Trang' },
        { slug: 'tam-ly', name: 'Tâm Lý' }, { slug: 'hinh-su', name: 'Hình Sự' },
        { slug: 'chien-tranh', name: 'Chiến Tranh' }, { slug: 'vien-tuong', name: 'Viễn Tưởng' },
        { slug: 'kinh-di', name: 'Kinh Dị' }, { slug: 'vo-thuat', name: 'Võ Thuật' },
        { slug: 'than-thoai', name: 'Thần Thoại' }, { slug: 'phieu-luu', name: 'Phiêu Lưu' },
        { slug: 'khoa-hoc', name: 'Khoa Học' }, { slug: 'am-nhac', name: 'Âm Nhạc' },
        { slug: 'tai-lieu', name: 'Tài Liệu' }, { slug: 'gia-dinh', name: 'Gia Đình' },
        { slug: 'the-thao', name: 'Thể Thao' }, { slug: 'chinh-kich', name: 'Chính Kịch' },
        { slug: 'bi-an', name: 'Bí Ẩn' }, { slug: 'hoc-duong', name: 'Học Đường' },
        { slug: 'kinh-dien', name: 'Kinh Điển' }, { slug: 'short-drama', name: 'Short Drama' },
    ];

    const COUNTRIES = [
        { slug: 'viet-nam', name: 'Việt Nam', code: 'vn' },
        { slug: 'han-quoc', name: 'Hàn Quốc', code: 'kr' },
        { slug: 'trung-quoc', name: 'Trung Quốc', code: 'cn' },
        { slug: 'nhat-ban', name: 'Nhật Bản', code: 'jp' },
        { slug: 'au-my', name: 'Âu Mỹ', code: 'us' },
        { slug: 'thai-lan', name: 'Thái Lan', code: 'th' },
        { slug: 'dai-loan', name: 'Đài Loan', code: 'tw' },
        { slug: 'hong-kong', name: 'Hồng Kông', code: 'hk' },
        { slug: 'an-do', name: 'Ấn Độ', code: 'in' },
        { slug: 'anh', name: 'Anh', code: 'gb' },
        { slug: 'phap', name: 'Pháp', code: 'fr' },
        { slug: 'canada', name: 'Canada', code: 'ca' },
        { slug: 'duc', name: 'Đức', code: 'de' },
        { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ', code: 'tr' },
        { slug: 'nga', name: 'Nga', code: 'ru' },
        { slug: 'indonesia', name: 'Indonesia', code: 'id' },
        { slug: 'uc', name: 'Úc', code: 'au' },
        { slug: 'malaysia', name: 'Malaysia', code: 'my' },
        { slug: 'philippines', name: 'Philippines', code: 'ph' },
    ];

    /* ────────────────────────────────────────────
       HELPERS
    ──────────────────────────────────────────── */
    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function getCurrentUser() {
        try {
            if (typeof authService !== 'undefined') return authService.getCurrentUser();
        } catch (e) {}
        return null;
    }

    // Lấy trạng thái active hoàn toàn tự động dựa vào pathname
    function getActiveTab() {
        const path = window.location.pathname;
        
        // 1. Trang chủ
        if (path === '/' || path.includes('index.html') || path === '/index') {
            return 'home';
        }
        
        // 2. Khám phá
        if (path.includes('search.html')) {
            return 'search';
        }
        
        // 3. Lịch chiếu
        if (path.includes('lich-chieu.html')) {
            return 'calendar';
        }
        
        // 4. Tài khoản
        if ((path.includes('profile') || path.includes('login.html') || path.includes('register.html'))) {
            return 'account';
        }
        
        // 5. Thêm (Các trang xem phim, danh sách phim...)
        const morePaths = ['danh-sach.html', 'categories.html', 'filter.html', 'phim-theo-quoc-gia.html', 'chi-tiet.html', 'movie-detail.html', 'watch.html', 'phim-x.html'];
        if (morePaths.some(p => path.includes(p))) {
            return 'more';
        }
        
        // Nếu không khớp đường dẫn nào, không tab nào được active
        return '';
    }

    /* ────────────────────────────────────────────
       BUILD BOTTOM NAV DOCK
    ──────────────────────────────────────────── */
    function buildDock() {
        const active = getActiveTab();
        const existing = document.getElementById('bottom-nav-dock');
        const user = getCurrentUser();

        if (existing) {
            existing.querySelectorAll('.bn-tab').forEach(t => t.classList.remove('active'));
            ['home','search','calendar','account','more'].forEach(tab => {
                if (active === tab) document.getElementById(`bn-tab-${tab}`)?.classList.add('active');
            });
            return;
        }

        const dock = document.createElement('nav');
        dock.id = 'bottom-nav-dock';
        dock.setAttribute('aria-label', 'Điều hướng chính');

        const accountHtml = !user ? `
            <a href="profile.html" class="bn-tab ${active === 'account' ? 'active' : ''}" id="bn-tab-account" aria-label="Tài khoản"
               onclick="return handleAccountTabClick(event)">
                <span class="material-icons-round bn-tab-icon" id="bn-account-icon">person</span>
                <span class="bn-tab-label">Tài khoản</span>
            </a>
        ` : '';

        dock.innerHTML = `
            <a href="search.html" class="bn-tab ${active === 'search' ? 'active' : ''}" id="bn-tab-search" aria-label="Khám phá">
                <span class="material-icons-round bn-tab-icon">grid_view</span>
                <span class="bn-tab-label">Khám phá</span>
            </a>
            <a href="lich-chieu.html" class="bn-tab ${active === 'calendar' ? 'active' : ''}" id="bn-tab-calendar" aria-label="Lịch chiếu">
                <span class="material-icons-round bn-tab-icon">calendar_today</span>
                <span class="bn-tab-label">Lịch chiếu</span>
            </a>
            <a href="index.html" class="bn-tab bn-tab-center ${active === 'home' ? 'active' : ''}" id="bn-tab-home" aria-label="Trang chủ">
                <span class="bn-tab-icon flex items-center justify-center">
                    <dotlottie-player src="icons/home-loading.lottie" background="transparent" speed="1" style="width:24px;height:24px;" loop autoplay></dotlottie-player>
                </span>
                <span class="bn-tab-label">Trang chủ</span>
            </a>
            ${accountHtml}
            <button class="bn-tab bn-tab-more ${active === 'more' ? 'active' : ''}" id="bn-tab-more" aria-label="Thêm">
                <span class="material-icons-round bn-tab-icon">menu</span>
                <span class="bn-tab-label">Thêm</span>
            </button>
        `;

        document.body.appendChild(dock);
        document.getElementById('bn-tab-more')?.addEventListener('click', toggleSheet);
    }

    /* ────────────────────────────────────────────
       ACCOUNT TAB CLICK
    ──────────────────────────────────────────── */
    window.handleAccountTabClick = function (e) {
        const user = getCurrentUser();
        if (!user && window.showAuthModal) {
            e.preventDefault();
            window.showAuthModal('login');
            return false;
        }
        return true;
    };

    /* ────────────────────────────────────────────
       UPDATE ACCOUNT ICON
    ──────────────────────────────────────────── */
    function updateAccountIcon() {
        const user = getCurrentUser();
        const icon = document.getElementById('bn-account-icon');
        if (!icon || !user) return;
        const userId = user._id || user.id || user.email;
        const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
        const avatar = localStorage.getItem(avatarKey) || user.avatar || user.photoURL;
        if (avatar) {
            icon.outerHTML = `<img src="${esc(avatar)}" id="bn-account-icon"
                style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,215,0,0.4);"
                onerror="this.outerHTML='<span class=\\'material-icons-round bn-tab-icon\\' id=\\'bn-account-icon\\'>person</span>'"
                alt="avatar">`;
        }
    }

    /* ────────────────────────────────────────────
       BUILD BOTTOM SHEET
    ──────────────────────────────────────────── */
    function buildSheet() {
        document.getElementById('bn-sheet-overlay')?.remove();
        document.getElementById('bn-sheet')?.remove();

        const user = getCurrentUser();
        const userHref = user ? '/profile' : '#';

        const movieTypesHtml = MOVIE_TYPES.map(t =>
            `<a href="${t.href}" class="bn-sub-item">${esc(t.label)}</a>`
        ).join('');

        const categoriesHtml = CATEGORIES.map(c =>
            `<a href="categories.html?category=${c.slug}" class="bn-sub-item">${esc(c.name)}</a>`
        ).join('');

        const countriesHtml = COUNTRIES.map(c =>
            `<a href="phim-theo-quoc-gia.html?country=${c.slug}" class="bn-sub-item">
                <img src="https://flagcdn.com/16x12/${c.code}.png" alt="${c.code}" width="16" height="12" style="margin-right:6px;border-radius:2px;">
                ${esc(c.name)}
            </a>`
        ).join('');

        const authHtml = user
            ? `<div class="bn-auth-footer">
                 <button class="bn-auth-btn logout" onclick="try{authService.logout();window.location.reload()}catch(e){window.location.href='login.html'}">
                     <span class="material-icons-round" style="font-size:18px;">logout</span>Đăng xuất
                 </button>
               </div>`
            : `<div class="bn-auth-footer">
                 <a href="login.html" onclick="if(window.showAuthModal){event.preventDefault();window.closeBnSheet&&window.closeBnSheet();window.showAuthModal('login');return false;}"
                    class="bn-auth-btn login">
                     <span class="material-icons-round" style="font-size:18px;">login</span>Đăng nhập
                 </a>
               </div>`;

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'bn-sheet-overlay';
        overlay.addEventListener('click', closeSheet);
        document.body.appendChild(overlay);

        // Sheet
        const sheet = document.createElement('div');
        sheet.id = 'bn-sheet';
        sheet.innerHTML = `
            <div id="bn-sheet-handle"></div>

            <div class="bn-sheet-sf-header">
                <div class="bn-sheet-sf-title">Khám phá nhanh</div>
                <button class="bn-sheet-sf-close" id="bn-sheet-close-btn" aria-label="Đóng">
                    <span class="material-icons-round">close</span>
                </button>
            </div>

            <div id="bn-sheet-scroll">
                <!-- Quick Nav Grid 5 ô -->
                <div class="bn-sf-quick-nav">
                    <a href="index.html" class="bn-sf-quick-btn">
                        <span class="material-icons-round">home</span>
                        <span>Trang chủ</span>
                    </a>
                    <a href="danh-sach.html" class="bn-sf-quick-btn">
                        <span class="material-icons-round">view_list</span>
                        <span>Lọc phim</span>
                    </a>
                    <a href="search.html" class="bn-sf-quick-btn">
                        <span class="material-icons-round">explore</span>
                        <span>Khám phá</span>
                    </a>
                    <a href="lich-chieu.html" class="bn-sf-quick-btn">
                        <span class="material-icons-round">event_note</span>
                        <span>Lịch chiếu</span>
                    </a>
                    <a href="${esc(userHref)}" class="bn-sf-quick-btn" onclick="return handleAccountTabClick(event)">
                        <span class="material-icons-round">person_outline</span>
                        <span>Tài khoản</span>
                    </a>
                </div>

                <div class="bn-sf-menu-list">
                    <!-- Loại Phim Accordion -->
                    <div class="bn-sf-accordion">
                        <div class="bn-sf-list-item bn-sf-accordion-header" onclick="this.parentElement.classList.toggle('active')">
                            <div class="bn-sf-list-left">
                                <div class="bn-sf-icon-wrap"><span class="material-icons-round">grid_view</span></div>
                                <span>Loại Phim</span>
                            </div>
                            <span class="material-icons-round bn-sf-list-arrow">chevron_right</span>
                        </div>
                        <div class="bn-sf-accordion-body">
                            <div class="bn-sf-sub-grid">${movieTypesHtml}</div>
                        </div>
                    </div>

                    <!-- Thể Loại Accordion -->
                    <div class="bn-sf-accordion">
                        <div class="bn-sf-list-item bn-sf-accordion-header" onclick="this.parentElement.classList.toggle('active')">
                            <div class="bn-sf-list-left">
                                <div class="bn-sf-icon-wrap"><span class="material-icons-round">category</span></div>
                                <span>Thể Loại</span>
                            </div>
                            <span class="material-icons-round bn-sf-list-arrow">chevron_right</span>
                        </div>
                        <div class="bn-sf-accordion-body">
                            <div class="bn-sf-sub-grid">${categoriesHtml}</div>
                        </div>
                    </div>

                    <!-- Quốc Gia Accordion -->
                    <div class="bn-sf-accordion">
                        <div class="bn-sf-list-item bn-sf-accordion-header" onclick="this.parentElement.classList.toggle('active')">
                            <div class="bn-sf-list-left">
                                <div class="bn-sf-icon-wrap"><span class="material-icons-round">public</span></div>
                                <span>Quốc Gia</span>
                            </div>
                            <span class="material-icons-round bn-sf-list-arrow">chevron_right</span>
                        </div>
                        <div class="bn-sf-accordion-body">
                            <div class="bn-sf-sub-grid">${countriesHtml}</div>
                        </div>
                    </div>
                </div>

                <!-- VIP Banner -->
                <div class="bn-upgrade-card">
                    <div class="bn-upgrade-title">
                        <span class="material-icons-round" style="color:#FFD700;font-size:20px;">stars</span>
                        Nâng cấp trải nghiệm
                    </div>
                    <div class="bn-upgrade-desc">Xem phim không quảng cáo, chất lượng HD và tốc độ tải nhanh hơn.</div>
                    <a href="pricing.html" class="bn-upgrade-btn">NÂNG CẤP NGAY</a>
                </div>

                ${authHtml}
            </div>
        `;

        document.body.appendChild(sheet);
        document.getElementById('bn-sheet-close-btn')?.addEventListener('click', closeSheet);
        setupSheetSwipe(sheet);
    }

    /* ────────────────────────────────────────────
       SHEET OPEN / CLOSE / TOGGLE
    ──────────────────────────────────────────── */
    let _sheetBuilt = false;
    let _sheetOpen = false;

    function ensureSheetBuilt() {
        if (!_sheetBuilt) { buildSheet(); _sheetBuilt = true; }
    }

    function openSheet() {
        ensureSheetBuilt();
        requestAnimationFrame(() => {
            document.getElementById('bn-sheet-overlay')?.classList.add('open');
            document.getElementById('bn-sheet')?.classList.add('open');
            document.body.style.overflow = 'hidden';
            document.getElementById('bn-tab-more')?.classList.add('sheet-open');
            const icon = document.querySelector('#bn-tab-more .bn-tab-icon');
            if (icon) icon.textContent = 'keyboard_arrow_down';
        });
        _sheetOpen = true;
    }

    function closeSheet() {
        document.getElementById('bn-sheet-overlay')?.classList.remove('open');
        document.getElementById('bn-sheet')?.classList.remove('open');
        document.body.style.overflow = '';
        document.getElementById('bn-tab-more')?.classList.remove('sheet-open');
        const icon = document.querySelector('#bn-tab-more .bn-tab-icon');
        if (icon) icon.textContent = 'menu';
        _sheetOpen = false;
    }

    function toggleSheet() {
        if (_sheetOpen) closeSheet(); else openSheet();
    }

    window.closeBnSheet = closeSheet;
    window.openBnSheet = openSheet;

    /* ────────────────────────────────────────────
       SWIPE DOWN TO CLOSE SHEET
    ──────────────────────────────────────────── */
    function setupSheetSwipe(sheet) {
        let startY = 0, isDragging = false;
        sheet.addEventListener('touchstart', (e) => {
            const scrollEl = document.getElementById('bn-sheet-scroll');
            if (scrollEl && scrollEl.scrollTop > 0) return;
            startY = e.touches[0].clientY;
            isDragging = true;
        }, { passive: true });
        sheet.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const dy = e.touches[0].clientY - startY;
            if (dy > 0) {
                sheet.style.transform = `translateY(${dy}px)`;
                sheet.style.transition = 'none';
            }
        }, { passive: true });
        sheet.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const dy = e.changedTouches[0].clientY - startY;
            sheet.style.transition = '';
            sheet.style.transform = '';
            if (dy > 120) closeSheet();
        }, { passive: true });
    }

    /* ────────────────────────────────────────────
       KEYBOARD
    ──────────────────────────────────────────── */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _sheetOpen) closeSheet();
    });

    /* ────────────────────────────────────────────
       INIT
    ──────────────────────────────────────────── */
    function init() {
        if (window.innerWidth >= 1024) return;
        buildDock();
        updateAccountIcon();
        setTimeout(() => ensureSheetBuilt(), 600);
        
        document.addEventListener('auth:profileSynced', () => {
            if (window.rebuildBottomNav) window.rebuildBottomNav();
        });
        document.addEventListener('auth:logout', () => {
            if (window.rebuildBottomNav) window.rebuildBottomNav();
        });
        setTimeout(updateAccountIcon, 500);
        
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.rebuildBottomNav = function () {
        _sheetBuilt = false;
        document.getElementById('bottom-nav-dock')?.remove();
        document.getElementById('bn-sheet')?.remove();
        document.getElementById('bn-sheet-overlay')?.remove();
        init();
    };
})();


