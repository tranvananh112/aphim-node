/**
 * Voice Search - UI Only Version
 * Chỉ hiển thị giao diện nút Mic cho đẹp, không chạy ngầm API.
 */
(function () {
    'use strict';

    var style = document.createElement('style');
    style.textContent = `
        .vs-nav-mic-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.7);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.18s, background 0.18s;
            margin-left: 2px;
            z-index: 100;
        }
        .vs-nav-mic-btn:hover {
            color: #f2f20d;
            background: rgba(255,255,255,0.08);
        }
        .vs-nav-mic-btn .material-icons-round {
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);

    function injectMicButtonToForm(searchForm) {
        if (!searchForm) return;
        if (searchForm.querySelector('.vs-nav-mic-btn')) return;

        // Xóa nút mic tĩnh cũ (nếu có) trên trang search/khám phá để tránh trùng 2 nút
        var oldMic = searchForm.querySelector('.sp-voice-btn');
        if (oldMic) {
            oldMic.remove();
        }

        var input = searchForm.querySelector('input[type="text"]');
        if (!input) return;

        var micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'vs-nav-mic-btn';
        micBtn.setAttribute('aria-label', 'Tìm kiếm bằng giọng nói');
        micBtn.setAttribute('title', 'Tìm kiếm bằng giọng nói');
        micBtn.innerHTML = '<span class="material-icons-round">mic</span>';

        micBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert("Tính năng tìm kiếm bằng giọng nói hiện đang được bảo trì!");
        });

        // Insert vào cuối input container (cùng hàng với input)
        input.parentNode.insertBefore(micBtn, input.nextSibling);
        
        // Cố định CSS để icon luôn nằm gọn trên thanh search
        searchForm.style.display = 'flex';
        searchForm.style.alignItems = 'center';
        if (searchForm.className && typeof searchForm.className === 'string' && searchForm.className.includes('sp-search-box')) {
            // Dành cho trang /search
            micBtn.style.marginRight = '4px';
        }
    }

    function bindAllSearchForms() {
        // Hỗ trợ tất cả các thanh search: header, trang search, mobile overlay
        var forms = document.querySelectorAll('.nav-search-v2, .sp-search-box, .mso-input-wrap');
        forms.forEach(function(f) {
            injectMicButtonToForm(f);
        });
    }

    // Bind ngay lập tức
    bindAllSearchForms();

    // Bind khi DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAllSearchForms);
    } else {
        bindAllSearchForms();
    }

    // Load lại sau khi các component đã render đầy đủ
    setTimeout(bindAllSearchForms, 500);
    setTimeout(bindAllSearchForms, 1500);
    setInterval(bindAllSearchForms, 3000);

})();
