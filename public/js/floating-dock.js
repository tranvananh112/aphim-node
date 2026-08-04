/* ==========================================================================
   A PHIM — Floating Side Dock JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const dockGroup = document.getElementById('fdDockGroup');
    const handle = document.getElementById('fdHandle');
    const btnClose = document.getElementById('fdBtnClose');
    const btnChat = document.getElementById('fdBtnChat');
    const btnTop = document.getElementById('fdBtnTop');

    // 1. Expand / Collapse Dock
    if (handle && dockGroup && btnClose) {
        handle.addEventListener('click', () => {
            dockGroup.classList.add('expanded');
        });

        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            dockGroup.classList.remove('expanded');
        });
        
        // Bấm ra ngoài để đóng dock
        document.addEventListener('click', (e) => {
            if (dockGroup.classList.contains('expanded') && !dockGroup.contains(e.target)) {
                dockGroup.classList.remove('expanded');
            }
        });
    }

    // 2. Open Chat Window
    if (btnChat) {
        btnChat.addEventListener('click', (e) => {
            e.stopPropagation();
            dockGroup.classList.remove('expanded');
            
            // Tìm nút chat gốc để trigger click (dùng logic có sẵn của chat-room.js)
            const oldChatFab = document.getElementById('chatFab');
            if (oldChatFab) {
                oldChatFab.click();
            } else {
                // Thử tìm chatWindow và mở trực tiếp nếu không tìm thấy chatFab
                const chatWindow = document.getElementById('chatWindow');
                if (chatWindow && typeof chatWindow.classList !== 'undefined') {
                    chatWindow.classList.add('active');
                    chatWindow.classList.remove('minimized');
                }
            }
        });
    }

    // 3. Scroll to Top Logic
    if (btnTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btnTop.classList.add('show');
            } else {
                btnTop.classList.remove('show');
            }
        });

        btnTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});


