// Admin Authentication Service
class AdminAuthService {
    constructor() {
        // Don't auto-check on construction to prevent redirect loops
        // Pages will manually call checkAuth() if needed
    }

    // Check if admin is logged in
    isLoggedIn() {
        // Check both backend token and local token
        const backendToken = localStorage.getItem('cinestream_admin_token');
        const localToken = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
        return backendToken !== null || localToken !== null;
    }

    // Login admin
    login(username, password) {
        if (username === ADMIN_CONFIG.ADMIN_CREDENTIALS.username &&
            password === ADMIN_CONFIG.ADMIN_CREDENTIALS.password) {

            const token = btoa(JSON.stringify({
                username,
                timestamp: Date.now()
            }));

            localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN, token);
            return { success: true };
        }

        return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
    }

    // Logout admin
    logout() {
        // Remove both tokens
        localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
        localStorage.removeItem('cinestream_admin_token');
        localStorage.removeItem('cinestream_admin_user');
        window.location.href = '/admin/login.html';
    }

    // Check authentication and redirect if needed
    checkAuth() {
        const currentPage = window.location.pathname;
        const isLoginPage = currentPage.includes('login.html');
        const isLoggedIn = this.isLoggedIn();

        // Only redirect if not already redirecting
        if (!isLoggedIn && !isLoginPage) {
            // Not logged in and not on login page -> redirect to login
            window.location.href = '/admin/login.html';
        }
        // Don't auto-redirect from login to dashboard to prevent loops
        // Let the login form handle the redirect after successful login
    }

    // Get admin info
    getAdminInfo() {
        const token = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
        if (!token) return null;

        try {
            return JSON.parse(atob(token));
        } catch (e) {
            return null;
        }
    }
}

// Initialize Admin Auth Service
const adminAuthService = new AdminAuthService();
