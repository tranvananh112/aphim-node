/**
 * Movie Slider - Drag to Scroll + Wheel to Horizontal
 * Works on all horizontal movie sliders across the site
 * Unified: distinguishes drag/swipe vs click for both Mouse and Touch, handles mouseup outside
 */
(function() {
    'use strict';

    const DRAG_THRESHOLD = 8; // px - minimum distance to consider it a drag/swipe

    // ── DRAG & SWIPE TO SCROLL ──
    function initSliderDrag(slider) {
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let hasDragged = false;
        let lockVertical = false;

        // Quán tính (Inertia)
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let rafId = null;

        // --- MOUSE EVENTS (Desktop Drag-to-Scroll) ---
        slider.addEventListener('mousedown', function(e) {
            // Ignore if middle/right click
            if (e.button !== 0) return;

            isDown = true;
            hasDragged = false;
            lockVertical = false;
            slider.classList.add('active');

            // Tạm thời tắt cuộn mượt và snap-scroll để kéo mượt mà 1:1 theo chuột
            if (!slider.hasAttribute('data-orig-behavior')) slider.setAttribute('data-orig-behavior', slider.style.scrollBehavior); slider.style.scrollBehavior = 'auto';
            if (!slider.hasAttribute('data-orig-snap')) slider.setAttribute('data-orig-snap', slider.style.scrollSnapType); slider.style.scrollSnapType = 'none';

            startX = e.pageX - slider.offsetLeft;
            startY = e.pageY - slider.offsetTop;
            scrollLeft = slider.scrollLeft;

            // Khởi tạo tính toán quán tính
            lastX = e.pageX;
            lastTime = Date.now();
            velocity = 0;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        });

        // Global mouseup to prevent stuck drag
        window.addEventListener('mouseup', function() {
            if (!isDown) return;
            isDown = false;
            slider.classList.remove('active');
            lockVertical = false;

            // Khôi phục thuộc tính CSS ban đầu
            slider.style.scrollBehavior = slider.getAttribute('data-orig-behavior') || '';
            slider.style.scrollSnapType = slider.getAttribute('data-orig-snap') || '';

            if (hasDragged) {
                slider.setAttribute('data-dragged', 'true');
                setTimeout(function() {
                    slider.removeAttribute('data-dragged');
                }, 300);

                // Thực hiện lướt quán tính từ từ mượt mà
                if (Math.abs(velocity) > 0.1) {
                    let tempVelocity = velocity;
                    const inertiaStep = function() {
                        if (isDown) return; // Dừng lại nếu người dùng click/chạm tiếp

                        tempVelocity *= 0.93; // Hệ số ma sát (giảm dần tốc độ)
                        if (Math.abs(tempVelocity) < 0.08) return;

                        slider.scrollLeft -= tempVelocity * 12;
                        rafId = requestAnimationFrame(inertiaStep);
                    };
                    rafId = requestAnimationFrame(inertiaStep);
                }
            }
        });

        slider.addEventListener('mousemove', function(e) {
            if (!isDown) return;

            const xVal = e.pageX - slider.offsetLeft;
            const yVal = e.pageY - slider.offsetTop;
            const dx = Math.abs(xVal - startX);
            const dy = Math.abs(yVal - startY);

            // Phân biệt cuộn dọc vs kéo ngang trước khi xác nhận kéo slider
            if (!hasDragged) {
                if (dy > dx && dy > 4) {
                    // Cử chỉ cuộn dọc -> Hủy kéo slider để trang cuộn dọc tự nhiên
                    isDown = false;
                    slider.classList.remove('active');
                    slider.style.scrollBehavior = slider.getAttribute('data-orig-behavior') || '';
                    slider.style.scrollSnapType = slider.getAttribute('data-orig-snap') || '';
                    return;
                }
                if (dx >= DRAG_THRESHOLD) {
                    hasDragged = true;
                    lockVertical = true;
                } else {
                    return; // Đợi vượt ngưỡng threshold
                }
            }

            e.preventDefault(); // Chặn hành vi kéo thả ảnh/chữ mặc định của trình duyệt

            // Di chuyển slider theo tay chuột
            const walk = (xVal - startX) * 1.5;
            slider.scrollLeft = scrollLeft - walk;

            // Tính vận tốc kéo cho quán tính
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) {
                const currentX = e.pageX;
                velocity = (currentX - lastX) / dt;
                lastX = currentX;
                lastTime = now;
            }
        });

        // Prevent native image/link dragging browser behavior
        slider.addEventListener('dragstart', function(e) {
            e.preventDefault();
        });

        // --- TOUCH EVENTS (Mobile Swipe Guard) ---
        let touchStartX = 0;
        let touchStartY = 0;
        let touchHasDragged = false;

        slider.addEventListener('touchstart', function(e) {
            if (!e.touches || e.touches.length === 0) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchHasDragged = false;

            // Dừng hoạt động quán tính khi người dùng chạm vào màn hình
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }, { passive: true });

        slider.addEventListener('touchmove', function(e) {
            if (!e.touches || e.touches.length === 0 || touchHasDragged) return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);

            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                touchHasDragged = true;
            }
        }, { passive: true });

        slider.addEventListener('touchend', function() {
            if (touchHasDragged) {
                slider.setAttribute('data-dragged', 'true');
                setTimeout(function() {
                    slider.removeAttribute('data-dragged');
                }, 300);
            }
            touchHasDragged = false;
        }, { passive: true });

        // --- CLICK INTERCEPTOR (Capture Phase) ---
        slider.addEventListener('click', function(e) {
            if (slider.getAttribute('data-dragged') === 'true') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);
    }

    // ── INIT ALL SLIDERS ──
    function init() {
        // Select all horizontal sliders/scrollers
        const sliders = document.querySelectorAll('.overflow-x-auto, .snap-x, .scrollbar-hide, #heroThumbnails');

        sliders.forEach(function(slider) {
            // Skip elements that are not sliders (like small nav bars or pagination)
            if (slider.classList.contains('justify-center') || slider.tagName === 'NAV') return;
            
            if (slider.dataset.sliderInit) return;
            slider.dataset.sliderInit = 'true';

            initSliderDrag(slider);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-init after dynamic content loads
    window.refreshMovieSliders = function() {
        const sliders = document.querySelectorAll('.overflow-x-auto, .snap-x, .scrollbar-hide, #heroThumbnails');
        sliders.forEach(function(slider) {
            delete slider.dataset.sliderInit;
        });
        init();
    };
})();

