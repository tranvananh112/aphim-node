/**
 * User UI - Cập nhật nav theo trạng thái đăng nhập
 * - Đã đăng nhập: thay #authContainer bằng avatar + tên
 * - Chưa đăng nhập: KHÔNG thay gì cả, để button gốc với onclick/auth-modal.js xử lý
 */

function updateUserUI() {
    if (typeof authService === 'undefined') {
        setTimeout(updateUserUI, 150);
        return;
    }

    const user = authService.getCurrentUser();
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    if (!document.querySelector('script[src*="dotlottie-player.mjs"]')) {
        const s = document.createElement('script');
        s.src = "https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs";
        s.type = "module";
        document.head.appendChild(s);
    }

    if (user) {
        const userId = user._id || user.id || user.email;
        const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
        const savedAvatar = localStorage.getItem(avatarKey) || user.avatar || localStorage.getItem('user_avatar') || '';
        const initial = (user.name || 'U').charAt(0).toUpperCase();

        // 1. Lấy khung đang trang bị (Ưu tiên từ Object User để đồng bộ đa thiết bị)
        const frameClass = user.equippedFrameClass || localStorage.getItem('ap_frame_class') || '';

        // 2. Render Avatar với hệ thống Frame (Sử dụng trực tiếp container làm wrap)
        const avatarHtml = `
        <div class="shop-frame-wrap ${frameClass} size-sm nav-user-avatar-wrap" style="position:relative; flex-shrink:0; overflow: visible !important;">
            <img src="${savedAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; position:relative; z-index:1;" onerror="this.src='https://ui-avatars.com/api/?name=${user.name}&background=random'"/>
        </div>
    `;

        // 2.5 Render Notification Bell (Nâng cấp giao diện Premium)
        const notificationBell = `
            <div class="relative flex items-center" id="navNotificationBtn" style="cursor:pointer; z-index: 60; margin-right: 12px;">
                <div class="rounded-full hover:bg-white/10 transition-all active:scale-90 relative" style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: transparent; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);">
                    <span class="material-icons-round text-white text-[20px]">notifications</span>
                    <span id="navNotifBadge" class="absolute bg-red-500 rounded-full border-2 border-[#13131f] hidden" style="top: 8px; right: 8px; width: 10px; height: 10px;"></span>
                </div>
                
                <!-- Notification Panel (Synchronized Premium Aesthetic) -->
                <div id="navNotifPanel" class="absolute right-0 flex flex-col invisible opacity-0 translate-y-4 scale-95 transition-all duration-500 z-[999999]" 
                     style="top: 65px; width: 420px; max-height: 580px; background: rgba(13, 13, 18, 0.96); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); box-shadow: 0 0 0 1px rgba(232, 185, 79, 0.1), 0 50px 100px rgba(0,0,0,0.95); transform-origin: top right;">
                    
                    <!-- Triangle Arrow (Sleek Gold Accent - Pointed to Bell) -->
                    <div id="notifArrow" class="absolute -top-2 transform rotate-45" 
                         style="right: 135px; width: 16px; height: 16px; background: rgba(13, 13, 18, 1); border-top: 1px solid rgba(232, 185, 79, 0.3); border-left: 1px solid rgba(232, 185, 79, 0.3); z-index: 10;"></div>

                    <div class="px-7 py-6 flex items-center justify-between" 
                         style="border-bottom: 1px solid rgba(255,255,255,0.05); background: linear-gradient(to right, rgba(255,255,255,0.03), transparent);">
                        <div class="flex items-center gap-3">
                            <div class="flex flex-col">
                                <span class="font-black text-white uppercase mb-0.5" style="font-size: 14px; letter-spacing: 0.15em;">Thông báo</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="rounded-full bg-green-500 animate-pulse" style="width: 6px; height: 6px;"></span>
                                    <span class="text-white/30 font-bold uppercase" style="font-size: 9px; letter-spacing: 0.05em;">Trực tuyến</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-black font-black uppercase hidden" id="notifCountBadge" style="background: #e8b94f; font-size: 10px; box-shadow: 0 0 15px rgba(232,185,79,0.3);">0</span>
                        </div>
                        <button onclick="event.stopPropagation(); markAllNotifsRead()" class="hover:text-white transition-all duration-300 px-4 py-2 cursor-pointer font-black uppercase" 
                                style="color: #e8b94f; background: rgba(255,255,255,0.05); font-size: 10px; letter-spacing: 0.05em; border: 1px solid rgba(232,185,79,0.2); border-radius: 99px;"
                                onmouseover="this.style.background='#e8b94f'; this.style.color='#000';"
                                onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#e8b94f';">Đọc tất cả</button>
                    </div>

                    <div id="notifListContainer" class="overflow-y-auto flex-1 custom-scrollbar" style="min-height: 200px; max-height: 450px;">
                        <!-- List will be rendered by JS -->
                    </div>

                    <div class="p-5 text-center" style="border-top: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
                        <button class="transition-all duration-300 w-full cursor-pointer font-black uppercase flex items-center justify-center gap-2"
                                style="color: #6b7280; padding: 14px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; font-size: 10px; letter-spacing: 0.15em;"
                                onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#e8b94f';"
                                onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='#6b7280';">
                            Xem tất cả thông báo
                            <span class="material-icons-round" style="font-size:14px;">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Render Profile Link với style "Bọc trắng" (Pill) cực chuẩn
        const profileLink = `
            <div id="userNavProfile" class="flex items-center" style="position: relative; z-index: 50;">
                ${notificationBell}
                <div class="relative group nav-profile-dropdown" style="padding: 4px 0; overflow: visible !important;">
                    <a href="/profile" class="nav-profile-pill-v2 flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-300 group cursor-pointer" 
                       style="text-decoration:none; overflow: visible !important; position: relative;">
                        ${avatarHtml}
                        <span class="hidden md:inline text-[13px] font-bold" style="color: #000 !important; white-space:nowrap; max-width:100px; overflow:hidden; text-overflow:ellipsis;">
                            ${user.name}
                        </span>
                    </a>
                    
                    <!-- Dropdown Menu -->
                    <div class="absolute right-0 top-[100%] w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[9999] transform origin-top-right scale-95 group-hover:scale-100 bg-surface-elevated border border-white/10 rounded-xl shadow-2xl py-2 flex flex-col" style="background-color: #1a1b2e;">
                        <a href="/profile.html" class="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style="text-decoration:none;">
                            <span class="material-icons-round text-lg">person</span>
                            <span class="text-sm font-medium">Trang cá nhân</span>
                        </a>
                        <a href="/profile/goi-thanh-vien.html" class="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style="text-decoration:none;">
                            <span class="material-icons-round text-lg">card_membership</span>
                            <span class="text-sm font-medium">Gói thành viên</span>
                        </a>
                        <a href="/profile/phim-yeu-thich.html" class="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style="text-decoration:none;">
                            <span class="material-icons-round text-lg">favorite</span>
                            <span class="text-sm font-medium">Phim yêu thích</span>
                        </a>
                        <a href="/profile/lich-su-xem.html" class="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style="text-decoration:none;">
                            <span class="material-icons-round text-lg">history</span>
                            <span class="text-sm font-medium">Lịch sử xem</span>
                        </a>
                        <a href="/profile/danh-sach.html" class="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style="text-decoration:none;">
                            <span class="material-icons-round text-lg">playlist_play</span>
                            <span class="text-sm font-medium">Danh sách</span>
                        </a>
                        <div class="h-px bg-white/10 my-1"></div>
                        <button onclick="if(window.authService){authService.logout();}else{localStorage.removeItem('cinestream_user');window.location.reload();}" class="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors w-full text-left" style="background:none; border:none; cursor:pointer;">
                            <span class="material-icons-round text-lg">logout</span>
                            <span class="text-sm font-medium">Đăng xuất</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // CHIẾN THUẬT: Dọn dẹp triệt để mọi phần tử Profile cũ/lỗi để tránh nhân bản
        // 1. Xóa mọi thẻ Profile độc lập nằm ngoài container
        document.querySelectorAll('.nav-profile-dropdown, a[href="/profile"]').forEach(el => {
            if (!el.closest('#authContainer')) {
                el.remove();
            }
        });

        // 2. Cập nhật tất cả các container có ID là authContainer (phòng trường hợp trùng ID)
        const containers = document.querySelectorAll('#authContainer');
        containers.forEach(container => {
            container.style.setProperty('overflow', 'visible', 'important');
            container.innerHTML = '';
            container.insertAdjacentHTML('afterbegin', profileLink);
        });

        // 3. Sync notifications from backend
        if (typeof syncNotifications === 'function') {
            syncNotifications();
        }
    } else {
        // CHƯA ĐĂNG NHẬP: Tự động tiêm nút Đăng nhập chuẩn vào container để đồng bộ giao diện Mobile
        const loginBtnHtml = `
            <div class="flex items-center">
                <div class="relative flex items-center" style="cursor:pointer; z-index: 60; margin-right: 12px;" onclick="if(window.showAuthModal){event.preventDefault();event.stopImmediatePropagation();window.showAuthModal('login');}else{alert('Vui lòng đăng nhập để xem thông báo!');}">
                    <div class="rounded-full hover:bg-white/10 transition-all active:scale-90 relative" style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: transparent; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);">
                        <span class="material-icons-round text-white text-[20px]">notifications</span>
                    </div>
                </div>
                <a href="/login"
                   onclick="if(window.showAuthModal){event.preventDefault();event.stopImmediatePropagation();window.showAuthModal('login');return false;}"
                   class="nav-auth-btn" 
                   style="display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px;">
                    <dotlottie-player src="/icons/panda.lottie" background="transparent" speed="1" style="width: 40px; height: 40px; transform: scale(2.2); margin: 0; padding: 0;" loop autoplay></dotlottie-player>
                    <span class="auth-btn-text">Đăng Nhập</span>
                </a>
            </div>
        `;
        const containers = document.querySelectorAll('#authContainer');
        containers.forEach(container => {
            container.style.setProperty('overflow', 'visible', 'important');
            container.innerHTML = loginBtnHtml;
        });
    }
}

// Khởi chạy
document.addEventListener('DOMContentLoaded', updateUserUI);
setTimeout(updateUserUI, 300);

// Export để các script khác gọi sau khi login/logout
window.updateUserUI = updateUserUI;

// ── PREMIUM NOTIFICATION SYSTEM (GLOBAL) ──────────────────────────
const TOAST_ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    coin: `<svg viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/></svg>`
};

(function injectToastCSS() {
    if (document.getElementById('ap-global-toast-css')) return;
    const s = document.createElement('style');
    s.id = 'ap-global-toast-css';
    s.textContent = `
        #ap-toast-stack {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            width: 330px;
            max-width: 85vw;
        }
        .ap-toast {
            pointer-events: all;
            position: relative;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 18px;
            border-radius: 16px;
            background: rgba(13, 13, 17, 0.75);
            backdrop-filter: blur(20px) saturate(200%);
            -webkit-backdrop-filter: blur(20px) saturate(200%);
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.5), 
                        inset 0 1px 1px rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            transform: translateX(140%);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
        }
        .ap-toast::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 3px; height: 100%;
            background: var(--accent-color, #6366f1);
            border-radius: 0 3px 3px 0;
        }
        .ap-toast.show { transform: translateX(0); opacity: 1; }
        
        .ap-toast-icon-wrap {
            width: 36px; height: 36px; flex-shrink: 0;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--accent-color);
        }
        .ap-toast-icon-wrap svg { width: 20px; height: 20px; }
        
        .ap-toast-content { flex: 1; display: flex; flex-direction: column; gap: 2px; justify-content: center; min-width: 0; }
        .ap-toast-title { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; letter-spacing: 0.8px; }
        .ap-toast-body { 
            font-size: 13.5px; 
            color: rgba(255,255,255,0.95); 
            font-weight: 600; 
            line-height: 1.35; 
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden; 
        }

        .ap-toast-success { --accent-color: #10b981; }
        .ap-toast-success .ap-toast-icon-wrap { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.1); }
        
        .ap-toast-error { --accent-color: #ef4444; }
        .ap-toast-error .ap-toast-icon-wrap { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.1); }
        
        .ap-toast-warning { --accent-color: #f59e0b; }
        .ap-toast-warning .ap-toast-icon-wrap { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.1); }
        
        .ap-toast-info { --accent-color: #3b82f6; }
        .ap-toast-info .ap-toast-icon-wrap { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.1); }
        
        .ap-toast-coin-change {
            --accent-color: #f59e0b;
            background: linear-gradient(135deg, rgba(15, 15, 22, 0.8), rgba(25, 20, 15, 0.8));
            border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .coin-diff { 
            font-family: 'Space Grotesk', sans-serif; 
            font-weight: 800; 
            font-size: 17px; 
            margin-left: auto;
            display: flex;
            align-items: baseline;
            gap: 2px;
            flex-shrink: 0;
        }
        .coin-diff.plus { color: #10b981; text-shadow: 0 0 12px rgba(16, 185, 129, 0.3); }
        .coin-diff.minus { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
        
        @keyframes toast-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .ap-toast-shake { animation: toast-shake 0.3s cubic-bezier(.36,.07,.19,.97) 2; }

        /* Notification Bell & Panel */
        .notif-bell-shake { animation: bell-shake 0.5s ease-in-out infinite; }
        @keyframes bell-shake {
            0%, 100% { transform: rotate(0); }
            20%, 60% { transform: rotate(15deg); }
            40%, 80% { transform: rotate(-15deg); }
        }
        
        .notif-item {
            padding: 18px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            background: transparent;
        }
        .notif-item:hover { 
            background: linear-gradient(90deg, rgba(232,185,79,0.04), transparent);
            transform: translateX(4px);
        }
        .notif-item.unread { 
            background: rgba(232,185,79,0.02);
        }
        .notif-item.unread::after {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
            background: #e8b94f;
            box-shadow: 0 0 10px rgba(232,185,79,0.4);
        }
        .notif-item.unread::before {
            content: '';
            position: absolute;
            right: 20px; top: 22px;
            width: 6px; height: 6px;
            background: #e8b94f;
            border-radius: 50%;
            box-shadow: 0 0 8px #e8b94f;
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* Confirm Modal Style */
        .ap-confirm-overlay {
            position: fixed; inset: 0; z-index: 100001;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        .ap-confirm-box {
            background: #16161e; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; width: 100%; max-width: 400px; padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            transform: scale(0.9); animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { to { transform: scale(1); } }

        /* Profile Pill Styles with Mobile Override */
        .nav-profile-pill-v2 {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        @media (max-width: 1024px) {
            .nav-profile-pill-v2 {
                background: transparent !important;
                padding: 0 !important;
                gap: 0 !important;
                box-shadow: none !important;
            }
            /* Push Notification Panel lower on Mobile */
            #navNotifPanel {
                position: fixed !important;
                top: 75px !important;
                left: 16px !important;
                right: 16px !important;
                width: auto !important;
                max-width: none !important;
                transform: translateY(16px) !important;
                z-index: 1000000 !important;
            }
            #navNotifPanel.visible {
                transform: translateY(0) !important;
            }
            #notifArrow {
                display: none !important;
            }
        }

        /* ── MOBILE: Ẩn chữ "Đăng Nhập", chỉ hiện icon → tiết kiệm diện tích ── */
        @media (max-width: 768px) {
            .auth-btn-text {
                display: none !important;
            }
            .nav-auth-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                width: 40px !important;
                height: 40px !important;
                min-width: unset !important;
                gap: 0 !important;
                position: relative !important;
                background: transparent !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 50% !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
            }
            .nav-auth-btn .material-icons-round,
            .nav-auth-btn dotlottie-player {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) scale(1.85) !important;
                margin: 0 !important;
            }
            .nav-auth-btn .material-icons-round {
                font-size: 1.25rem !important;
                line-height: 1 !important;
                color: #eab308 !important;
            }
        }
    `;
    document.head.appendChild(s);
})();

function getToastStack() {
    let stack = document.getElementById('ap-toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'ap-toast-stack';
        document.body.appendChild(stack);
    }
    return stack;
}

window.showMessage = function (message, type = 'info', duration = 4000) {
    const stack = getToastStack();
    const toast = document.createElement('div');
    toast.className = `ap-toast ap-toast-${type}`;

    const titleLabels = { success: 'Thành Công', error: 'Lỗi Hệ Thống', warning: 'Cảnh Báo', info: 'Thông Báo' };

    toast.innerHTML = `
        <div class="ap-toast-icon-wrap">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
        <div class="ap-toast-content">
            <div class="ap-toast-title">${titleLabels[type] || 'Thông Báo'}</div>
            <div class="ap-toast-body">${message}</div>
        </div>
    `;
    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const hide = () => {
        toast.classList.remove('show');
        toast.style.transform = 'translateX(150%) scale(0.9)';
        setTimeout(() => toast.remove(), 600);
    };
    setTimeout(hide, duration);
    toast.onclick = hide;
};

window.showCoinChange = function (amount, reason = 'Giao dịch thành công') {
    const stack = getToastStack();
    const isPlus = amount > 0;
    const diffText = isPlus ? `+${amount.toLocaleString('vi-VN')}` : `${amount.toLocaleString('vi-VN')}`;

    const toast = document.createElement('div');
    toast.className = `ap-toast ap-toast-coin-change ${!isPlus ? 'ap-toast-shake' : ''}`;
    toast.innerHTML = `
        <div class="ap-toast-icon-wrap">${TOAST_ICONS.coin}</div>
        <div class="ap-toast-content">
            <div class="ap-toast-title">Biến Động Số Dư</div>
            <div class="ap-toast-body" style="color: rgba(255,255,255,0.7); font-size:13px;">${reason}</div>
        </div>
        <div class="coin-diff ${isPlus ? 'plus' : 'minus'}">
            ${diffText} 
            <span style="font-size: 11px; opacity: 0.7; font-weight:700; letter-spacing:0.5px;">XU</span>
        </div>
    `;

    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const hide = () => {
        toast.classList.remove('show');
        toast.style.transform = 'translateX(150%) scale(0.9)';
        setTimeout(() => toast.remove(), 600);
    };
    setTimeout(hide, 6000); // slightly longer to read amounts
    toast.onclick = hide;
};

window.showConfirm = function (title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'ap-confirm-overlay';
        overlay.innerHTML = `
            <div class="ap-confirm-box">
                <h3 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:12px;">${title}</h3>
                <p style="font-size:15px; color:rgba(255,255,255,0.6); line-height:1.6; margin-bottom:24px;">${message}</p>
                <div style="display:flex; gap:12px;">
                    <button id="confirm-cancel" style="flex:1; padding:12px; background:rgba(255,255,255,0.05); border:none; border-radius:12px; color:#fff; font-weight:700; cursor:pointer;">Hủy</button>
                    <button id="confirm-ok" style="flex:1; padding:12px; background:#eab308; border:none; border-radius:12px; color:#000; font-weight:800; cursor:pointer;">Xác nhận</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    });
};

// ── NOTIFICATION SERVICE ──────────────────────────────────────────
window.syncNotifications = async function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) {
        console.log('⏭️ Skip syncNotifications - not logged in');
        return;
    }

    const token = localStorage.getItem('cinestream_token');
    if (!token) {
        console.log('⏭️ Skip syncNotifications - no token');
        return;
    }

    const userId = user._id || user.id;

    try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Handle 401 - token expired
        if (response.status === 401) {
            console.warn('⚠️ Notifications 401 - token expired');
            return;
        }

        const data = await response.json();
        if (data.success) {
            localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(data.data));
            renderNotifications();
            updateNotifBadge();

            // 🚀 DELIVER PENDING UNREAD TOASTS (User returned to site)
            // Filter unread, sort oldest-to-newest to queue properly
            const unread = (data.data || []).filter(n => !n.isRead && !n.read).reverse();
            let toastCount = 0;

            unread.forEach((n) => {
                const notifId = n._id || n.id;
                if (!notifId) return;

                const toastKey = `ap_toast_seen_${notifId}`;
                // Check local delivery guard to prevent duplicate spamming on every F5 refresh
                if (!localStorage.getItem(toastKey) && toastCount < 2) {
                    toastCount++;

                    setTimeout(() => {
                        if (n.type === 'coin' || n.type === 'success') {
                            let msg = n.message || '';
                            let reason = 'Giao dịch thành công';

                            // Attempt intelligent string extraction from backend format: 
                            // "[+1.000 Xu] Bạn vừa nhận... \nNội dung: Admin nap"
                            if (msg.includes('\nNội dung:')) {
                                const parts = msg.split('\nNội dung:');
                                // Reason is the second part, keep it clean
                                reason = parts[1].trim() || 'Biến động tài khoản';
                            } else if (n.title) {
                                reason = n.title;
                            }

                            // Highly resilient REGEX search for numeric currency pattern (+/- then digit)
                            const numMatch = msg.match(/([+-]?[\d\.,]+)\s*Xu/i);
                            if (numMatch && typeof showCoinChange === 'function') {
                                // Clean numeric separators (. or ,) to parse int
                                const valStr = numMatch[1].replace(/\./g, '').replace(/,/g, '');
                                const val = parseInt(valStr, 10);
                                if (!isNaN(val)) {
                                    showCoinChange(val, reason);
                                } else {
                                    showMessage(n.message, n.type);
                                }
                            } else {
                                showMessage(n.message, n.type);
                            }
                        } else {
                            // Standard push for info / other types
                            showMessage(n.message, n.type === 'promotion' ? 'success' : 'info');
                        }
                        // Lock the delivery so it never repeats
                        localStorage.setItem(toastKey, 'true');
                    }, 1500 + (toastCount * 2000)); // Delayed stagger to prevent collision lag
                }
            });
        }
    } catch (e) {
        console.warn('Silent fail: could not sync notifications', e);
    }
};

window.getNotifications = function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return [];
    const userId = user._id || user.id;
    return JSON.parse(localStorage.getItem(`ap_notifs_${userId}`) || '[]');
};

window.addNotification = function (title, message, type = 'admin') {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;
    const userId = user._id || user.id;
    const notifs = getNotifications();

    const newNotif = {
        id: Date.now().toString(),
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        read: false
    };

    notifs.unshift(newNotif);
    localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs.slice(0, 50))); // Keep last 50

    renderNotifications();
    updateNotifBadge();

    // Shake bell for attention
    const bell = document.querySelector('#navNotificationBtn .material-icons-round');
    if (bell) {
        bell.classList.add('notif-bell-shake');
        setTimeout(() => bell.classList.remove('notif-bell-shake'), 3000);
    }
};

window.renderNotifications = function () {
    const container = document.getElementById('notifListContainer');
    if (!container) return;

    const notifs = getNotifications();
    if (notifs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-28 px-4 text-center">
                <div class="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 border border-white/5">
                    <span class="material-icons-round" style="font-size:32px; color:rgba(255,255,255,0.1);">notifications_off</span>
                </div>
                <p style="font-size:15px; color:rgba(255,255,255,0.3); font-weight: 700; margin:0; letter-spacing: 1px; uppercase">Hộp thư trống</p>
                <p style="font-size:12px; color:rgba(255,255,255,0.15); margin-top:8px;">Chúng tôi sẽ thông báo khi có tin mới</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifs.map(n => {
        const isUnread = !n.isRead && !n.read;
        const iconColor = n.type === 'coin' || n.type === 'success' ? '#e8b94f' : '#a78bfa';
        const iconBg = n.type === 'coin' || n.type === 'success' ? 'rgba(232, 185, 79, 0.1)' : 'rgba(167, 139, 250, 0.1)';
        const iconName = n.type === 'coin' || n.type === 'success' ? 'toll' : 'auto_awesome';
        const notifId = n._id || n.id;

        return `
            <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="event.stopPropagation(); toggleNotif('${notifId}', this)" style="cursor: pointer; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease;">
                <div class="flex gap-5 items-start">
                    <div class="flex items-center justify-center flex-shrink-0 transition-all duration-500" 
                         style="width: 48px; height: 48px; border-radius: 16px; background: ${iconBg}; border: 1px solid ${iconColor}20; box-shadow: 0 8px 20px -5px ${iconColor}30;">
                        <span class="material-icons-round" style="font-size:24px; color:${iconColor};">${iconName}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="font-black text-white truncate pr-4" style="font-size: 14px; letter-spacing: -0.01em;">${n.title}</span>
                            <span class="text-white/20 font-bold whitespace-nowrap" style="font-size: 10px;">${formatRelativeNotifTime(n.createdAt)}</span>
                        </div>
                        <p class="notif-msg text-white/40 leading-relaxed line-clamp-2 font-medium" style="font-size: 13px; transition: color 0.3s ease; white-space: pre-line;">${n.message}</p>
                        <div class="notif-expand-btn text-[#e8b94f] mt-2 opacity-80 hover:opacity-100" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.3s ease;">Xem chi tiết</div>
                    </div>
                </div>
                ${isUnread ? '<div class="absolute rounded-full notif-unread-dot" style="right: 24px; bottom: 24px; width: 6px; height: 6px; background: #e8b94f; box-shadow: 0 0 10px #e8b94f;"></div>' : ''}
            </div>
        `;
    }).join('');
};

window.updateNotifBadge = function () {
    const badge = document.getElementById('navNotifBadge');
    const panelBadge = document.getElementById('notifCountBadge');
    if (!badge) return;

    const unreadCount = getNotifications().filter(n => !n.isRead && !n.read).length;
    if (unreadCount > 0) {
        badge.classList.remove('hidden');
        badge.style.display = 'block';
        if (panelBadge) {
            panelBadge.textContent = `${unreadCount} Mới`;
            panelBadge.classList.remove('hidden');
        }
    } else {
        badge.classList.add('hidden');
        badge.style.display = 'none';
        if (panelBadge) {
            panelBadge.classList.add('hidden');
        }
    }
};

window.markNotifRead = function (id) {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;
    const userId = user._id || user.id;
    const notifs = getNotifications();
    const idx = notifs.findIndex(n => n.id === id);
    if (idx !== -1) {
        notifs[idx].read = true;
        localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
        renderNotifications();
        updateNotifBadge();
    }
};

window.toggleNotif = async function (id, element) {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;

    // 1. Mark as read in storage & Backend
    const userId = user._id || user.id;
    const notifs = getNotifications();
    const idx = notifs.findIndex(n => (n._id === id || n.id === id));

    if (idx !== -1 && !notifs[idx].isRead && !notifs[idx].read) {
        notifs[idx].isRead = true;
        notifs[idx].read = true;
        localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
        updateNotifBadge();

        // Async sync to backend
        const token = localStorage.getItem('cinestream_token');
        if (token && id.length > 15) { // Only sync if it looks like a MongoID
            fetch(`${API_CONFIG.BACKEND_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => { });
        }
    }

    // 2. Update UI manually without re-rendering everything
    element.classList.remove('unread');
    const unreadDot = element.querySelector('.notif-unread-dot');
    if (unreadDot) unreadDot.remove();

    // 3. Toggle expand
    const msg = element.querySelector('.notif-msg');
    const expandBtn = element.querySelector('.notif-expand-btn');
    if (msg) {
        const isClamped = msg.classList.contains('line-clamp-2');
        if (isClamped) {
            msg.classList.remove('line-clamp-2');
            msg.style.color = 'rgba(255,255,255,0.9)';
            element.style.backgroundColor = 'rgba(255,255,255,0.03)';
            if (expandBtn) expandBtn.textContent = 'Thu gọn';
        } else {
            msg.classList.add('line-clamp-2');
            msg.style.color = 'rgba(255,255,255,0.4)';
            element.style.backgroundColor = 'transparent';
            if (expandBtn) expandBtn.textContent = 'Xem chi tiết';
        }
    }
};

window.markAllNotifsRead = async function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;
    const userId = user._id || user.id;
    const notifs = getNotifications();
    notifs.forEach(n => {
        n.isRead = true;
        n.read = true;
    });
    localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
    renderNotifications();
    updateNotifBadge();

    // Sync to backend
    const token = localStorage.getItem('cinestream_token');
    if (token) {
        fetch(`${API_CONFIG.BACKEND_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { });
    }
};

function formatRelativeNotifTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}

// Toggle panel logic
document.addEventListener('click', (e) => {
    const btn = document.getElementById('navNotificationBtn');
    const panel = document.getElementById('navNotifPanel');
    if (!btn || !panel) return;

    if (btn.contains(e.target)) {
        const isVisible = !panel.classList.contains('invisible');
        if (isVisible) {
            panel.classList.add('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
            panel.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
        } else {
            panel.classList.remove('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
            panel.classList.add('opacity-100', 'translate-y-0', 'scale-100');
            renderNotifications();
        }
    } else if (!panel.contains(e.target)) {
        panel.classList.add('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
        panel.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    }
});

// Initial badge update
setTimeout(updateNotifBadge, 1500);


