/**
 * Master Data for System Inventory (Mirrored from profile-shop.js)
 * Used to populate dynamic admin gifting options
 */
const MASTER_SHOP_DATA = {
    frames: [
        { id: 'vien_don',   name: 'Neon Hồng (Nữ)',     rarity: 'common' },
        { id: 'dut_doan',   name: 'Loading Blue',        rarity: 'common' },
        { id: 'vien_kep',   name: 'Double Glow',         rarity: 'common' },
        { id: 'hao_quang',  name: 'Hào quang',           rarity: 'rare'   },
        { id: 'neon',       name: 'Đèn Neon',            rarity: 'rare'   },
        { id: 'film',       name: 'Film Cổ Điển',        rarity: 'rare'   },
        { id: 'vhs',        name: 'VHS Retro',           rarity: 'rare'   },
        { id: 'gradient',   name: 'Gradient Dreams',     rarity: 'rare'   },
        { id: 'trai_tim',   name: 'Trái Tim Tình Yêu',   rarity: 'epic'   },
        { id: 'tai_tho',    name: 'Tai Thỏ Siêu Cấp',   rarity: 'epic'   },
        { id: 'canh_than',  name: 'Cánh Thiên Thần',     rarity: 'epic'   },
        { id: 'sung_quy',   name: 'Sừng Quỷ Satan',      rarity: 'epic'   },
        { id: 'ech_xanh',   name: 'Ếch Xanh',            rarity: 'epic'   },
        { id: 'meo_hong',   name: 'Mèo Hồng',            rarity: 'epic'   },
        { id: 'rotate',     name: 'Quay Tròn',           rarity: 'epic'   },
        { id: 'lap_lanh',   name: 'Lấp Lánh',            rarity: 'legendary' },
        { id: 'hologram',   name: 'Hologram',            rarity: 'legendary' },
        { id: 'hoang_gia',  name: 'Hoàng Gia',           rarity: 'legendary' },
        { id: 'vang_oscar', name: 'Vàng Oscar',          rarity: 'legendary' },
        { id: 'rong_bay',   name: 'Rồng Bay',            rarity: 'legendary' },
        { id: 'fire',       name: 'Ngọn Lửa Thiêng',     rarity: 'mythic' },
        { id: 'ice',        name: 'Băng Giá Vĩnh Cửu',   rarity: 'mythic' },
        { id: 'sakura',     name: 'Hoa Anh Đào',         rarity: 'mythic' },
        { id: 'cyber',      name: 'Cyberpunk 2077',      rarity: 'mythic' },
        { id: 'galaxy',     name: 'Galaxy Nebula',       rarity: 'mythic' },
        { id: 'phoenix',    name: 'Phoenix Fire',        rarity: 'mythic' },
        { id: 'diamond',    name: 'Diamond Shine',       rarity: 'mythic' },
        { id: 'dragon_v2',  name: 'Rồng Vàng Thần Thoại', rarity: 'mythic' },
        { id: 'king_crown', name: 'Vương Miện King',     rarity: 'mythic' }
    ],
    banners: [
        { id: 'b2', name: 'Thành Phố Đêm',   rarity: 'common' },
        { id: 'b3', name: 'Rạp Chiếu Phim',  rarity: 'common' },
        { id: 'b4', name: 'Neon Cyberpunk',   rarity: 'rare'   },
        { id: 'b5', name: 'Abstract Art',     rarity: 'rare'   },
        { id: 'b6', name: 'Galaxy Stars',     rarity: 'epic'   },
        { id: 'b7', name: 'Deep Space',       rarity: 'epic'   },
        { id: 'b8', name: 'Legendary Sun',    rarity: 'legendary' },
        { id: 'b9', name: 'Dragon Realm',     rarity: 'legendary' }
    ]
};

// Admin Users Management - Real-time MongoDB Connection (Fixed for Tracking Prevention)
// Auto-detect environment
const API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
    ? API_CONFIG.BACKEND_URL 
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://a-phim-production-fb41.up.railway.app/api');
let currentPage = 1;
let itemsPerPage = 50;
let allUsers = [];
let filteredUsers = [];
let selectedUsers = [];
let autoRefreshInterval = null;

// Filters
let filters = {
    search: '',
    plan: '',
    status: ''
};

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Users Console Library loaded');
    checkAdminAuth();
    
    // Only bootstrap dashboard features if the users table container is actually present!
    if (document.getElementById('usersTableBody')) {
        console.log('🎯 Targeting Users Dashboard initialization...');
        loadUsers();
        setupEventListeners();
        startAutoRefresh();
    } else if (document.getElementById('subsBody')) {
        console.log('🎯 Targeting Subscriptions Dashboard initialization...');
        startAutoRefresh(); // Let subscriptions.html do its own loadSubscriptions on DOMContentLoaded
    } else {
        console.log('ℹ️ Script loaded as standalone utility library (No local users table detected)');
    }
});

// Get token with fallback for tracking prevention
function getAdminToken() {
    // Try sessionStorage first (less likely to be blocked)
    try {
        const token = sessionStorage.getItem('cinestream_admin_token');
        if (token) {
            console.log('✅ Token found in sessionStorage');
            return token;
        }
    } catch (e) {
        console.warn('SessionStorage blocked:', e);
    }

    // Try localStorage
    try {
        const token = localStorage.getItem('cinestream_admin_token');
        if (token) {
            console.log('✅ Token found in localStorage');
            // Save to sessionStorage for next time
            try {
                sessionStorage.setItem('cinestream_admin_token', token);
            } catch (e) { }
            return token;
        }
    } catch (e) {
        console.warn('LocalStorage blocked:', e);
    }

    console.warn('❌ No token found');
    return null;
}

// Save token with fallback
function saveAdminToken(token) {
    try {
        sessionStorage.setItem('cinestream_admin_token', token);
        console.log('✅ Token saved to sessionStorage');
    } catch (e) {
        console.warn('SessionStorage blocked');
    }

    try {
        localStorage.setItem('cinestream_admin_token', token);
        console.log('✅ Token saved to localStorage');
    } catch (e) {
        console.warn('LocalStorage blocked');
    }
}

// Check admin authentication
function checkAdminAuth() {
    const token = getAdminToken();
    if (!token) {
        console.warn('⚠️ No admin token found, redirecting to login...');
        showToast('Vui lòng đăng nhập', 'error');
        setTimeout(() => {
            window.location.href = '/admin/login.html';
        }, 2000);
        return false;
    }
    console.log('✅ Admin authenticated');
    return true;
}

// Start auto refresh
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        // SAFETY GUARD: Never disrupt DOM if admin is actively working in a modal
        if (document.getElementById('modal') || document.getElementById('inventoryOverlay') || document.getElementById('analyticsModalOverlay')) {
            console.log('⏸️ Auto-refresh paused while Modal is active.');
            return;
        }

        console.log('🔄 Auto-refreshing data siliently...');
        if (document.getElementById('usersTableBody')) {
            loadUsers(true);
        } else if (typeof loadSubscriptions === 'function') {
            loadSubscriptions(true); // Pass true to prevent UI wipe!
        }
    }, 30000);
}

// Stop auto refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Load all users from MongoDB via API
async function loadUsers(silent = false) {
    if (!silent) {
        showLoadingState();
        console.log('📡 Loading users from MongoDB...');
    }

    const token = getAdminToken();
    if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        setTimeout(() => {
            window.location.href = '/admin/login.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('❌ Unauthorized - Token invalid');
                // Clear tokens with correct keys
                try { sessionStorage.removeItem('cinestream_admin_token'); } catch (e) { }
                try { localStorage.removeItem('cinestream_admin_token'); } catch (e) { }

                showToast('Token không hợp lệ. Đang chuyển đến trang đăng nhập...', 'error');
                setTimeout(() => {
                    window.location.href = '/admin/login.html';
                }, 2000);
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 API Response:', data);

        if (data.success) {
            // Transform MongoDB data to frontend format
            allUsers = data.data.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
                subscription: user.subscription || { plan: 'FREE' },
                status: user.isBlocked ? 'blocked' : 'active',
                isActive: user.isActive,
                isBlocked: user.isBlocked,
                createdAt: user.createdAt,
                lastActive: user.lastLogin || user.updatedAt,
                role: user.role,
                coins: user.coins || 0
            }));

            updateStats();
            
            // PRESERVE USER FILTERS: Re-apply current filters instead of blindly resetting the array
            applyFilters(); 
            // renderUsers() is already called inside applyFilters()

            const message = `✅ Đã tải ${allUsers.length} người dùng từ MongoDB`;
            console.log(message);
            if (!silent) {
                showToast(message, 'success');
            }
        } else {
            throw new Error(data.message || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error('❌ Error loading users from MongoDB:', error);

        const errorMessage = `Lỗi kết nối MongoDB: ${error.message}`;
        showToast(errorMessage, 'error');

        // Show error in table
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="p-8 text-center">
                        <div class="text-danger mb-4">
                            <i data-lucide="alert-circle" style="width: 2.5rem; height: 2.5rem;"></i>
                        </div>
                        <p class="text-white font-semibold mb-2">Không thể tải dữ liệu từ MongoDB</p>
                        <p class="text-gray-400 text-sm mb-4">${error.message}</p>
                        <button onclick="loadUsers()" class="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90">
                            Thử lại
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filters.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateSelectedUsers();
        });
    }
}

// Apply filters
function applyFilters() {
    const planFilter = document.getElementById('planFilter');
    const statusFilter = document.getElementById('statusFilter');
    const coinsFilter = document.getElementById('coinsFilter');

    if (planFilter) filters.plan = planFilter.value;
    if (statusFilter) filters.status = statusFilter.value;
    if (coinsFilter) filters.coins = coinsFilter.value;

    filteredUsers = allUsers.filter(user => {
        if (filters.search) {
            const searchMatch = user.name.toLowerCase().includes(filters.search) ||
                user.email.toLowerCase().includes(filters.search) ||
                user.id.toLowerCase().includes(filters.search);
            if (!searchMatch) return false;
        }

        if (filters.plan && user.subscription.plan !== filters.plan) {
            return false;
        }

        if (filters.status && user.status !== filters.status) {
            return false;
        }

        if (filters.coins) {
            const userCoins = Number(user.coins) || 0;
            if (filters.coins === 'has_coins' && userCoins <= 0) return false;
            if (filters.coins === 'no_coins' && userCoins > 0) return false;
        }

        return true;
    });

    currentPage = 1;
    renderUsers();
}

// Reset filters
function resetFilters() {
    filters = { search: '', plan: '', status: '', coins: '' };

    const searchInput = document.getElementById('searchInput');
    const planFilter = document.getElementById('planFilter');
    const statusFilter = document.getElementById('statusFilter');
    const coinsFilter = document.getElementById('coinsFilter');

    if (searchInput) searchInput.value = '';
    if (planFilter) planFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (coinsFilter) coinsFilter.value = '';
    if (statusFilter) statusFilter.value = '';

    filteredUsers = [...allUsers];
    currentPage = 1;
    renderUsers();
}

// Show loading state
function showLoadingState() {
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-8 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span class="text-gray-400">Đang tải dữ liệu từ MongoDB...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Render users table
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    const totalUsersEl = document.getElementById('totalUsers');
    const totalCountEl = document.getElementById('totalCount');

    if (!tbody) {
        console.error('❌ usersTableBody not found');
        return;
    }

    // Update total count
    if (totalUsersEl) totalUsersEl.textContent = allUsers.length;
    if (totalCountEl) totalCountEl.textContent = filteredUsers.length;

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    // Update showing count
    const showingFrom = document.getElementById('showingFrom');
    const showingTo = document.getElementById('showingTo');
    if (showingFrom) showingFrom.textContent = filteredUsers.length > 0 ? startIndex + 1 : 0;
    if (showingTo) showingTo.textContent = endIndex;

    if (pageUsers.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = pageUsers.map(user => {
        const planBadge = getPlanBadge(user.subscription.plan);
        const statusBadge = getStatusBadge(user.status);
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

        return `
            <tr class="hover:bg-white/5 transition-colors ${user.status === 'blocked' ? 'opacity-60' : ''}">
                <td class="p-4">
                    <input type="checkbox" class="user-checkbox rounded border-gray-600 text-primary focus:ring-primary" data-user-id="${user.id}" />
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            ${initials}
                        </div>
                        <div>
                            <p class="font-medium text-white">${user.name}</p>
                            <p class="text-xs text-gray-400">${user.email}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <span class="text-gray-300">${user.phone || '<span class="text-gray-500 italic">Chưa có</span>'}</span>
                </td>
                <td class="p-4">${planBadge}</td>
                <td class="p-4">
                    <div class="flex items-center gap-1.5">
                        <span style="color: #fbbf24; font-weight: 800; font-size: 14px;">${(user.coins || 0).toLocaleString('vi-VN')}</span>
                        <span style="color: #fbbf24; opacity: 0.8; font-size: 11px; font-weight: 600;">Xu</span>
                    </div>
                </td>
                <td class="p-4 text-gray-400">${formatDate(user.createdAt)}</td>
                <td class="p-4 text-gray-400">${formatRelativeTime(user.lastActive)}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="viewUserDetail('${user.id}')" class="btn btn-secondary btn-icon btn-sm" title="Xem chi tiết">
                            <i data-lucide="eye"></i>
                        </button>
                        <button onclick="toggleUserStatus('${user.id}')" class="btn btn-icon btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-success'}" title="${user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}">
                            <i data-lucide="${user.status === 'active' ? 'ban' : 'check-circle'}"></i>
                        </button>
                        <button onclick="sendNotificationToUser('${user.id}')" class="btn btn-secondary btn-icon btn-sm" title="Gửi thông báo">
                            <i data-lucide="bell"></i>
                        </button>
                        <button onclick="deleteUser('${user.id}')" class="btn btn-secondary btn-sm btn-icon hover:bg-danger hover:text-white" title="Xóa tài khoản">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners to checkboxes
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSelectedUsers);
    });

    renderPagination();
}

// Get plan badge HTML
function getPlanBadge(plan) {
    const badges = {
        'FREE': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300">Free</span>',
        'PREMIUM': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-black">Premium</span>',
        'FAMILY': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white">Family</span>'
    };
    return badges[plan] || badges['FREE'];
}

// Get status badge HTML
function getStatusBadge(status) {
    if (status === 'active') {
        return `
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span class="text-green-500 font-medium text-xs">Hoạt động</span>
            </div>
        `;
    } else {
        return `
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                <span class="text-red-500 font-medium text-xs">Bị khóa</span>
            </div>
        `;
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}

// Format relative time
function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 30) return `${days} ngày trước`;
    return formatDate(dateStr);
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const pagination = document.getElementById('pagination');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    if (currentPage > 1) {
        html += `<button onclick="goToPage(${currentPage - 1})" class="page-btn">
            <i data-lucide="chevron-left" style="width: 1.25rem; height: 1.25rem;"></i>
        </button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="goToPage(${i})" class="page-btn ${i === currentPage ? 'active' : ''}">
                ${i}
            </button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="px-2 text-gray-500">...</span>`;
        }
    }

    if (currentPage < totalPages) {
        html += `<button onclick="goToPage(${currentPage + 1})" class="page-btn">
            <i data-lucide="chevron-right" style="width: 1.25rem; height: 1.25rem;"></i>
        </button>`;
    }

    pagination.innerHTML = html;
}

// Go to page
function goToPage(page) {
    currentPage = page;
    renderUsers();
}

// Update selected users
function updateSelectedUsers() {
    selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(cb => cb.dataset.userId);
}

// View user detail - FETCH REALTIME GAMIFICATION DATA FIRST
async function viewUserDetail(userId) {
    // Robust Safety Guard
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('❌ ViewUserDetail Aborted: Invalid UserID provided', userId);
        showToast('ID người dùng không hợp lệ. Vui lòng F5 và thử lại.', 'error');
        return;
    }

    console.log('🔍 Opening visual management console for User:', userId);
    showLoadingState();
    const token = getAdminToken();
    if (!token) return;

    try {
        // Fetch full detail including coins, inventory etc from DB
        const res = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        const user = result.data;

        // Level & Rank Calculation helper
        const currentXP = user.xp || 0;
        const currentLv = Math.floor(currentXP / 30) + 1;
        
        let rankName = 'Khán Giả';
        if (currentLv >= 20) rankName = 'Cao Cấp';
        else if (currentLv >= 16) rankName = 'Biên Kịch';
        else if (currentLv >= 13) rankName = 'Cinephile';
        else if (currentLv >= 10) rankName = 'Critic';
        else if (currentLv >= 7) rankName = 'Reviewer';
        else if (currentLv >= 4) rankName = 'Mọt Phim';
        
        // Prepare lists
        const ownedFrames = (user.inventory && user.inventory.frames) ? user.inventory.frames : [];
        const ownedBanners = (user.inventory && user.inventory.banners) ? user.inventory.banners : [];
        
        // Lookup equipped frame name
        const equippedFrameName = user.equippedFrame && user.equippedFrame !== 'none' 
            ? (MASTER_SHOP_DATA.frames.find(f => f.id === user.equippedFrame)?.name || user.equippedFrame)
            : 'Không sử dụng';
            
        // Cache to window for popup
        window._currentInventoryFrames = ownedFrames;
        window._currentInventoryBanners = ownedBanners;
        window._currentEquippedFrame = equippedFrameName;


        // Build Transaction Log HTML - Sorted by date descending (latest first)
        const transactions = user.transactions || [];
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const transactionHTML = sortedTransactions.length === 0 
            ? '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:20px;">Chưa có giao dịch/biến động nào.</p>'
            : sortedTransactions.slice(0, 15).map(t => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div>
                        <div style="font-size:13px; font-weight:600; color:${['admin', 'recharge'].includes(t.type) ? 'var(--primary)' : 'var(--text-primary)'}">${t.title}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${formatDate(t.date)} - ${new Date(t.date).toLocaleTimeString('vi-VN')}</div>
                    </div>
                    <div style="font-size:13px; font-weight:bold; color:${t.amount < 0 ? '#ef4444' : (t.amount > 0 ? '#4ade80' : '#888')}">
                        ${t.amount > 0 ? '+' : ''}${t.amount !== 0 ? t.amount.toLocaleString('vi-VN') + ' Xu' : '—'}
                    </div>
                </div>
            `).join('');

        showModal(`
            <div class="modal-box modal-box-lg" style="max-width: 950px; background: #08080f; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 50px 150px rgba(0,0,0,0.9); border-radius: 28px; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">
                <!-- Header: Ultra Modern Glassmorphism -->
                <div class="modal-header" style="background: rgba(18, 18, 31, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100;">
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <div style="width: 48px; height: 48px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5, #9333ea); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(79, 70, 229, 0.4);">
                            <i data-lucide="shield-check" style="width:26px; color:#fff;"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 18px; font-weight: 900; letter-spacing: 0.5px; color: #fff; margin:0; text-transform: uppercase;">TRUNG TÂM QUẢN TRỊ NGƯỜI DÙNG</h3>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite;"></div>
                                <span style="font-size: 10px; color: #10b981; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">KẾT NỐI REAL-TIME</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="modal-close-premium" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: all 0.3s; color: rgba(255,255,255,0.5); cursor: pointer;"><i data-lucide="x" style="width:22px;"></i></button>
                </div>
                
                <div class="modal-body" style="padding: 0; max-height: 82vh; overflow-y: auto; background: radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.1), transparent 35%), radial-gradient(circle at 100% 100%, rgba(147, 51, 234, 0.1), transparent 35%);">
                    
                    <!-- User Identity Hero Card -->
                    <div style="margin: 24px 32px; padding: 32px; background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; display: flex; align-items: center; gap: 40px; position: relative; overflow: hidden;">
                        <div style="position: absolute; right: -50px; top: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%); filter: blur(40px);"></div>
                        
                        <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0;">
                            ${user.equippedFrameUrl ? `<img src="${user.equippedFrameUrl}" style="position: absolute; top:-18%; left:-18%; width: 136%; height: 136%; z-index: 2; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.6));">` : ''}
                            <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; border: 5px solid #1a1a2e; z-index: 1; box-shadow: 0 0 50px rgba(0,0,0,0.6);">
                                <img src="${user.avatar || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.name)}" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                        </div>
                        <div style="flex:1; z-index: 1;">
                            <div style="display:flex; align-items:center; gap:14px; margin-bottom: 6px;">
                                <h2 style="font-size: 36px; font-weight: 950; color: #fff; margin:0; letter-spacing: -1.5px; line-height: 1;">${user.name}</h2>
                                ${user.role === 'admin' ? '<div style="background: linear-gradient(135deg, #fbbf24, #d97706); color: #000; font-size: 9px; font-weight: 900; padding: 4px 12px; border-radius: 8px; box-shadow: 0 8px 20px rgba(251, 191, 36, 0.3); letter-spacing: 0.5px;">ADMIN</div>' : ''}
                            </div>
                            <p style="color: rgba(255,255,255,0.4); margin: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="mail" style="width:18px; opacity:0.4;"></i> ${user.email}
                            </p>
                            <div style="margin-top: 24px; display:flex; gap:16px;">
                                <div style="background: rgba(79, 70, 229, 0.1); color: #818cf8; font-size: 13px; padding: 8px 20px; border-radius: 14px; font-weight: 800; border: 1px solid rgba(79, 70, 229, 0.2); display: flex; align-items: center; gap: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                                    <i data-lucide="zap" style="width:16px;"></i> CẤP ${currentLv} • ${rankName}
                                </div>
                                <div style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; font-size: 13px; padding: 8px 20px; border-radius: 14px; font-weight: 800; border: 1px solid rgba(251, 191, 36, 0.2); display:flex; align-items:center; gap:10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                                    <i data-lucide="database" style="width:16px;"></i> ${user.coins.toLocaleString()} XU
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right; z-index: 1;">
                            <div style="display:inline-flex; align-items:center; gap:10px; padding: 10px 24px; border-radius: 16px; background:${user.isBlocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; border: 1px solid ${user.isBlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; margin-bottom: 15px;">
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${user.isBlocked ? '#ef4444' : '#10b981'}; box-shadow: 0 0 10px ${user.isBlocked ? '#ef4444' : '#10b981'};"></div>
                                <span style="font-size: 13px; font-weight: 900; color:${user.isBlocked ? '#f87171' : '#34d399'}; letter-spacing: 1.5px; text-transform: uppercase;">
                                    ${user.isBlocked ? 'BỊ KHÓA' : 'ĐANG HOẠT ĐỘNG'}
                                </span>
                            </div>
                            <p style="font-size:11px; color:rgba(255,255,255,0.2); margin: 0; font-weight:700; letter-spacing: 1px;">UID: <span style="color:rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;">${user._id}</span></p>
                        </div>
                    </div>

                    <div style="padding: 0 28px 28px 28px;">

                        <!-- ══ BOTTOM TOOLBAR: Actions + Inventory Popup ══ -->
                        <div style="display:flex; gap:12px; margin-bottom:20px; align-items:center; flex-wrap: wrap;">
                            <button onclick="toggleUserStatus('${user._id}')" class="btn ${user.isBlocked ? 'btn-success' : 'btn-danger'}" style="height:38px; border-radius:10px; font-size:12px; font-weight:800; display:flex; align-items:center; gap:6px; padding:0 16px;">
                                <i data-lucide="${user.isBlocked ? 'unlock' : 'lock'}" style="width:14px;"></i> ${user.isBlocked ? 'MỞ KHÓA' : 'KHÓA USER'}
                            </button>
                            <button onclick="sendNotificationToUser('${user._id}')" class="btn btn-secondary" style="height:38px; border-radius:10px; font-size:12px; font-weight:800; display:flex; align-items:center; gap:6px; padding:0 16px; background:rgba(255,255,255,0.05);">
                                <i data-lucide="bell" style="width:14px;"></i> GỬI THÔNG BÁO
                            </button>
                            <button onclick="openInventoryPanel('${user._id}')"
                                style="height:38px; border-radius:10px; font-size:12px; font-weight:800; display:flex; align-items:center; gap:8px; padding:0 18px; background:rgba(147,51,234,0.1); border:1px solid rgba(147,51,234,0.3); color:#c084fc; cursor:pointer; transition:all 0.2s; margin-left:auto;"
                                onmouseover="this.style.background='rgba(147,51,234,0.2)'"
                                onmouseout="this.style.background='rgba(147,51,234,0.1)'">
                                <i data-lucide="package" style="width:14px;"></i>
                                KHO VẬT PHẨM
                                <span style="background:rgba(168,85,247,0.2); border-radius:20px; font-size:10px; padding:2px 8px; font-weight:900;">${ownedFrames.length + ownedBanners.length} item</span>
                            </button>
                        </div>

                        <!-- ══ MAIN: Full-width Finance & Membership ══ -->
                        <div style="background: rgba(14, 14, 26, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); border-radius: 28px; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px;">
                                <h4 style="color: #fff; display:flex; align-items:center; gap: 14px; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(79, 70, 229, 0.15); display: flex; align-items: center; justify-content: center; color: #818cf8;">
                                        <i data-lucide="credit-card" style="width:20px;"></i>
                                    </div>
                                    Tài Chính &amp; Hội Viên
                                </h4>
                                <span style="font-size: 10px; background: rgba(79, 70, 229, 0.1); color: #818cf8; padding: 4px 10px; border-radius: 6px; font-weight: 800;">TỰ ĐỘNG TÍNH</span>
                            </div>

                            <!-- ══ TWO-COLUMN: Coin Left | Subscription Right ══ -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 24px;">

                                <!-- LEFT: Gói Nạp Xu Nhanh -->
                                <div style="padding: 20px; background: rgba(251, 191, 36, 0.03); border-radius: 20px; border: 1px solid rgba(251, 191, 36, 0.12);">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                                        <label style="font-size:11px; color:rgba(251,191,36,0.9); font-weight:900; text-transform: uppercase; letter-spacing: 1px;">⚡ Chọn Gói Nạp Xu</label>
                                        <span style="font-size:10px; color:rgba(255,255,255,0.3); font-weight:700;">Click để cộng</span>
                                    </div>
                                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:14px;">
                                        <div onclick="applyCoinPackage(5000, 0, 'Gói Khởi Đầu')" id="coinPkg_starter"
                                             style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none;"
                                             onmouseover="this.style.borderColor='rgba(251,191,36,0.5)'; this.style.background='rgba(251,191,36,0.07)'; this.style.transform='translateY(-2px)';"
                                             onmouseout="this.style.borderColor=this._selected?'rgba(251,191,36,0.8)':'rgba(255,255,255,0.07)'; this.style.background=this._selected?'rgba(251,191,36,0.1)':'rgba(255,255,255,0.03)'; this.style.transform='none';">
                                            <div style="font-size:8px; color:rgba(255,255,255,0.4); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Khởi Đầu</div>
                                            <div style="font-size:16px; font-weight:900; color:#fbbf24; line-height:1;">5.000</div>
                                            <div style="font-size:8px; color:#fbbf24; font-weight:700; margin-bottom:4px;">Xu</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.3);">20.000đ</div>
                                        </div>
                                        <div onclick="applyCoinPackage(30000, 5000, 'Gói Đam Mê')" id="coinPkg_popular"
                                             style="background: rgba(251,191,36,0.06); border: 1.5px solid rgba(251,191,36,0.35); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none; position:relative;"
                                             onmouseover="this.style.borderColor='rgba(251,191,36,0.7)'; this.style.transform='translateY(-2px)';"
                                             onmouseout="this.style.borderColor=this._selected?'rgba(251,191,36,0.8)':'rgba(251,191,36,0.35)'; this.style.transform='none';">
                                            <div style="position:absolute; top:-7px; left:50%; transform:translateX(-50%); background:#fbbf24; color:#000; font-size:7px; font-weight:900; padding:1px 6px; border-radius:20px; white-space:nowrap;">PHỔ BIẾN</div>
                                            <div style="font-size:8px; color:rgba(255,255,255,0.5); font-weight:700; text-transform:uppercase; margin-bottom:4px; margin-top:3px;">Đam Mê</div>
                                            <div style="font-size:16px; font-weight:900; color:#fbbf24; line-height:1;">30.000</div>
                                            <div style="font-size:8px; color:#4ade80; font-weight:700; margin-bottom:4px;">+5.000 thưởng</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.3);">100.000đ</div>
                                        </div>
                                        <div onclick="applyCoinPackage(200000, 50000, 'Gói VIP Collector')" id="coinPkg_vip"
                                             style="background: rgba(168,85,247,0.04); border: 1.5px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none;"
                                             onmouseover="this.style.borderColor='rgba(168,85,247,0.6)'; this.style.background='rgba(168,85,247,0.1)'; this.style.transform='translateY(-2px)';"
                                             onmouseout="this.style.borderColor=this._selected?'rgba(168,85,247,0.7)':'rgba(168,85,247,0.2)'; this.style.background=this._selected?'rgba(168,85,247,0.08)':'rgba(168,85,247,0.04)'; this.style.transform='none';">
                                            <div style="font-size:8px; color:rgba(168,85,247,0.8); font-weight:700; text-transform:uppercase; margin-bottom:4px;">VIP</div>
                                            <div style="font-size:16px; font-weight:900; color:#a855f7; line-height:1;">200K</div>
                                            <div style="font-size:8px; color:#4ade80; font-weight:700; margin-bottom:4px;">+50K thưởng</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.3);">500.000đ</div>
                                        </div>
                                    </div>
                                    <div id="coinPkgSummary" style="font-size:10px; color:rgba(255,255,255,0.3); text-align:center; min-height:14px; font-weight:600; font-style:italic; margin-bottom:12px;"></div>

                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Số Dư Xu Hiện Tại</label>
                                    <div style="position:relative;">
                                        <input type="number" id="adminCoinsInput" class="form-control-premium" value="${user.coins || 0}" style="font-weight:900; color:#fff; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); height:50px; font-size:18px; padding:0 46px 0 15px; border-radius:12px; width: 100%; transition: all 0.3s; box-sizing:border-box;">
                                        <span style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:#fbbf24; font-size:11px; font-weight:900;">XU</span>
                                    </div>
                                    <div style="display:flex; gap:6px; margin-top:10px; margin-bottom:12px;">
                                        <button onclick="quickAddCoins(5000)" style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.6); font-size:10px; font-weight:900; padding:7px 0; border-radius:8px; cursor:pointer;">+5K</button>
                                        <button onclick="quickAddCoins(50000)" style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.6); font-size:10px; font-weight:900; padding:7px 0; border-radius:8px; cursor:pointer;">+50K</button>
                                        <button onclick="document.getElementById('adminCoinsInput').value=${user.coins||0}; document.getElementById('coinPkgSummary').textContent=''; ['coinPkg_starter','coinPkg_popular','coinPkg_vip'].forEach(id=>{const el=document.getElementById(id);if(el){el._selected=false;el.style.boxShadow='none';}})" style="flex:1; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); color:rgba(239,68,68,0.6); font-size:10px; font-weight:900; padding:7px 0; border-radius:8px; cursor:pointer;">Reset</button>
                                    </div>

                                    <button id="saveCoinsBtn" onclick="saveAdminCoins('${user._id}')" style="width:100%; height:44px; background: linear-gradient(135deg, #fbbf24, #f59e0b); color:#000; border:none; font-weight:900; font-size:12px; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.3s; text-transform: uppercase;">
                                        <i data-lucide="zap" style="width:16px;"></i> XÁC NHẬN NẠP XU
                                    </button>
                                </div>

                                <!-- RIGHT: Kích Hoạt Gói Hội Viên - Card Picker -->
                                <div style="padding: 20px; background: rgba(16, 185, 129, 0.03); border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.12);">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                                        <label style="font-size:11px; color:rgba(16,185,129,0.9); font-weight:900; text-transform: uppercase; letter-spacing: 1px;">🎯 Kích Hoạt Gói Hội Viên</label>
                                        <span style="font-size:10px; color:rgba(255,255,255,0.3); font-weight:700;">Click để chọn</span>
                                    </div>

                                     <!-- Plan Cards -->
                                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:14px;">
                                        <!-- FREE -->
                                        <div onclick="selectPlanCard('FREE')" id="planCard_FREE"
                                             style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none;"
                                             onmouseover="if(!this._selected){this.style.borderColor='rgba(100,116,139,0.5)'; this.style.background='rgba(100,116,139,0.07)'; this.style.transform='translateY(-2px)';}"
                                             onmouseout="if(!this._selected){this.style.borderColor='rgba(255,255,255,0.07)'; this.style.background='rgba(255,255,255,0.03)'; this.style.transform='none';}">
                                            <div style="font-size:8px; color:rgba(255,255,255,0.4); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Cơ bản</div>
                                            <div style="font-size:16px; font-weight:900; color:rgba(255,255,255,0.7); line-height:1;">FREE</div>
                                            <div style="font-size:8px; color:rgba(255,255,255,0.3); font-weight:700; margin-bottom:4px;">Gói Gốc</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.2);">0đ</div>
                                        </div>
                                        <!-- PREMIUM -->
                                        <div onclick="selectPlanCard('PREMIUM')" id="planCard_PREMIUM"
                                             style="background: rgba(251,191,36,0.06); border: 1.5px solid rgba(251,191,36,0.35); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none; position:relative;"
                                             onmouseover="if(!this._selected){this.style.borderColor='rgba(251,191,36,0.7)'; this.style.transform='translateY(-2px)';}"
                                             onmouseout="if(!this._selected){this.style.borderColor=this._selected?'rgba(251,191,36,0.8)':'rgba(251,191,36,0.35)'; this.style.transform='none';}">
                                            <div style="position:absolute; top:-7px; left:50%; transform:translateX(-50%); background:#fbbf24; color:#000; font-size:7px; font-weight:900; padding:1px 6px; border-radius:20px; white-space:nowrap;">PHỔ BIẾN</div>
                                            <div style="font-size:8px; color:rgba(255,255,255,0.5); font-weight:700; text-transform:uppercase; margin-bottom:4px; margin-top:3px;">Cao Cấp</div>
                                            <div style="font-size:16px; font-weight:900; color:#fbbf24; line-height:1;">PREMIUM</div>
                                            <div style="font-size:8px; color:#4ade80; font-weight:700; margin-bottom:4px;">4K HDR • 4 TB</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.3);">260.000đ</div>
                                        </div>
                                        <!-- FAMILY -->
                                        <div onclick="selectPlanCard('FAMILY')" id="planCard_FAMILY"
                                             style="background: rgba(168,85,247,0.04); border: 1.5px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 12px 6px; text-align:center; cursor:pointer; transition: all 0.25s; user-select:none;"
                                             onmouseover="if(!this._selected){this.style.borderColor='rgba(168,85,247,0.6)'; this.style.background='rgba(168,85,247,0.1)'; this.style.transform='translateY(-2px)';}"
                                             onmouseout="if(!this._selected){this.style.borderColor=this._selected?'rgba(168,85,247,0.7)':'rgba(168,85,247,0.2)'; this.style.background=this._selected?'rgba(168,85,247,0.08)':'rgba(168,85,247,0.04)'; this.style.transform='none';}">
                                            <div style="font-size:8px; color:rgba(168,85,247,0.8); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Gia Đình</div>
                                            <div style="font-size:16px; font-weight:900; color:#a855f7; line-height:1;">FAMILY</div>
                                            <div style="font-size:8px; color:#4ade80; font-weight:700; margin-bottom:4px;">10 Thiết bị</div>
                                            <div style="font-size:9px; color:rgba(255,255,255,0.3);">2.400.000đ</div>
                                        </div>
                                    </div>

                                    <!-- Hidden plan input -->
                                    <input type="hidden" id="adminPlanInput" value="${user.subscription?.plan || 'FREE'}">
                                    <div id="planCardSummary" style="font-size:10px; color:rgba(255,255,255,0.3); text-align:center; min-height:14px; font-weight:600; font-style:italic; margin-bottom:12px;"></div>

                                    <!-- Expiry Date -->
                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Ngày Hết Hạn</label>
                                    <input type="date" id="adminExpiryInput" class="form-control-premium" value="${(user.subscription?.endDate || user.subscription?.expiresAt) ? new Date(user.subscription.endDate || user.subscription.expiresAt).toISOString().split('T')[0] : ''}" style="height:46px; background:rgba(255,255,255,0.03); color:#fff; font-weight:700; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding: 0 15px; width: 100%; box-sizing:border-box; margin-bottom:10px;">

                                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                        <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); margin-bottom:10px;">
                                            <input type="checkbox" id="autoApplyRewards" checked style="width:18px; height:18px; cursor:pointer; accent-color:#10b981;">
                                            <label for="autoApplyRewards" style="font-size:11px; color:#fff; font-weight:700; cursor:pointer;">Cộng quà tặng kèm (Xu & XP)</label>
                                        </div>

                                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                            <button onclick="applyPlanRewards()" style="height:44px; background:rgba(16, 185, 129, 0.05); border:1px solid rgba(16, 185, 129, 0.2); color:#34d399; font-size:10px; font-weight:900; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.3s;"
                                                    onmouseover="this.style.background='rgba(16,185,129,0.12)'"
                                                    onmouseout="this.style.background='rgba(16,185,129,0.05)'">
                                                <i data-lucide="gift" style="width:14px;"></i> XEM QUÀ
                                            </button>
                                        <button id="savePlanBtn" onclick="saveAdminSubscription('${user._id}')" style="height:44px; background: linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; font-weight:900; font-size:11px; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.3s; text-transform: uppercase;">
                                            <i data-lucide="check-circle" style="width:16px;"></i> KÍCH HOẠT GÓI
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- XP / Level + Refs row -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                                <div>
                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Cấp Độ</label>
                                    <input type="number" id="adminLevelInput" class="form-control-premium" value="${currentLv}"
                                        oninput="document.getElementById('adminXpInput').value = (this.value - 1) * 30"
                                        style="height:46px; color:#fff; background:rgba(79,70,229,0.06); border:1px solid rgba(79,70,229,0.22); font-weight:900; border-radius:12px; text-align:center; font-size:20px; width: 100%; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Kinh Nghiệm (XP)</label>
                                    <input type="number" id="adminXpInput" class="form-control-premium" value="${user.xp || 0}" style="height:46px; color:#fff; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); font-weight:bold; border-radius:12px; width: 100%; text-align: center; font-size: 18px; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Mã Đối Soát</label>
                                    <input type="text" id="adminTransRefInput" class="form-control-premium" style="height:46px; color:#fff; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding: 0 12px; width: 100%; box-sizing:border-box;" placeholder="BILL-123">
                                </div>
                                <div>
                                    <label style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:8px; display:block; text-transform: uppercase; letter-spacing: 1px;">Lời Nhắn</label>
                                    <input type="text" id="adminMessageInput" class="form-control-premium" style="height:46px; color:#fff; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding: 0 12px; width: 100%; box-sizing:border-box;" placeholder="Quà tặng...">
                                </div>
                            </div>

                            <!-- Optional: Global Save removed for clarity as per user request -->
                        </div>

                        <!-- ══ TRANSACTION LOG ══ -->
                        <div style="margin-top: 24px; background: rgba(22, 22, 37, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 22px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                                <h4 style="color: #fff; display:flex; align-items:center; gap: 10px; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin:0;">
                                    <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; color: #818cf8;">
                                        <i data-lucide="history" style="width:15px;"></i>
                                    </div>
                                    Nhật Ký Biến Động <span style="font-size: 10px; opacity: 0.4; font-weight: 500; margin-left: 6px;">(Real-time Logs)</span>
                                </h4>
                                <div style="font-size:10px; color:rgba(99,102,241,0.6); font-weight:800; background: rgba(99,102,241,0.1); padding: 3px 10px; border-radius: 20px;">10 gần nhất</div>
                            </div>
                            <div style="max-height: 220px; overflow-y: auto; padding-right:8px;" class="custom-scrollbar">
                                ${transactionHTML}
                            </div>
                        </div>

                        <!-- MODAL FOOTER -->
                        <div class="modal-footer" style="padding: 16px 28px; background: #08080e; border-top: 1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px; color:rgba(255,255,255,0.3); font-size:11px; font-weight:600;">
                                <i data-lucide="shield" style="width:14px; color: #22c55e;"></i> Mọi thao tác quản trị đều được mã hóa và ghi lại vào Audit Log.
                            </div>
                            <button onclick="closeModal()" class="btn btn-secondary" style="height:38px; border-radius:10px; padding: 0 20px; font-weight:800; font-size:12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">ĐÓNG CỬA SỔ</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Important initialization for dynamic dropdown selectors inside modal

        if (typeof updateGiftIdDropdown === 'function') {
            updateGiftIdDropdown('frame'); 
        }

        // Support inner functions
        window.quickAddCoins = (amt) => {
            const inp = document.getElementById('adminCoinsInput');
            if(inp) inp.value = parseInt(inp.value || 0) + amt;
        };

        // ── GÓI NẠP XU PICKER LOGIC ──────────────────────────────────────
        window.applyCoinPackage = (baseCoins, bonusCoins, pkgName) => {
            const inp = document.getElementById('adminCoinsInput');
            const summaryEl = document.getElementById('coinPkgSummary');
            const msgInput = document.getElementById('adminMessageInput');
            if (!inp) return;

            const currentCoins = parseInt(inp.value || 0);
            const totalAdd = baseCoins + bonusCoins;
            inp.value = currentCoins + totalAdd;

            // Visual flash on input
            inp.style.boxShadow = '0 0 20px rgba(251,191,36,0.35)';
            inp.style.borderColor = 'rgba(251,191,36,0.5)';
            setTimeout(() => { inp.style.boxShadow = ''; inp.style.borderColor = ''; }, 1500);

            // Update summary text
            if (summaryEl) {
                const bonusText = bonusCoins > 0 ? ` (bao gồm +${bonusCoins.toLocaleString('vi-VN')} Xu thưởng)` : '';
                summaryEl.textContent = `✅ Đã cộng ${totalAdd.toLocaleString('vi-VN')} Xu từ ${pkgName}${bonusText}`;
                summaryEl.style.color = '#4ade80';
            }

            // Auto fill message
            if (msgInput && !msgInput.value) {
                const bonusPart = bonusCoins > 0 ? ` (kèm ${bonusCoins.toLocaleString('vi-VN')} Xu thưởng)` : '';
                msgInput.value = `Admin đã nạp ${pkgName}: +${totalAdd.toLocaleString('vi-VN')} Xu${bonusPart}. Chúc bạn mua sắm vui vẻ!`;
            }

            // Highlight selected card
            ['coinPkg_starter', 'coinPkg_popular', 'coinPkg_vip'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el._selected = false;
                    el.style.boxShadow = 'none';
                    el.style.transform = 'none';
                }
            });

            const pkgIdMap = { 'Gói Khởi Đầu': 'coinPkg_starter', 'Gói Đam Mê': 'coinPkg_popular', 'Gói VIP Collector': 'coinPkg_vip' };
            const selectedEl = document.getElementById(pkgIdMap[pkgName]);
            if (selectedEl) {
                selectedEl._selected = true;
                selectedEl.style.boxShadow = '0 0 0 2px rgba(251,191,36,0.6), 0 8px 20px rgba(251,191,36,0.15)';
                selectedEl.style.transform = 'translateY(-2px)';
            }
        };

        // ── PLAN CARD PICKER LOGIC ─────────────────────────────────────────
        window.selectPlanCard = (planId, isAutoInit = false) => {
            const planInput = document.getElementById('adminPlanInput');
            const summaryEl = document.getElementById('planCardSummary');
            const expiryInput = document.getElementById('adminExpiryInput');
            if (!planInput) return;

            planInput.value = planId;

            // Reset all cards
            const cardStyles = {
                'FREE':    { border: 'rgba(100,116,139,0.06)', bg: 'rgba(255,255,255,0.02)', selBorder: 'rgba(100,116,139,0.7)', selBg: 'rgba(100,116,139,0.15)', selShadow: '0 0 0 2px rgba(100,116,139,0.3)' },
                'PREMIUM': { border: 'rgba(251,191,36,0.2)',   bg: 'rgba(251,191,36,0.03)',  selBorder: 'rgba(251,191,36,0.8)',   selBg: 'rgba(251,191,36,0.12)',  selShadow: '0 0 0 2px rgba(251,191,36,0.35), 0 8px 20px rgba(251,191,36,0.15)' },
                'FAMILY':  { border: 'rgba(168,85,247,0.2)',   bg: 'rgba(168,85,247,0.03)',  selBorder: 'rgba(168,85,247,0.8)',   selBg: 'rgba(168,85,247,0.14)', selShadow: '0 0 0 2px rgba(168,85,247,0.35), 0 8px 20px rgba(168,85,247,0.15)' }
            };

            ['FREE', 'PREMIUM', 'FAMILY'].forEach(id => {
                const el = document.getElementById(`planCard_${id}`);
                if (!el) return;
                const s = cardStyles[id];
                el._selected = (id === planId);
                el.style.borderColor = el._selected ? s.selBorder : s.border;
                el.style.background = el._selected ? s.selBg : s.bg;
                el.style.boxShadow = el._selected ? s.selShadow : 'none';
                el.style.transform = el._selected ? 'translateY(-3px)' : 'none';
                
                // Toggle text color for visibility
                const textNodes = el.querySelectorAll('div');
                if (textNodes.length >= 2) {
                    textNodes[1].style.color = el._selected ? (id === 'FREE' ? '#fff' : (id === 'PREMIUM' ? '#fbbf24' : '#a855f7')) : (id === 'FREE' ? 'rgba(255,255,255,0.7)' : (id === 'PREMIUM' ? '#fbbf24' : '#a855f7'));
                }
            });

            // Auto-set expiry date based on plan
            const today = new Date();
            if (planId === 'PREMIUM') {
                const d = new Date(today); d.setMonth(d.getMonth() + 1);
                if (expiryInput) expiryInput.value = d.toISOString().split('T')[0];
                if (summaryEl) { summaryEl.textContent = '⚡ Gói Premium: +30K Xu & +500 XP. Click "CỘNG QUÀ" bên dưới để áp dụng.'; summaryEl.style.color = '#fbbf24'; }
            } else if (planId === 'FAMILY') {
                const d = new Date(today); d.setFullYear(d.getFullYear() + 1);
                if (expiryInput) expiryInput.value = d.toISOString().split('T')[0];
                if (summaryEl) { summaryEl.textContent = '🌟 Gói Family: +50K Xu & +2000 XP. Quà sẽ được cộng tự động khi bấm Kích Hoạt.'; summaryEl.style.color = '#c084fc'; }
            } else {
                if (summaryEl) { summaryEl.textContent = 'Gói FREE: Không có quà tặng kèm.'; summaryEl.style.color = 'rgba(255,255,255,0.4)'; }
            }

            // Auto-check reward box if plan is not FREE
            const rewardBox = document.getElementById('autoApplyRewards');
            if (rewardBox) rewardBox.checked = (planId !== 'FREE');

            // Auto-fill message ONLY IF MANUALLY INITIATED BY ADMIN CLICK, NOT ON AUTO-LOAD
            const msgInput = document.getElementById('adminMessageInput');
            if (!isAutoInit && msgInput && !msgInput.value && planId !== 'FREE') {
                const label = planId === 'PREMIUM' ? 'Cao Cấp (Premium)' : 'Gia Đình (Family)';
                msgInput.value = `Admin đã kích hoạt gói ${label} cho tài khoản của bạn. Chúc bạn xem phim vui vẻ!`;
            }
        };

        window.applyPlanRewards = () => {
            const plan = document.getElementById('adminPlanInput')?.value || 'FREE';
            const coinsInput = document.getElementById('adminCoinsInput');
            const levelInput = document.getElementById('adminLevelInput');
            const xpInput = document.getElementById('adminXpInput');
            const summaryEl = document.getElementById('planCardSummary');
            
            if (plan === 'FREE') {
                if (summaryEl) { summaryEl.textContent = 'Gói FREE không có quà tặng kèm.'; summaryEl.style.color = 'rgba(255,255,255,0.4)'; }
                return;
            }

            let bonusCoins = 0;
            let targetLevel = 1;
            
            if (plan === 'PREMIUM') {
                bonusCoins = 5000;
                targetLevel = 5; // Đặc quyền lên cấp
            } else if (plan === 'FAMILY') {
                bonusCoins = 50000;
                targetLevel = 10; // Đặc quyền lên cấp
            }

            // Cộng Xu
            if (coinsInput) {
                const currentCoins = parseInt(coinsInput.value || 0);
                coinsInput.value = currentCoins + bonusCoins;
                coinsInput.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                coinsInput.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                setTimeout(() => { coinsInput.style.boxShadow = ''; coinsInput.style.borderColor = ''; }, 1500);
            }

            // Nâng Cấp/XP
            if (levelInput && xpInput) {
                const currentLv = parseInt(levelInput.value || 1);
                if (currentLv < targetLevel) {
                    levelInput.value = targetLevel;
                    xpInput.value = (targetLevel - 1) * 30; // 30 XP mỗi cấp
                    levelInput.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                    levelInput.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                    setTimeout(() => { levelInput.style.boxShadow = ''; levelInput.style.borderColor = ''; }, 1500);
                }
            }

            if (summaryEl) {
                summaryEl.textContent = `✅ Đã cộng ${bonusCoins.toLocaleString('vi-VN')} Xu & thăng cấp đặc quyền cho gói ${plan}!`;
                summaryEl.style.color = '#34d399';
            }
        };

        // ── KHO VẬT PHẨM POPUP ────────────────────────────────────────────
        window.openInventoryPanel = (userId) => {
            // Create overlay popup
            const overlay = document.createElement('div');
            overlay.id = 'inventoryOverlay';
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:10000; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s ease;';
            
            const invFrames = document.getElementById('adminCoinsInput') ? 
                (window._currentInventoryFrames || []) : [];
            const invBanners = window._currentInventoryBanners || [];
            const equippedFrame = window._currentEquippedFrame || '—';

            overlay.innerHTML = `
                <div style="background: rgba(16,16,28,0.98); border: 1px solid rgba(147,51,234,0.3); border-radius: 24px; padding: 28px; width: 500px; max-width: 94vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(147,51,234,0.2);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:22px;">
                        <h3 style="color:#fff; font-size:16px; font-weight:900; display:flex; align-items:center; gap:12px; margin:0;">
                            <div style="width:34px; height:34px; border-radius:10px; background:rgba(147,51,234,0.15); display:flex; align-items:center; justify-content:center; color:#a855f7;">📦</div>
                            KHO VẬT PHẨM
                        </h3>
                        <button onclick="document.getElementById('inventoryOverlay').remove()" style="width:32px; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.6); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                    </div>
                    
                    <div style="padding:16px; background:linear-gradient(135deg,rgba(147,51,234,0.1),rgba(79,70,229,0.1)); border-radius:16px; border:1px solid rgba(147,51,234,0.2); margin-bottom:18px;">
                        <div style="font-size:10px; color:rgba(168,85,247,0.8); font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Khung Đang Trang Bị</div>
                        <div style="font-size:18px; font-weight:900; color:#fff;">${equippedFrame}</div>
                    </div>

                    <div style="padding:18px; background:rgba(0,0,0,0.2); border-radius:16px; border:1px solid rgba(255,255,255,0.04); margin-bottom:14px;">
                        <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; margin-bottom:14px;">🖼 Tặng Vật Phẩm Mới</div>
                        <div style="display:flex; gap:10px;">
                            <select id="invGiftType" style="height:44px; background:#fff; color:#000; font-weight:800; border:none; border-radius:10px; padding:0 12px; cursor:pointer;" onchange="window.handleGiftTypeChange && handleGiftTypeChange(this)">
                                <option value="frame">KHUNG</option>
                                <option value="banner">ẢNH BÌA</option>
                            </select>
                            <select id="adminGiftId" style="flex:1; height:44px; background:#fff; color:#000; font-weight:700; border:none; border-radius:10px; padding:0 12px;"></select>
                            <button onclick="giftItemToUser('${userId}')" style="width:44px; height:44px; background:#9333ea; border:none; border-radius:10px; color:#fff; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px rgba(147,51,234,0.3);">+</button>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        <div style="padding:14px; background:rgba(0,0,0,0.15); border-radius:12px; border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:10px; text-transform:uppercase;">KHUNG (${(window._currentInventoryFrames||[]).length})</div>
                            <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:120px; overflow-y:auto;">
                                ${(window._currentInventoryFrames||[]).length === 0 ? '<span style="font-size:11px; color:#555;">Chưa có khung</span>' : (window._currentInventoryFrames||[]).map(f => `<span style="background:rgba(147,51,234,0.1); border:1px solid rgba(147,51,234,0.2); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; color:#c084fc;">${f}</span>`).join('')}
                            </div>
                        </div>
                        <div style="padding:14px; background:rgba(0,0,0,0.15); border-radius:12px; border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:900; margin-bottom:10px; text-transform:uppercase;">BÌA (${(window._currentInventoryBanners||[]).length})</div>
                            <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:120px; overflow-y:auto;">
                                ${(window._currentInventoryBanners||[]).length === 0 ? '<span style="font-size:11px; color:#555;">Chưa có ảnh bìa</span>' : (window._currentInventoryBanners||[]).map(b => `<span style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; color:#60a5fa;">${b}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            if (typeof updateGiftIdDropdown === 'function') updateGiftIdDropdown('frame');
        };

        
        window.saveAdminCoins = async (uid) => {
            const btn = document.getElementById('saveCoinsBtn');
            const orig = btn.innerHTML;
            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Đang nạp...';
            btn.disabled = true;
            
            const c = parseInt(document.getElementById('adminCoinsInput').value || 0);
            const x = parseInt(document.getElementById('adminXpInput').value || 0);
            const transRef = document.getElementById('adminTransRefInput').value.trim();
            const msg = document.getElementById('adminMessageInput').value.trim();
            
            try {
                const res = await fetch(`${API_URL}/users/${uid}/gamification`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        coins: c, 
                        xp: x, 
                        transactionRef: transRef, 
                        message: msg || 'Nạp Xu bổ sung vào tài khoản' 
                    })
                });
                const data = await res.json();
                if(data.success) {
                    showToast('⚡ Đã nạp Xu thành công!', 'success');
                    if (document.getElementById('usersTableBody')) loadUsers(true);
                } else throw new Error(data.message);
            } catch(e) {
                showToast('Lỗi nạp xu: ' + e.message, 'error');
            } finally {
                btn.innerHTML = orig; btn.disabled = false;
            }
        };

        window.saveAdminSubscription = async (uid) => {
            const btn = document.getElementById('savePlanBtn');
            const orig = btn.innerHTML;
            
            // AUTOMATIC REWARDS INTEGRATION
            const rewardBox = document.getElementById('autoApplyRewards');
            if (rewardBox && rewardBox.checked) {
                console.log('🎁 Auto-applying rewards for plan before saving...');
                applyPlanRewards();
            }

            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Đang kích hoạt...';
            btn.disabled = true;
            
            const plan = document.getElementById('adminPlanInput').value;
            const expiry = document.getElementById('adminExpiryInput').value;
            const coins = parseInt(document.getElementById('adminCoinsInput')?.value || 0);
            const xp = parseInt(document.getElementById('adminXpInput')?.value || 0);
            const transRef = document.getElementById('adminTransRefInput').value.trim();
            const msg = document.getElementById('adminMessageInput').value.trim();
            
            try {
                const res = await fetch(`${API_URL}/users/${uid}/gamification`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        coins: coins,
                        xp: xp,
                        subscription: {
                            plan: plan,
                            startDate: plan !== 'FREE' ? new Date().toISOString() : null,
                            endDate: expiry ? new Date(expiry).toISOString() : null
                        },
                        transactionRef: transRef,
                        message: msg || undefined 
                    })
                });
                const data = await res.json();
                if(data.success) {
                    showToast('🌟 Đã kích hoạt gói Hội viên thành công!', 'success');
                    if (document.getElementById('usersTableBody')) loadUsers(true);
                } else throw new Error(data.message);
            } catch(e) {
                showToast('Lỗi kích hoạt: ' + e.message, 'error');
            } finally {
                btn.innerHTML = orig; btn.disabled = false;
            }
        };
        
        window.giftItemToUser = async (uid) => {
            const type = document.getElementById('adminGiftType').value;
            const itemId = document.getElementById('adminGiftId').value.trim();
            if(!itemId) return alert('Vui lòng nhập ID!');
            
            try {
                 const payload = {};
                 if(type === 'frame') payload.frameToAdd = itemId;
                 else payload.bannerToAdd = itemId;
                 
                 const resGift = await fetch(`${API_URL}/users/${uid}/gamification`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const dGift = await resGift.json();
                if(dGift.success) {
                     showToast('✅ Đã cấp tặng vật phẩm thành công!', 'success');
                     viewUserDetail(uid); // Re-render modal to show new item
                     // Also refresh underlying table
                     if (document.getElementById('usersTableBody')) {
                         loadUsers(true);
                     } else if (typeof loadSubscriptions === 'function') {
                         loadSubscriptions();
                     }
                }
            } catch(e) { alert('Lỗi ' + e.message); }
        };

        if (window.lucide) lucide.createIcons();

        // ✅ AUTO-HIGHLIGHT CURRENT PLAN
        setTimeout(() => {
            const currentPlan = user.subscription?.plan || 'FREE';
            console.log('🎯 Auto-highlighting current user plan:', currentPlan);
            if (typeof selectPlanCard === 'function') selectPlanCard(currentPlan, true); // true = isAutoInit
        }, 100);
    } catch (error) {
        console.error('❌ Detailed Error loading user:', error);
        showToast(`Lỗi tải chi tiết: ${error.message}`, 'error');
    } finally {
        // Hide standard loading by just relying on final modal open overwriting view
    }
}


// Update Dropdown Gift Items based on selected type (frame or banner)
function updateGiftIdDropdown(type) {
    const selectEl = document.getElementById('adminGiftId');
    if (!selectEl) return;
    
    const data = type === 'frame' ? MASTER_SHOP_DATA.frames : MASTER_SHOP_DATA.banners;
    
    // Clear and populate
    selectEl.innerHTML = data.map(item => {
        return `<option value="${item.id}" style="color:#fff; background:#1e1e2e;">${item.name} (${item.rarity.toUpperCase()})</option>`;
    }).join('');
    
    if (data.length === 0) {
        selectEl.innerHTML = '<option value="" disabled selected>Không tìm thấy vật phẩm</option>';
    }
}

// Gift Item Interaction Helper for DOM Event
window.handleGiftTypeChange = function(sel) {
    updateGiftIdDropdown(sel.value);
};

// Toggle user status - Update MongoDB
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    const action = newStatus === 'blocked' ? 'khóa' : 'mở khóa';

    if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${user.name}"?`)) {
        return;
    }

    const token = getAdminToken();
    if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        return;
    }

    try {
        console.log(`🔄 ${action} user ${userId}...`);

        const response = await fetch(`${API_URL}/users/${userId}/block`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isBlocked: newStatus === 'blocked'
            })
        });

        const data = await response.json();
        console.log('📊 Toggle response:', data);

        if (data.success) {
            user.status = newStatus;
            user.isBlocked = newStatus === 'blocked';
            renderUsers();
            closeModal();
            showToast(`✅ Đã ${action} tài khoản thành công`, 'success');

            // Reload to sync with database
            setTimeout(() => loadUsers(true), 1000);
        } else {
            throw new Error(data.message || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error('❌ Error toggling user status:', error);
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

// Delete user from MongoDB
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.name}" không?\nHành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu của người dùng này trên cơ sở dữ liệu MongoDB.`)) {
        return;
    }

    const token = getAdminToken();
    if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        return;
    }

    try {
        console.log(`🗑️ Deleting user ${userId}...`);

        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // The endpoint may return 204 No Content, in which case we shouldn't attempt to parse JSON.
        // Let's handle generic HTTP errors.
        if (!response.ok) {
            let errorMsg = 'Lỗi không xác định';
            try {
                const data = await response.json();
                if (data.message) errorMsg = data.message;
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        let data = { success: true };
        try {
            data = await response.json();
        } catch(e) {} // Ignore if no json body

        if (data.success || response.status === 200 || response.status === 204 || response.status === 201) {
            closeModal();
            showToast(`✅ Đã xóa tài khoản thành công`, 'success');

            // Reload to sync with database
            setTimeout(() => loadUsers(true), 1000);
        } else {
            throw new Error(data.message || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showToast(`Lỗi xóa tài khoản: ${error.message}`, 'error');
    }
}

// Send notification to user
function sendNotificationToUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    closeModal();

    showModal(`
        <div class="modal-box">
            <div class="modal-header">
                <h3>Gửi thông báo</h3>
                <button onclick="closeModal()" class="modal-close"><i data-lucide="x"></i></button>
            </div>
            
            <form onsubmit="sendNotification(event, '${userId}')">
                <div class="modal-body">
                    <p style="color: var(--text-muted); margin-bottom: 16px;">Gửi đến: <span style="color: var(--text-primary); font-weight: bold;">${user.name}</span></p>
                    
                    <div style="margin-bottom: 16px;">
                        <label class="form-label" style="display:block; margin-bottom: 8px;">Tiêu đề</label>
                        <input type="text" id="notifTitle" required class="form-control-dark" placeholder="Nhập tiêu đề..." />
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 8px;">Nội dung</label>
                        <textarea id="notifMessage" required rows="4" class="form-control-dark" placeholder="Nhập nội dung thông báo..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Gửi thông báo
                    </button>
                </div>
            </form>
        </div>
    `);
}

// Send notification
function sendNotification(event, userId) {
    event.preventDefault();

    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;

    // Save notification (try both storage methods)
    try {
        const notifications = JSON.parse(localStorage.getItem('cinestream_notifications') || '[]');
        notifications.push({
            id: Date.now().toString(),
            userId,
            title,
            message,
            createdAt: new Date().toISOString(),
            read: false
        });
        localStorage.setItem('cinestream_notifications', JSON.stringify(notifications));
    } catch (e) {
        console.warn('Could not save to localStorage');
    }

    closeModal();
    showToast('Đã gửi thông báo thành công', 'success');
}

// Show modal
function showModal(html) {
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal-overlay show';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.remove();
}

// Show toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-[200] px-6 py-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
        } text-white font-medium animate-fade-in`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update stat cards
function updateStats() {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    
    const total = allUsers.length;
    const free = allUsers.filter(u => !u.subscription || !u.subscription.plan || u.subscription.plan.toUpperCase() === 'FREE').length;
    const premium = allUsers.filter(u => u.subscription && (u.subscription.plan.toUpperCase() === 'PREMIUM' || u.subscription.plan.toUpperCase() === 'FAMILY')).length;
    const blocked = allUsers.filter(u => u.status === 'blocked').length;

    el('statTotalUsers', total);
    el('statFreeUsers', free);
    el('statPremiumUsers', premium);
    el('statBlockedUsers', blocked);
}

// Logout
function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        try { sessionStorage.removeItem('cinestream_admin_token'); } catch (e) { }
        try { localStorage.removeItem('cinestream_admin_token'); } catch (e) { }
        window.location.href = '/admin/login.html';
    }
}

// Export functions for global access
window.loadUsers = loadUsers;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;
window.viewUserDetail = viewUserDetail;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.sendNotificationToUser = sendNotificationToUser;
window.sendNotification = sendNotification;
window.closeModal = closeModal;
window.logout = logout;

// Broadcast System Notification
window.openBroadcastModal = function() {
    const html = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 style="display:flex; align-items:center; gap:10px;">
                    <i data-lucide="megaphone" style="color:#a78bfa;"></i>
                    Phát thông báo toàn hệ thống
                </h3>
                <button onclick="closeModal()" class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">
                    Thông báo này sẽ được gửi tới <b>TẤT CẢ</b> người dùng đang trực tuyến và lưu vào chuông thông báo của họ.
                </p>
                <div style="margin-bottom: 15px;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">TIÊU ĐỀ</label>
                    <input type="text" id="broadcastTitle" class="form-control-dark" placeholder="VD: Bảo trì hệ thống" style="margin-top:6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">NỘI DUNG THÔNG BÁO</label>
                    <textarea id="broadcastMessage" class="form-control-dark" style="margin-top:6px; min-height:100px; font-size:13px; resize:none;" placeholder="Nhập nội dung thông báo..."></textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">LOẠI THÔNG BÁO</label>
                    <select id="broadcastType" class="form-control-dark" style="margin-top:6px;">
                        <option value="admin">Thông báo Admin</option>
                        <option value="system">Thông báo Hệ thống</option>
                        <option value="event">Sự kiện mới</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer" style="display:flex; gap:10px;">
                <button onclick="closeModal()" class="btn btn-secondary" style="flex:1;">Hủy</button>
                <button id="sendBroadcastBtn" onclick="sendBroadcast()" class="btn btn-primary" style="flex:2; background:#a78bfa; color:#fff; border:none; font-weight:bold;">
                    <i data-lucide="send" style="width:16px;"></i> GỬI NGAY BÂY GIỜ
                </button>
            </div>
        </div>
    `;
    showModal(html);
};

window.sendBroadcast = async function() {
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    const type = document.getElementById('broadcastType').value;
    const btn = document.getElementById('sendBroadcastBtn');

    if (!message) {
        showToast('Vui lòng nhập nội dung thông báo', 'error');
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="spinner-sm"></i> Đang gửi...';
        
        const token = typeof getAdminToken === 'function' ? getAdminToken() : (localStorage.getItem('cinestream_admin_token') || sessionStorage.getItem('cinestream_admin_token'));
        
        const res = await fetch(`${API_URL}/users/broadcast`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ title, message, type })
        });

        const data = await res.json();
        if (data.success) {
            showToast('✅ Đã gửi thông báo toàn hệ thống thành công!', 'success');
            closeModal();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Broadcast error:', error);
        showToast('❌ Lỗi khi gửi thông báo: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;"></i> GỬI NGAY BÂY GIỜ';
        if (window.lucide) lucide.createIcons();
    }
};
window.applyPlanRewards = function() {
    const plan = document.getElementById('adminPlanInput').value;
    const coinsInput = document.getElementById('adminCoinsInput');
    const xpInput = document.getElementById('adminXpInput');
    const levelInput = document.getElementById('adminLevelInput');
    const msgInput = document.getElementById('adminMessageInput');
    const expiryInput = document.getElementById('adminExpiryInput');
    
    if (plan === 'FREE') {
        showToast('Gói FREE không có quà tặng kèm.', 'info');
        return;
    }
    
    let bonusXu = 0;
    let bonusXp = 0;
    let planName = '';
    let durationDays = 30;
    
    if (plan === 'PREMIUM') {
        bonusXu = 30000;
        bonusXp = 500;
        planName = 'Premium (Cao Cấp)';
        durationDays = 30;
    } else if (plan === 'FAMILY') {
        bonusXu = 200000;
        bonusXp = 2000;
        planName = 'Family (Gia Đình)';
        durationDays = 365;
    }
    
    // Calculate new values
    const currentCoins = parseInt(coinsInput.value) || 0;
    const currentXp = parseInt(xpInput.value) || 0;
    
    const newCoins = currentCoins + bonusXu;
    const newXp = currentXp + bonusXp;
    const newLevel = Math.floor(newXp / 30) + 1;
    
    // Update UI inputs
    coinsInput.value = newCoins;
    xpInput.value = newXp;
    levelInput.value = newLevel;
    
    // Auto set expiry
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    expiryInput.value = d.toISOString().split('T')[0];
    
    // Auto fill message
    const customMsg = `Hệ thống đã kích hoạt thành công gói ${planName} và gửi tặng bạn ${bonusXu.toLocaleString()} Xu + ${bonusXp} XP (Lên cấp ${newLevel}). Chúc bạn trải nghiệm tuyệt vời!`;
    msgInput.value = customMsg;
    
    // Visual feedback
    showToast(`✅ Đã áp dụng đặc quyền gói ${planName}: +${bonusXu.toLocaleString()} Xu, +${bonusXp} XP.`, 'success');
    
    // Animation highlight
    const fields = [coinsInput, xpInput, levelInput, expiryInput];
    fields.forEach(f => {
        f.style.transition = 'all 0.3s ease';
        f.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.4)';
        f.style.borderColor = '#22c55e';
    });
    
    setTimeout(() => {
        fields.forEach(f => {
            f.style.boxShadow = '';
            f.style.borderColor = '';
        });
    }, 2000);
};
