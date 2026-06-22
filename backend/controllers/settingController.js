const Setting = require('../models/Setting');
const cache = require('../utils/cache');

// Helper to ensure a single settings document exists
const getOrCreateSettings = async () => {
    let settings = await Setting.findOne();
    if (!settings) {
        settings = await Setting.create({});
    }
    return settings;
};

// @desc    Get full admin settings
// @route   GET /api/settings
// @access  Private/Admin
exports.getSettings = async (req, res) => {
    try {
        const cachedSettings = cache.get('public_settings');
        if (cachedSettings) return res.json({ success: true, data: cachedSettings });

        const settings = await getOrCreateSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update admin settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
    try {
        // Use $set with dot-notation to safely update nested subdocuments
        const updateFields = {};
        const allowed = ['general', 'payment', 'content', 'security', 'notifications'];
        for (const section of allowed) {
            if (req.body[section] && typeof req.body[section] === 'object') {
                for (const [key, val] of Object.entries(req.body[section])) {
                    updateFields[`${section}.${key}`] = val;
                }
            }
        }

        const settings = await Setting.findOneAndUpdate(
            {},
            { $set: updateFields },
            { new: true, upsert: true, runValidators: true }
        );

        
                cache.del('public_settings');
        res.json({ success: true, data: settings, message: 'Lưu cấu hình thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get public settings for frontend rendering
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = async (req, res) => {
    // Safe defaults — returned even when DB is unreachable so frontend never breaks
    const defaults = {
        general: {
            siteName: 'A Phim',
            siteDesc: 'Nền tảng xem phim trực tuyến hàng đầu Việt Nam',
            siteDomain: 'APhim.vn',
            logoUrl: '../apple-touch-icon.png',
            faviconUrl: '../apple-touch-icon.png',
            maintenanceMode: false
        },
        content: {
            enablePhimX: false,
            enableWatermark: true,
            watermarkUrl: '',
            apiBase: 'https://ophim1.com/v1/api',
            apiSecondary: 'https://ophim17.cc',
            enableMultipleSources: false,
            defaultServer: 'Server #1 (OPhim)',
            autoplayDelay: '5 giây',
            categoryBackgrounds: {
                "danh-sach/phim-bo": "",
                "danh-sach/phim-moi-cap-nhat": "",
                "the-loai/hanh-dong": "",
                "the-loai/tinh-cam": "",
                "the-loai/hai-huoc": "",
                "danh-sach/hoat-hinh": ""
            }
        }
    };

    try {
        const cachedSettings = cache.get('public_settings');
        if (cachedSettings) {
            return res.json({ success: true, data: cachedSettings });
        }

        const settings = await getOrCreateSettings();

        const publicData = {
            general: {
                siteName:        settings.general?.siteName        ?? defaults.general.siteName,
                siteDesc:        settings.general?.siteDesc        ?? defaults.general.siteDesc,
                siteDomain:      settings.general?.siteDomain      ?? defaults.general.siteDomain,
                logoUrl:         settings.general?.logoUrl         ?? defaults.general.logoUrl,
                faviconUrl:      settings.general?.faviconUrl      ?? defaults.general.faviconUrl,
                maintenanceMode: settings.general?.maintenanceMode ?? false,
                allowRegister:   settings.general?.allowRegister   ?? true,
                allowComments:   settings.general?.allowComments   ?? true
            },
            content: {
                enablePhimX:          settings.content?.enablePhimX          ?? false,
                enableWatermark:      settings.content?.enableWatermark      ?? true,
                watermarkUrl:         settings.content?.watermarkUrl         ?? '',
                apiBase:              settings.content?.apiBase              ?? defaults.content.apiBase,
                apiSecondary:         settings.content?.apiSecondary         ?? defaults.content.apiSecondary,
                enableMultipleSources:settings.content?.enableMultipleSources ?? false,
                defaultServer:        settings.content?.defaultServer        ?? defaults.content.defaultServer,
                autoplayDelay:        settings.content?.autoplayDelay        ?? defaults.content.autoplayDelay,
                categoryBackgrounds:  settings.content?.categoryBackgrounds  ?? defaults.content.categoryBackgrounds,
                heroThumbnails:       settings.content?.heroThumbnails       ?? []
            }
        };

        // Lưu cache 5 phút
        cache.set('public_settings', publicData, 300);
        res.json({ success: true, data: publicData });
    } catch (error) {
        // Graceful degradation: return defaults so frontend config.js never crashes
        console.error('Settings/public fetch error – returning defaults:', error.message);
        res.json({ success: true, data: defaults });
    }
};

// @desc    Get public payment info (prices + basic bank info) for pricing page
// @route   GET /api/settings/payment-public
// @access  Public
exports.getPaymentPublic = async (req, res) => {
    // Defaults mirror payment.js hardcoded values so preview is always accurate
    const defaults = {
        pricePremium:     69000,
        priceStandard:    220000,
        priceBasic:       109000,
        pricePremiumYear: 699000,
        bankName:         'MB Bank',
        bankOwner:        'TRAN VAN ANH',
        bankAccount:      '048889019999',
        momoPhone:        ''
    };

    try {
        const settings = await getOrCreateSettings();
        const p = settings.payment || {};

        res.json({
            success: true,
            data: {
                pricePremium:     p.pricePremium     ?? defaults.pricePremium,
                priceStandard:    p.priceStandard     ?? defaults.priceStandard,
                priceBasic:       p.priceBasic        ?? defaults.priceBasic,
                pricePremiumYear: p.pricePremiumYear  ?? defaults.pricePremiumYear,
                bankName:         p.bankName          ?? defaults.bankName,
                bankOwner:        p.bankOwner         ?? defaults.bankOwner,
                bankAccount:      p.bankAccount       ?? defaults.bankAccount,
                momoPhone:        p.momoPhone         ?? defaults.momoPhone
                // vnPayKey và zaloPayKey bị ẩn chủ động (sensitive)
            }
        });
    } catch (error) {
        console.error('Payment/public fetch error – returning defaults:', error.message);
        res.json({ success: true, data: defaults });
    }
};

