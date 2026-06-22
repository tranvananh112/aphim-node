# 📁 Thư mục Banner Đối Tác

## Hướng dẫn sử dụng

### 1️⃣ Bỏ file banner vào đây

Bạn có thể bỏ các file JPG, GIF, PNG vào thư mục này:

```
ads/partner-banners/original/
├── banner1.jpg
├── banner2.gif
└── banner3.png
```

### 2️⃣ Hệ thống sẽ tự động:

✅ **Phát hiện kích thước** (width x height)
✅ **Đề xuất vị trí** phù hợp (header, sidebar, popup...)
✅ **Tối ưu hóa** ảnh (nén, resize cho mobile)
✅ **Tạo code** HTML/CSS/JS sẵn sàng
✅ **Thêm nút đóng (X)** cho banner sticky/popup
✅ **Tracking** views & clicks

### 3️⃣ Cấu trúc thư mục:

```
ads/
├── partner-banners/
│   ├── original/          ← BỎ FILE BANNER VÀO ĐÂY
│   ├── optimized/         ← Ảnh đã tối ưu (tự động)
│   ├── config.json        ← Cấu hình banner (tự động tạo)
│   └── README.md          ← File này
├── js/
│   └── partner-ads.js     ← JavaScript xử lý banner
└── css/
    └── partner-ads.css    ← CSS styling banner
```

### 4️⃣ Kích thước banner phổ biến:

| Kích thước | Tên | Vị trí đề xuất |
|------------|-----|----------------|
| 728x90 | Leaderboard | Header/Footer |
| 970x90 | Super Leaderboard | Header (Desktop) |
| 300x250 | Medium Rectangle | Sidebar/In-content |
| 300x600 | Half Page | Sidebar dọc |
| 320x50 | Mobile Banner | Mobile Header |
| 320x100 | Large Mobile Banner | Mobile |
| 160x600 | Wide Skyscraper | Sidebar dọc hẹp |
| 970x250 | Billboard | Header lớn |

### 5️⃣ Sau khi bỏ file vào:

Chạy lệnh:
```bash
node ads/scan-banners.js
```

Hoặc mở file:
```
ads/preview.html
```

---

## 📝 Ghi chú

- File GIF động sẽ được giữ nguyên
- File JPG/PNG sẽ được tối ưu (giảm dung lượng)
- Banner có thể bật/tắt qua Admin Panel
- Tracking tự động (không cần code thêm)

---

**Sẵn sàng nhận 3 file banner của bạn! 🎯**
