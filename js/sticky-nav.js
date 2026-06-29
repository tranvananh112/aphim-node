// Sticky Navigation with scroll effects
// Desktop: Always visible, only background changes
// Mobile: Auto-hide on scroll down, show on scroll up
(function () {
    const nav = document.querySelector('nav');
    if (!nav) return;

    let lastScrollTop = 0;
    let ticking = false;
    let lastWidth = window.innerWidth;
    const hideThreshold = 60;

    // Check if device is mobile/tablet
    function isMobileDevice() {
        return window.innerWidth < 1200; // lg breakpoint
    }

    function updateNavOnScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const isMobile = isMobileDevice();

        // DESKTOP: Thêm scrolled khi kéo xuống
        if (!isMobile) {
            if (scrollTop > 5) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            nav.classList.remove('nav-hidden');
            nav.classList.add('nav-visible');
        }
        // MOBILE: Auto-hide mượt mà khi scroll xuống
        else {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;

            // Ở đầu trang (nhỏ hơn 10px) - luôn hiện rõ
            if (scrollTop <= 10) {
                nav.classList.remove('scrolled', 'nav-hidden');
                nav.classList.add('nav-visible');
            }
            // Tránh hiệu ứng overscroll/bounce ở đáy màn hình làm khựng giật nav
            else if (scrollTop + clientHeight >= scrollHeight - 40) {
                // Đang ở sát đáy màn hình, giữ nguyên trạng thái nav không toggle
                lastScrollTop = scrollTop;
                ticking = false;
                return;
            }
            // Kéo xuống vượt quá ngưỡng -> ẨN
            else if (scrollTop > lastScrollTop + 15 && scrollTop > hideThreshold) {
                if (!nav.classList.contains('nav-hidden')) {
                    nav.classList.add('scrolled', 'nav-hidden');
                    nav.classList.remove('nav-visible');
                }
            }
            // Kéo lên vượt quá ngưỡng -> HIỆN
            else if (scrollTop < lastScrollTop - 20) {
                if (!nav.classList.contains('nav-visible')) {
                    nav.classList.add('scrolled', 'nav-visible');
                    nav.classList.remove('nav-hidden');
                }
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateNavOnScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    // Re-check on resize (chỉ re-check khi thay đổi chiều rộng, ví dụ xoay màn hình)
    // Tránh việc thanh địa chỉ mobile ẩn/hiện làm đổi chiều cao gây khựng giật
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            updateNavOnScroll();
        }
    }, { passive: true });

    // Initial check
    updateNavOnScroll();

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (event) {
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        if (mobileMenu && mobileMenuBtn &&
            !mobileMenu.contains(event.target) &&
            !mobileMenuBtn.contains(event.target) &&
            !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Prevent body scroll when mobile menu is open - DISABLED (now handled by mobile-menu-modern.js)
    // Removed old conflicting body.overflow logic
})();

// ── Desktop Dropdown Dim Overlay ──────────────────────────────────────────────
// Khi hover vào bất kỳ nav dropdown (Phim/Danh Sách/Thể Loại), trang mờ đi
// để menu nổi bật hơn — hiện đại như Netflix, Disney+
(function () {
    'use strict';

    function initDropdownDim() {
        // Chỉ chạy trên desktop (>= 1200px)
        if (window.innerWidth < 1200) return;

        // Tạo overlay element (1 lần)
        let overlay = document.getElementById('nav-dim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'nav-dim-overlay';
            overlay.className = 'nav-dim-overlay';
            document.body.appendChild(overlay);
        }

        const dropdowns = document.querySelectorAll('.nav-flat-dropdown');
        if (!dropdowns.length) return;

        let _dimTimer = null;

        function showDim() {
            clearTimeout(_dimTimer);
            overlay.classList.add('active');
        }

        function hideDim() {
            clearTimeout(_dimTimer);
            _dimTimer = setTimeout(() => overlay.classList.remove('active'), 80);
        }

        dropdowns.forEach(dd => {
            dd.addEventListener('mouseenter', showDim);
            dd.addEventListener('mouseleave', hideDim);
        });

        // Click overlay → ẩn ngay
        overlay.addEventListener('click', hideDim);
    }

    // Khởi tạo khi DOM sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdownDim);
    } else {
        initDropdownDim();
    }

    // Re-init khi resize (desktop ↔ mobile)
    let _resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(initDropdownDim, 200);
    }, { passive: true });
})();
