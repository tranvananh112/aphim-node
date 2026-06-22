const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Lưu session log vào file JSON để persist qua restart
const LOG_FILE = path.join(__dirname, '../data/partner_sessions.json');

function readLog() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
    } catch (e) {}
    return { sessions: [], total: 0, lastLogin: null, lastSeen: null };
}

function writeLog(log) {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
    } catch (e) {
        console.error('[Partner] writeLog error:', e.message);
    }
}

// POST /api/partner/session — ghi nhận phiên đăng nhập từ partner.html
router.post('/session', (req, res) => {
    try {
        const { type, ip, city, region, country, countryCode, isp, org,
                lat, lon, ua, screen, lang, tz, t } = req.body;

        // Lấy IP thực từ request nếu không có IP từ body
        const realIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                    || req.headers['x-real-ip']
                    || req.connection?.remoteAddress
                    || req.socket?.remoteAddress
                    || '—';

        const entry = {
            t: t || Date.now(),
            type: type || 'login',
            ip: ip || realIp,
            city: city || '—',
            region: region || '—',
            country: country || '—',
            countryCode: countryCode || '',
            isp: isp || '—',
            org: org || '—',
            lat: lat || 0,
            lon: lon || 0,
            ua: (ua || '').slice(0, 120),
            screen: screen || '—',
            lang: lang || '—',
            tz: tz || '—'
        };

        const log = readLog();
        log.total = (log.total || 0) + 1;
        log.lastSeen = Date.now();
        if (type === 'login') log.lastLogin = Date.now();

        log.sessions = log.sessions || [];
        log.sessions.unshift(entry);
        if (log.sessions.length > 50) log.sessions = log.sessions.slice(0, 50);

        writeLog(log);

        console.log(`[Partner DT99] ${type==='login'?'🔑 LOGIN':'🔄 Resume'} | IP: ${entry.ip} | ${entry.city}, ${entry.country} | ${entry.isp}`);

        res.json({ success: true });
    } catch (err) {
        console.error('[Partner] session error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/partner/sessions — admin đọc toàn bộ log (cross-device)
router.get('/sessions', (req, res) => {
    // Basic auth check: header X-Admin-Key phải đúng
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== (process.env.ADMIN_SECRET || 'aphim_admin_2024')) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const log = readLog();
    res.json({ success: true, data: log });
});

// DELETE /api/partner/sessions — admin xóa log
router.delete('/sessions', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== (process.env.ADMIN_SECRET || 'aphim_admin_2024')) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    writeLog({ sessions: [], total: 0, lastLogin: null, lastSeen: null });
    res.json({ success: true, message: 'Log cleared' });
});

module.exports = router;
