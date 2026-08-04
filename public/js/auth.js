// Authentication Service with Backend Integration
const STORAGE_KEYS = {
    USER: 'cinestream_user',
    TOKEN: 'cinestream_token',
    TOKEN_EXPIRY: 'cinestream_token_expiry',
    REMEMBER_ME: 'cinestream_remember_me',
    THEME: 'cinestream_theme',
    FAVORITES: 'cinestream_favorites',
    WATCH_HISTORY: 'cinestream_watch_history',
    WATCH_PROGRESS: 'cinestream_watch_progress',
    SUBSCRIPTION: 'cinestream_subscription',
    PLAYLISTS: 'cinestream_playlists'
};


class AuthService {
    constructor() {
        this.backendURL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api';
        // Always use backend for authentication
        this.useBackend = typeof API_CONFIG !== 'undefined' ? API_CONFIG.USE_BACKEND_FOR_AUTH : true;
        
        // 🚀 FIX SAFARI SESSION LOSS: Restore data from secure persistent cookies if localStorage got cleared
        this.restoreFromCookies();

        this.currentUser = this.loadUser();
        this.refreshInterval = null;

        // Background auto-sync to pull latest avatar/favorites/history from MongoDB
        // Only sync if user is logged in
        if (this.isLoggedIn()) {
            setTimeout(() => this.syncProfile(), 100);
        }

        // Start auto token refresh ONLY if user is logged in
        if (this.isLoggedIn()) {
            this.startTokenRefresh();
        }

        console.log('🔐 AuthService initialized:', {
            backendURL: this.backendURL,
            useBackend: this.useBackend
        });
    }

    // 🍪 SECURE COOKIE DOUBLE-LOCK MECHANISM
    // This fixes Safari losing session upon browser closing
    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        // Use domain-wide path, secure and lax attributes
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + (window.location.protocol === 'https:' ? '; Secure' : '');
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    eraseCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    restoreFromCookies() {
        try {
            const cookieToken = this.getCookie(STORAGE_KEYS.TOKEN);
            const localToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
            
            if (cookieToken && !localToken) {
                console.log('🔄 [Safari Protection] Restoring authentication token from persistent Cookie...');
                localStorage.setItem(STORAGE_KEYS.TOKEN, cookieToken);
                
                const cookieUser = this.getCookie(STORAGE_KEYS.USER);
                if (cookieUser) {
                    localStorage.setItem(STORAGE_KEYS.USER, decodeURIComponent(cookieUser));
                }
            }
        } catch (e) {
            console.warn('[AuthService] Restore from cookies failed', e);
        }
    }

    // Load user from localStorage
    loadUser() {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Fetch latest user data from backend
    async syncProfile() {
        if (!this.useBackend || !this.isLoggedIn()) return;
        
        // --- TỐI ƯU API RAILWAY: CHỈ ĐỒNG BỘ 1 LẦN MỖI PHIÊN CHO USER FREE ---
        const user = this.loadUser();
        const sub = user?.subscription;
        let isFree = true;
        
        if (sub && sub.plan && sub.plan !== 'FREE') {
            const endDate = sub.endDate || sub.expiresAt;
            let isExpired = false;
            if (endDate) {
                const expiry = new Date(endDate);
                expiry.setDate(expiry.getDate() + 1);
                if (new Date() > expiry) isExpired = true;
            }
            if (!isExpired && sub.status !== 'blocked' && sub.status !== 'inactive') {
                isFree = false; // Đang là Premium
            }
        }
        
        // Nếu user là FREE, chỉ gọi /auth/me đúng 1 lần khi mới mở web
        if (isFree) {
            if (sessionStorage.getItem('aphim_free_synced') === '1') {
                // Đã check rồi -> Bỏ qua luôn, không tốn token!
                return;
            }
        }

        try {
            const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
            const response = await fetch(`${this.backendURL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success && data.data) {
                const serverUser = data.data;
                const localPlaylistsStr = localStorage.getItem('cinestream_playlists');
                const localPlaylists = localPlaylistsStr ? JSON.parse(localPlaylistsStr) : [];

                // Trường hợp đặc biệt: Server chưa có playlists nhưng local đã có (do mới nâng cấp hệ thống)
                if ((!serverUser.playlists || serverUser.playlists.length === 0) && localPlaylists.length > 0) {
                    console.log('📤 Pushing local playlists to server...');
                    this.updateProfile({ playlists: localPlaylists });
                } else {
                    // Background update localStorage
                    this.saveUser(serverUser);

                    // Đồng bộ Playlists chuyên sâu
                    if (serverUser.playlists && typeof playlistService !== 'undefined') {
                        playlistService.syncFromProfile(serverUser.playlists);
                    }
                }

                // Dispatch event in case UI wants to refresh
                window.dispatchEvent(new CustomEvent('auth:profileSynced', { detail: serverUser }));
                
                // --- ĐÁNH DẤU CHO PHIÊN LÀM VIỆC NẾU USER FREE ---
                const serverSub = serverUser.subscription;
                let serverIsFree = true;
                if (serverSub && serverSub.plan && serverSub.plan !== 'FREE') {
                    const sEndDate = serverSub.endDate || serverSub.expiresAt;
                    let sIsExpired = false;
                    if (sEndDate) {
                        const sExpiry = new Date(sEndDate);
                        sExpiry.setDate(sExpiry.getDate() + 1);
                        if (new Date() > sExpiry) sIsExpired = true;
                    }
                    if (!sIsExpired && serverSub.status !== 'blocked' && serverSub.status !== 'inactive') {
                        serverIsFree = false;
                    }
                }
                
                if (serverIsFree) {
                    sessionStorage.setItem('aphim_free_synced', '1');
                } else {
                    sessionStorage.removeItem('aphim_free_synced');
                }
            }
        } catch (e) {
            console.warn('[AuthService] Auto-sync profile failed', e);
        }
    }

    // Save user to localStorage
    saveUser(user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user;

        // Backup serialized user object to a persistent cookie
        const rememberMe = this.getRememberMe();
        const days = rememberMe ? 90 : 30;
        this.setCookie(STORAGE_KEYS.USER, encodeURIComponent(JSON.stringify(user)), days);

        // Sync arrays back to local storage
        if (user.favorites) {
            localStorage.setItem('cinestream_favorites', JSON.stringify(user.favorites));
        }
        if (user.watchHistory) {
            localStorage.setItem('cinestream_watch_history', JSON.stringify(user.watchHistory));
        }
        // Cập nhật: Đồng bộ TIẾN TRÌNH XEM PHIM (giây hiện tại, % hoàn thành) từ Server
        if (user.watchProgress) {
            localStorage.setItem('cinestream_watch_progress', JSON.stringify(user.watchProgress));
        }
        // Đảm bảo đồng bộ Playlists nếu có trong dữ liệu server
        if (user.playlists && Array.isArray(user.playlists)) {
            localStorage.setItem('cinestream_playlists', JSON.stringify(user.playlists));
        }

        // ĐỒNG BỘ DỮ LIỆU TRANG TRÍ (Frames & Banners)
        if (user.equippedFrameClass) localStorage.setItem('ap_frame_class', user.equippedFrameClass);
        if (user.equippedFrame) localStorage.setItem('ap_frame_id', user.equippedFrame);
        if (user.profileCover) localStorage.setItem('ap_profile_cover', user.profileCover);
    }

    // Register new user
    async register(email, password, name, phone = '', rememberMe = false) {
        if (this.useBackend) {
            try {
                console.log('📝 Registering via backend:', email);
                const response = await fetch(`${this.backendURL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name, phone, rememberMe })
                });

                const data = await response.json();
                console.log('📊 Backend response:', data);

                if (data.success) {
                    this.saveUser(data.user);
                    this.saveToken(data.token, data.expiresIn);
                    this.saveRememberMe(rememberMe);
                    this.startTokenRefresh();
                    console.log('✅ Registration successful');
                    return { success: true, user: data.user };
                }
                console.log('❌ Registration failed:', data.message);
                return { success: false, message: data.message };
            } catch (error) {
                console.error('❌ Register error:', error);
                return { success: false, message: 'Lỗi kết nối server. Vui lòng kiểm tra backend đang chạy.' };
            }
        }

        // If backend is disabled, show error
        return {
            success: false,
            message: 'Backend authentication is required. Please enable USE_BACKEND_FOR_AUTH in config.'
        };
    }

    // Login user
    async login(email, password, rememberMe = false) {
        if (this.useBackend) {
            try {
                console.log('🔐 Logging in via backend:', email, 'Remember Me:', rememberMe);
                const response = await fetch(`${this.backendURL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, rememberMe })
                });

                const data = await response.json();
                console.log('📊 Backend response:', data);

                if (data.success) {
                    this.saveUser(data.user);
                    this.saveToken(data.token, data.expiresIn);
                    this.saveRememberMe(rememberMe);
                    this.startTokenRefresh();
                    console.log('✅ Login successful, token saved with expiry:', data.expiresIn);
                    return { success: true, user: data.user };
                }
                console.log('❌ Login failed:', data.message);
                return { success: false, message: data.message };
            } catch (error) {
                console.error('❌ Login error:', error);
                return { success: false, message: 'Lỗi kết nối server. Vui lòng kiểm tra backend đang chạy.' };
            }
        }

        // If backend is disabled, show error
        return {
            success: false,
            message: 'Backend authentication is required. Please enable USE_BACKEND_FOR_AUTH in config.'
        };
    }

    // Logout
    logout() {
        this.stopTokenRefresh();
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        
        // Wipe corresponding cookies
        this.eraseCookie(STORAGE_KEYS.TOKEN);
        this.eraseCookie(STORAGE_KEYS.USER);

        this.currentUser = null;

        // Thông báo cho các module khác (premium-ad-blocker, v.v.)
        window.dispatchEvent(new CustomEvent('auth:logout'));

        window.location.href = 'index.html';
    }

    // Check if logged in
    isLoggedIn() {
        return this.currentUser !== null && localStorage.getItem(STORAGE_KEYS.TOKEN) !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Update profile
    async updateProfile(updates) {
        if (!this.currentUser) return { success: false, message: 'Chưa đăng nhập' };

        if (this.useBackend) {
            try {
                const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
                const response = await fetch(`${this.backendURL}/auth/updatedetails`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updates)
                });

                const data = await response.json();
                if (data.success) {
                    this.saveUser(data.data);
                    return { success: true, user: data.data };
                }
                return { success: false, message: data.message };
            } catch (error) {
                return { success: false, message: 'Lỗi kết nối server' };
            }
        }

        // Fallback
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === this.currentUser.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem('cinestream_all_users', JSON.stringify(users));
            this.saveUser(users[index]);
            return { success: true, user: users[index] };
        }
        return { success: false, message: 'Không tìm thấy người dùng' };
    }

    // Change password
    async changePassword(oldPassword, newPassword) {
        if (!this.currentUser) return { success: false, message: 'Chưa đăng nhập' };

        if (this.useBackend) {
            try {
                const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
                const response = await fetch(`${this.backendURL}/auth/updatepassword`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword: oldPassword, newPassword })
                });

                const data = await response.json();
                if (data.success) {
                    this.saveToken(data.token);
                    return { success: true };
                }
                return { success: false, message: data.message };
            } catch (error) {
                return { success: false, message: 'Lỗi kết nối server' };
            }
        }

        // Fallback
        if (this.currentUser.password !== btoa(oldPassword)) {
            return { success: false, message: 'Mật khẩu cũ không đúng' };
        }
        return this.updateProfile({ password: btoa(newPassword) });
    }

    // Helper methods
    getAllUsers() {
        const usersStr = localStorage.getItem('cinestream_all_users');
        return usersStr ? JSON.parse(usersStr) : [];
    }

    generateToken(user) {
        return btoa(JSON.stringify({ id: user.id, email: user.email, timestamp: Date.now() }));
    }

    saveToken(token, expiresIn = '30d') {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);

        // Calculate expiry timestamp
        const expiryMs = this.parseExpiry(expiresIn);
        const expiryTimestamp = Date.now() + expiryMs;
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTimestamp.toString());

        // Save backup token to persistent cookie
        const days = Math.ceil(expiryMs / (24 * 60 * 60 * 1000));
        this.setCookie(STORAGE_KEYS.TOKEN, token, days);
    }

    saveRememberMe(rememberMe) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
    }

    getRememberMe() {
        return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    }

    parseExpiry(expiresIn) {
        // Parse expiry string like "30d", "90d", "7d" to milliseconds
        const match = expiresIn.match(/^(\d+)([dhms])$/);
        if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            case 's': return value * 1000;
            default: return 30 * 24 * 60 * 60 * 1000;
        }
    }

    getTokenExpiry() {
        const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
        return expiry ? parseInt(expiry) : null;
    }

    isTokenExpiringSoon() {
        const expiry = this.getTokenExpiry();
        if (!expiry) return true;

        // Refresh if token expires in less than 7 days
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        return (expiry - Date.now()) < sevenDays;
    }

    async refreshToken() {
        // Don't refresh if not logged in or no token
        if (!this.isLoggedIn()) {
            console.log('⏭️ Skip token refresh - not logged in');
            return false;
        }

        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) {
            console.log('⏭️ Skip token refresh - no token found');
            return false;
        }

        try {
            const rememberMe = this.getRememberMe();

            console.log('🔄 Refreshing token... Remember Me:', rememberMe);

            const response = await fetch(`${this.backendURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rememberMe })
            });

            // Handle 401 - token expired, logout user
            if (response.status === 401) {
                console.warn('⚠️ Token expired, logging out...');
                this.stopTokenRefresh();
                localStorage.removeItem(STORAGE_KEYS.USER);
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
                localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
                
                // Erase Cookies on force expired 401
                this.eraseCookie(STORAGE_KEYS.TOKEN);
                this.eraseCookie(STORAGE_KEYS.USER);

                this.currentUser = null;
                return false;
            }

            const data = await response.json();

            if (data.success) {
                this.saveToken(data.token, data.expiresIn);
                console.log('✅ Token refreshed successfully, new expiry:', data.expiresIn);
                return true;
            } else {
                console.warn('⚠️ Token refresh failed:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return false;
        }
    }

    startTokenRefresh() {
        // Clear any existing interval
        this.stopTokenRefresh();

        // Don't start refresh if not logged in
        if (!this.isLoggedIn()) {
            console.log('⏭️ Skip token refresh setup - not logged in');
            return;
        }

        // Check token expiry every 6 hours
        this.refreshInterval = setInterval(async () => {
            if (this.isLoggedIn() && this.isTokenExpiringSoon()) {
                console.log('⏰ Token expiring soon, refreshing...');
                await this.refreshToken();
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

        // Also check immediately on startup (after 5 seconds)
        setTimeout(async () => {
            if (this.isLoggedIn() && this.isTokenExpiringSoon()) {
                console.log('⏰ Token expiring soon on startup, refreshing...');
                await this.refreshToken();
            }
        }, 5000); // 5 seconds after startup
    }

    stopTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Social login
    socialLogin(provider, profile) {
        if (!profile || !profile.email) {
            return { success: false, message: 'Thông tin không hợp lệ' };
        }

        // Check if user exists
        const users = this.getAllUsers();
        let user = users.find(u => u.email === profile.email);

        if (!user) {
            // Create new user from social profile
            user = {
                id: Date.now().toString(),
                email: profile.email,
                name: profile.name || profile.email.split('@')[0],
                phone: '',
                password: '', // No password for social login
                avatar: profile.picture || '',
                subscription: { plan: 'FREE' },
                socialProvider: provider,
                createdAt: new Date().toISOString()
            };

            users.push(user);
            localStorage.setItem('cinestream_all_users', JSON.stringify(users));
        }

        this.saveUser(user);
        this.saveToken(this.generateToken(user));

        return { success: true, user };
    }

    // Password reset
    async requestPasswordReset(email) {
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.backendURL}/auth/forgotpassword`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                return await response.json();
            } catch (error) {
                return { success: false, message: 'Lỗi kết nối server' };
            }
        }

        // Fallback
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);
        if (!user) return { success: false, message: 'Email không tồn tại' };

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('cinestream_reset_otp', JSON.stringify({ email, otp, expires: Date.now() + 300000 }));
        console.log('OTP:', otp);
        return { success: true, message: 'Mã OTP đã được gửi', otp };
    }

    resetPassword(email, otp, newPassword) {
        const resetData = localStorage.getItem('cinestream_reset_otp');
        if (!resetData) return { success: false, message: 'Không tìm thấy yêu cầu đặt lại mật khẩu' };

        const { email: savedEmail, otp: savedOtp, expires } = JSON.parse(resetData);
        if (email !== savedEmail || otp !== savedOtp) return { success: false, message: 'Mã OTP không đúng' };
        if (Date.now() > expires) return { success: false, message: 'Mã OTP đã hết hạn' };

        const users = this.getAllUsers();
        const index = users.findIndex(u => u.email === email);
        if (index !== -1) {
            users[index].password = btoa(newPassword);
            localStorage.setItem('cinestream_all_users', JSON.stringify(users));
            localStorage.removeItem('cinestream_reset_otp');
            return { success: true, message: 'Đặt lại mật khẩu thành công' };
        }
        return { success: false, message: 'Không tìm thấy người dùng' };
    }
}

// Initialize Auth Service
const authService = new AuthService();
