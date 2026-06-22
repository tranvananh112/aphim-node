class SimpleCache {
    constructor() {
        this.cache = new Map();
    }

    // Set a key with a TTL in seconds
    set(key, value, ttlSeconds = 60) {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiresAt });
    }

    // Get a key if it exists and hasn't expired
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    // Delete a key
    del(key) {
        this.cache.delete(key);
    }
    
    // Clear whole cache
    flush() {
        this.cache.clear();
    }
}

// Export a singleton instance
module.exports = new SimpleCache();
