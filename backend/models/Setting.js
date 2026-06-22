const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    general: {
        siteName: { type: String, default: 'A Phim' },
        siteDesc: { type: String, default: 'Nền tảng xem phim trực tuyến hàng đầu Việt Nam' },
        siteDomain: { type: String, default: 'APhim.vn' },
        siteEmail: { type: String, default: 'admin@APhim.vn' },
        logoUrl: { type: String, default: '../apple-touch-icon.png' },
        faviconUrl: { type: String, default: '../apple-touch-icon.png' },
        maintenanceMode: { type: Boolean, default: false },
        allowRegister: { type: Boolean, default: true },
        allowComments: { type: Boolean, default: true }
    },
    payment: {
        bankAccount:      { type: String, default: '048889019999' },
        bankOwner:        { type: String, default: 'TRAN VAN ANH' },
        bankName:         { type: String, default: 'MB Bank' },
        momoPhone:        { type: String, default: '' },
        zaloPayKey:       { type: String, default: '' },
        vnPayKey:         { type: String, default: '' },
        pricePremium:     { type: Number, default: 69000 },
        priceStandard:    { type: Number, default: 220000 },
        priceBasic:       { type: Number, default: 109000 },
        pricePremiumYear: { type: Number, default: 699000 }
    },
    content: {
        enablePhimX: { type: Boolean, default: false },
        enableWatermark: { type: Boolean, default: true },
        watermarkUrl: { type: String, default: 'https://ophim1.com/logo.png' },
        autoplayDelay: { type: String, default: '5 giây' },
        defaultServer: { type: String, default: 'Server #1 (OPhim)' },
        proxyUrl: { type: String, default: '' },
        apiBase: { type: String, default: 'https://ophim1.com/v1/api' },
        apiSecondary: { type: String, default: 'https://ophim17.cc/_next/data/9QkyZ8-jLzIfTtyR2y41x' },
        enableMultipleSources: { type: Boolean, default: false },
        heroThumbnails: { type: [Object], default: [] },
        categoryBackgrounds: {
            type: Object,
            default: {
                "danh-sach/phim-bo": "",
                "danh-sach/phim-moi-cap-nhat": "",
                "the-loai/hanh-dong": "",
                "the-loai/tinh-cam": "",
                "the-loai/hai-huoc": "",
                "danh-sach/hoat-hinh": ""
            }
        }
    },
    security: {
        enable2FA: { type: Boolean, default: false },
        ipWhitelistEnabled: { type: Boolean, default: false },
        ipWhitelist: { type: [String], default: [] }
    },
    notifications: {
        notifyNewUser: { type: Boolean, default: true },
        notifyPayment: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: false },
        smtpHost: { type: String, default: '' },
        smtpPort: { type: Number, default: 587 },
        smtpUser: { type: String, default: '' },
        smtpPass: { type: String, default: '' },
        telegramBotToken: { type: String, default: '' },
        telegramChatId: { type: String, default: '' }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);

