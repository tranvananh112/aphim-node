# 🤖 Aphim Telegram Bot

Bot Telegram tự động tạo link phim từ website aphim.io.vn khi user gõ tên phim trong nhóm.

## ✨ Tính năng

- Tự động chuyển tên phim thành slug (bỏ dấu tiếng Việt)
- Kiểm tra link phim có tồn tại trước khi gửi
- Chỉ reply khi link hợp lệ, tránh spam nhóm
- Hoạt động trong cả chat riêng và nhóm Telegram

## 📋 Yêu cầu

- Node.js >= 14.x
- npm hoặc yarn
- Telegram Bot Token từ @BotFather

## 🚀 Cài đặt

### 1. Tạo Bot trên Telegram

1. Mở Telegram, tìm kiếm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: `Aphim Movie Bot`)
4. Đặt username cho bot (phải kết thúc bằng `bot`, ví dụ: `aphim_movie_bot`)
5. Copy token mà BotFather gửi cho bạn

### 2. Tắt Privacy Mode (Quan trọng!)

Để bot đọc được tin nhắn trong nhóm:

1. Gửi lệnh `/setprivacy` cho @BotFather
2. Chọn bot của bạn
3. Chọn `Disable` - Bot sẽ nhận được tất cả tin nhắn trong nhóm

### 3. Cài đặt dependencies

```bash
cd telegram-bot
npm install
```

### 4. Cấu hình Bot Token

Sao chép file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

Mở file `.env` và thay `your_bot_token_here` bằng token thật:

```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

## 🎯 Chạy Bot

### Chạy production:

```bash
npm start
```

### Chạy development (auto-restart):

```bash
npm run dev
```

Khi thấy thông báo `🤖 Bot đang chạy...` là bot đã sẵn sàng!

## 📖 Cách sử dụng

### Trong chat riêng:

1. Tìm bot của bạn trên Telegram
2. Gửi `/start` để bắt đầu
3. Gõ tên phim, ví dụ: `Quỷ Nhập Tràng 2`
4. Bot sẽ trả về link nếu phim tồn tại

### Trong nhóm:

1. Thêm bot vào nhóm Telegram
2. Cấp quyền đọc tin nhắn cho bot
3. Bất kỳ ai gõ tên phim, bot sẽ tự động reply link

## 🔧 Cách hoạt động

1. User gõ: `Quỷ Nhập Tràng 2`
2. Bot chuyển thành slug: `quy-nhap-trang-2`
3. Bot tạo URL: `https://aphim.io.vn/movie-detail.html?slug=quy-nhap-trang-2`
4. Bot kiểm tra link bằng `axios.head()`
5. Nếu status = 200 → Bot reply:
   ```
   🎬 Quỷ Nhập Tràng 2
   🔗 https://aphim.io.vn/movie-detail.html?slug=quy-nhap-trang-2
   ```
6. Nếu không tồn tại → Bot im lặng

## 📝 Ví dụ

**Input:** `Linh Miếu`  
**Output:**
```
🎬 Linh Miếu
🔗 https://aphim.io.vn/movie-detail.html?slug=linh-mieu
```

**Input:** `Phim không tồn tại xyz123`  
**Output:** *(Bot không reply gì)*

## 🛠️ Cấu trúc project

```
telegram-bot/
├── bot.js              # File chính chứa logic bot
├── .env                # File cấu hình (chứa BOT_TOKEN)
├── .env.example        # Template file cấu hình
├── package.json        # Dependencies và scripts
└── README.md           # Hướng dẫn này
```

## 🐛 Troubleshooting

### Bot không nhận tin nhắn trong nhóm?
- Kiểm tra đã tắt Privacy Mode chưa (`/setprivacy` → `Disable`)
- Kiểm tra bot có quyền đọc tin nhắn trong nhóm

### Bot không chạy?
- Kiểm tra BOT_TOKEN trong file `.env` có đúng không
- Chạy `npm install` để cài đặt dependencies
- Kiểm tra Node.js version >= 14.x

### Bot reply sai link?
- Kiểm tra logic chuyển slug trong hàm `convertToSlug()`
- Test thử với tên phim đơn giản trước

## 📦 Dependencies

- `node-telegram-bot-api`: Thư viện Telegram Bot API
- `axios`: HTTP client để kiểm tra link
- `dotenv`: Quản lý biến môi trường

## 📄 License

MIT

## 👨‍💻 Author

Tạo cho website aphim.io.vn
