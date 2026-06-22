# CineStream - Website Xem Phim

Website xem phim trực tuyến với giao diện hiện đại, tích hợp API từ ophim17.cc

## 🎬 Tính năng chính

### Người dùng (User)

#### 1. Đăng ký & Đăng nhập
- ✅ Đăng ký bằng Email, số điện thoại
- ✅ Đăng nhập bằng Email/SĐT + mật khẩu
- ✅ Quên mật khẩu - Gửi OTP
- ✅ Đăng nhập mạng xã hội (Google, Facebook) - Demo

#### 2. Trang chủ & Khám phá phim
- ✅ Banner Slider - Phim nổi bật, mới nhất
- ✅ Danh mục phim: Phim mới, Phim hot, Thể loại
- ✅ Tìm kiếm phim theo tên, diễn viên, đạo diễn
- ✅ Lọc & Sắp xếp: Thể loại, quốc gia, năm, rating

#### 3. Chi tiết phim
- ✅ Hiển thị: Poster, tên, mô tả, diễn viên, đạo diễn, thời lượng, năm SX
- ✅ Xem trailer phim
- ✅ Hiển thị rating trung bình, số lượt đánh giá
- ✅ Danh sách bình luận
- ✅ Gợi ý phim liên quan

#### 4. Xem phim
- ✅ Video Player: Play/Pause, Tua, Âm lượng, Toàn màn hình
- ✅ Hỗ trợ HLS (m3u8) streaming
- ✅ Tự động lưu tiến trình xem
- ✅ Tiếp tục từ vị trí cũ
- ✅ Tự động phát tập sau (phim bộ)

#### 5. Đánh giá & Bình luận
- ✅ Đánh giá phim: 1-10 điểm
- ✅ Viết bình luận, nhận xét về phim
- ✅ Like/Dislike bình luận
- ✅ Báo cáo bình luận spam, vi phạm
- ✅ Trả lời bình luận

#### 6. Danh sách yêu thích & Lịch sử
- ✅ Thêm phim vào danh sách yêu thích
- ✅ Xem lịch sử phim đã xem
- ✅ Danh sách phim đang xem dở
- ✅ Hiển thị % tiến trình xem

#### 7. Gói thành viên & Thanh toán
- ✅ Hiển thị các gói: Free, Premium, Family
- ✅ Đăng ký gói thành viên
- ✅ Lịch sử thanh toán (Demo)

#### 8. Quản lý tài khoản
- ✅ Cập nhật: Tên, Avatar, Email, SĐT
- ✅ Đổi mật khẩu đăng nhập
- ✅ Quản lý thiết bị đang đăng nhập

#### 9. Tìm kiếm & Lọc
- ✅ Tìm kiếm theo từ khóa
- ✅ Lọc theo thể loại, quốc gia, năm
- ✅ Sắp xếp theo: Mới nhất, Đánh giá, Lượt xem
- ✅ Phân trang kết quả

### Phần Admin
- **Dashboard** (`admin/dashboard.html`) - Tổng quan hệ thống
- **Quản lý phim** (`admin/movies.html`) - Thêm, sửa, xóa phim
- **Quản lý người dùng** (`admin/users.html`) - Quản lý tài khoản người dùng
- **Quản lý thanh toán** (`admin/payments.html`) - Theo dõi giao dịch và doanh thu

## 🚀 Cài đặt

### Yêu cầu
- Node.js (v14 trở lên) - [Tải tại đây](https://nodejs.org/)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari)

### Chạy ứng dụng với Node.js (Khuyến nghị)

1. **Clone hoặc tải project về máy**

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy server**
```bash
# Chạy production
npm start

# Hoặc chạy development với auto-reload
npm run dev
```

4. **Truy cập website**
- Mở trình duyệt và truy cập: `http://localhost:3000`

### Chạy trực tiếp (Không cần Node.js)

1. Mở file `index.html` bằng trình duyệt
2. Hoặc sử dụng Live Server (VS Code Extension)

```bash
# Nếu có Python
python -m http.server 8000

# Nếu có npx
npx serve
```

## 📁 Cấu trúc thư mục

```
cinestream/
├── index.html              # Trang chủ
├── movie-detail.html       # Chi tiết phim
├── watch.html              # Xem phim
├── login.html              # Đăng nhập/Đăng ký
├── pricing.html            # Gói thành viên
├── profile.html            # Quản lý tài khoản
├── search.html             # Tìm kiếm & lọc phim
├── js/
│   ├── config.js          # Cấu hình API & App
│   ├── api.js             # Service gọi API ophim17.cc
│   ├── auth.js            # Xác thực người dùng
│   ├── user.js            # Quản lý user (favorites, history)
│   ├── rating.js          # Đánh giá & bình luận
│   ├── home.js            # Logic trang chủ
│   ├── movie-detail.js    # Logic chi tiết phim
│   ├── watch.js           # Logic xem phim
│   ├── login.js           # Logic đăng nhập
│   ├── profile.js         # Logic quản lý tài khoản
│   └── search.js          # Logic tìm kiếm
└── admin/                  # Trang quản trị (riêng biệt)
```

## 🔌 API Integration

Website sử dụng API từ **ophim17.cc**

### Endpoints chính:
- `GET /danh-sach/phim-moi-cap-nhat?page={page}` - Danh sách phim mới
- `GET /phim/{slug}` - Chi tiết phim
- `GET /tim-kiem?keyword={keyword}` - Tìm kiếm phim
- `GET /the-loai/{slug}` - Phim theo thể loại
- `GET /quoc-gia/{slug}` - Phim theo quốc gia

### Ví dụ response:
```json
{
  "status": "success",
  "data": {
    "item": {
      "name": "Ngày Xưa Có Một Chuyện Tình",
      "slug": "ngay-xua-co-mot-chuyen-tinh",
      "thumb_url": "...",
      "poster_url": "...",
      "year": 2024,
      "quality": "HD",
      "lang": "Lồng Tiếng",
      "episodes": [
        {
          "server_name": "Server 1",
          "server_data": [
            {
              "name": "Full",
              "slug": "full",
              "link_m3u8": "https://..."
            }
          ]
        }
      ]
    }
  }
}
```

## 💾 Local Storage

Dữ liệu được lưu trong localStorage:
- `cinestream_user` - Thông tin người dùng
- `cinestream_token` - Token xác thực
- `cinestream_favorites` - Danh sách yêu thích
- `cinestream_history` - Lịch sử xem
- `cinestream_progress` - Tiến trình xem phim
- `cinestream_subscription` - Thông tin gói thành viên
- `cinestream_ratings` - Đánh giá phim
- `cinestream_comments` - Bình luận

## 🎨 Công nghệ sử dụng

- **HTML5** - Cấu trúc trang
- **TailwindCSS** - Styling (CDN)
- **JavaScript (Vanilla)** - Logic xử lý
- **HLS.js** - Streaming video m3u8
- **Google Fonts** - Typography
- **Material Icons** - Icon set

## 🌈 Màu sắc chủ đạo

- **Primary (User)**: `#f2f20d` (Vàng neon)
- **Primary Red**: `#ec1313` (Đỏ)
- **Primary Blue (Admin)**: `#197fe6` (Xanh dương)
- **Background Dark**: `#1a1a0c` / `#222210`
- **Surface Dark**: `#2a2a18`

## 📱 Responsive Design

Website được tối ưu cho:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large Desktop (1440px+)

## 🔐 Bảo mật

- Mật khẩu được mã hóa base64 (demo - production nên dùng bcrypt)
- XSS protection
- Input validation
- CORS handling

## 🎯 Hướng dẫn sử dụng

### Đăng ký tài khoản
1. Truy cập `login.html`
2. Click "Đăng ký ngay"
3. Nhập thông tin: Họ tên, Email, Mật khẩu
4. Click "ĐĂNG KÝ"

### Xem phim
1. Trang chủ: Chọn phim từ danh sách
2. Trang chi tiết: Xem thông tin, đánh giá
3. Click "XEM NGAY" để xem phim
4. Tiến trình xem được tự động lưu

### Quản lý tài khoản
1. Click vào avatar góc phải
2. Chọn tab: Thông tin, Gói thành viên, Yêu thích, Lịch sử
3. Cập nhật thông tin cá nhân
4. Đổi mật khẩu nếu cần

### Tìm kiếm phim
1. Truy cập `search.html`
2. Nhập từ khóa vào ô tìm kiếm
3. Sử dụng bộ lọc: Thể loại, Quốc gia, Năm
4. Chọn cách sắp xếp: Mới nhất, Đánh giá, Lượt xem

## 🚧 Lưu ý

- Đây là phiên bản demo, dữ liệu lưu trong localStorage
- Để production cần:
  - Backend API riêng
  - Database (MySQL, PostgreSQL, MongoDB)
  - Authentication JWT
  - Payment gateway integration
  - CDN cho video streaming
  - Admin dashboard hoàn chỉnh

## 📞 Liên hệ

- Website: https://cinestream.vn (demo)
- Email: support@cinestream.vn
- API Provider: https://ophim17.cc

## 📄 License

MIT License - Free to use for learning purposes

---

© 2023 CineStream. All rights reserved.
