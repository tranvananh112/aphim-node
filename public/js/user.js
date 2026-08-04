// User Service - Favorites, History, Progress
class UserService {
    constructor() {
        this.authService = authService;
        this.lastProgressSyncTime = 0; // Kiểm soát tần suất đồng bộ cloud
    }

    // Get user favorites
    getFavorites() {
        const favStr = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        return favStr ? JSON.parse(favStr) : [];
    }

    // Add to favorites
    addToFavorites(movie) {
        if (!this.authService.isLoggedIn()) {
            alert('Vui lòng đăng nhập để sử dụng tính năng này');
            return false;
        }

        const favorites = this.getFavorites();
        const exists = favorites.find(m => m.slug === movie.slug);

        if (exists) {
            return false;
        }

        favorites.push({
            slug: movie.slug,
            name: movie.name,
            thumb_url: movie.thumb_url,
            year: movie.year,
            addedAt: new Date().toISOString()
        });

        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        this.authService.updateProfile({ favorites }).catch(()=>{});
        return true;
    }

    // Remove from favorites
    removeFromFavorites(slug) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(m => m.slug !== slug);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
        this.authService.updateProfile({ favorites: filtered }).catch(()=>{});
        return true;
    }

    // Check if movie is in favorites
    isFavorite(slug) {
        const favorites = this.getFavorites();
        return favorites.some(m => m.slug === slug);
    }

    // Get watch history
    getWatchHistory() {
        const historyStr = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
        return historyStr ? JSON.parse(historyStr) : [];
    }

    // Add to watch history
    addToHistory(movie, episode = null) {
        if (!this.authService.isLoggedIn()) return;

        const history = this.getWatchHistory();

        // Remove if already exists
        const filtered = history.filter(m => m.slug !== movie.slug);

        // Add to beginning
        filtered.unshift({
            slug: movie.slug,
            name: movie.name,
            thumb_url: movie.thumb_url,
            year: movie.year,
            episode: episode,
            watchedAt: new Date().toISOString()
        });

        // Keep only last 50 items
        const limited = filtered.slice(0, 50);
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(limited));
        this.authService.updateProfile({ watchHistory: limited }).catch(()=>{});
    }

    // Clear watch history
    clearHistory() {
        localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
        this.authService.updateProfile({ watchHistory: [] }).catch(()=>{});
    }

    // Get watch progress for a movie
    getWatchProgress(slug, episode = null) {
        const progressStr = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
        const allProgress = progressStr ? JSON.parse(progressStr) : {};

        const key = episode ? `${slug}_${episode}` : slug;
        return allProgress[key] || { currentTime: 0, duration: 0 };
    }

    // Save watch progress
    saveWatchProgress(slug, currentTime, duration, episode = null) {
        if (!this.authService.isLoggedIn()) return;

        const progressStr = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
        const allProgress = progressStr ? JSON.parse(progressStr) : {};

        const key = episode ? `${slug}_${episode}` : slug;
        allProgress[key] = {
            currentTime,
            duration,
            percentage: (currentTime / duration) * 100,
            updatedAt: new Date().toISOString()
        };

        // 1. Luôn lưu ngay lập tức vào LocalStorage trên máy hiện tại
        localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(allProgress));

        // 2. Đồng bộ lên Server để liên kết đa thiết bị
        // Dùng throttle: Chỉ đẩy lên server tối đa 10 giây một lần để tránh làm chậm mạng/quá tải request
        const now = Date.now();
        if (!this.lastProgressSyncTime || (now - this.lastProgressSyncTime > 10000)) {
            this.lastProgressSyncTime = now;
            this.authService.updateProfile({ watchProgress: allProgress })
                .then(() => { console.log('☁️ [CloudSync] Watch progress backed up'); })
                .catch(() => {});
        }
    }

    // Get subscription info
    getSubscription() {
        const user = this.authService.getCurrentUser();
        if (!user) return APP_CONFIG.SUBSCRIPTION_PLANS.FREE;

        const subStr = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
        const subscription = subStr ? JSON.parse(subStr) : null;

        if (!subscription || new Date(subscription.expiresAt) < new Date()) {
            return APP_CONFIG.SUBSCRIPTION_PLANS.FREE;
        }

        return subscription;
    }

    // Upgrade subscription
    upgradeSubscription(plan, paymentMethod) {
        if (!this.authService.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        const planConfig = APP_CONFIG.SUBSCRIPTION_PLANS[plan];
        if (!planConfig) {
            return { success: false, message: 'Gói không hợp lệ' };
        }

        // Simulate payment processing
        const subscription = {
            plan,
            ...planConfig,
            startDate: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (planConfig.yearly ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            paymentMethod,
            transactionId: 'TXN' + Date.now()
        };

        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
        this.authService.updateProfile({ subscription: plan });

        return { success: true, subscription };
    }

    // Get payment history
    getPaymentHistory() {
        const historyStr = localStorage.getItem('cinestream_payment_history');
        return historyStr ? JSON.parse(historyStr) : [];
    }

    // Add payment to history
    addPaymentHistory(payment) {
        const history = this.getPaymentHistory();
        history.unshift({
            ...payment,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('cinestream_payment_history', JSON.stringify(history));
    }
}

// Initialize User Service
const userService = new UserService();
