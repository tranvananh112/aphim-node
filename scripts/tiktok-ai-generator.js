require('dotenv').config();
const axios = require('axios');

async function generateTikTokCaption(movieTitle, movieDescription, genres) {
    const prompt = `
Bạn là một chuyên gia Social Media và SEO hàng đầu trên TikTok.
Nhiệm vụ của bạn là viết một bài đăng TikTok để giới thiệu một bộ phim cực hay, giúp thu hút hàng triệu lượt xem và tương tác.

THÔNG TIN PHIM:
- Tên phim: ${movieTitle}
- Thể loại: ${genres}
- Nội dung tóm tắt: ${movieDescription}

YÊU CẦU BÀI VIẾT TIKTOK (CAPTION):
1. Dòng đầu tiên: Phải là một câu TIÊU ĐỀ GIẬT GÂN, tò mò, bắt trend hoặc gây sốc để giữ chân người xem ngay trong 3 giây đầu. (Ví dụ: "Sốc!", "Bạn sẽ hối hận nếu bỏ qua siêu phẩm này...", "Cú twist đỉnh nhất lịch sử..."). Viết IN HOA một phần để nhấn mạnh.
2. Dòng 2-3: Review tóm tắt nội dung cực kỳ cuốn hút, đánh vào cảm xúc, không spoil kết thúc. Dùng icon emoji phù hợp 🎬🔥😱.
3. Call-to-action (Kêu gọi hành động): Kêu gọi người xem tìm link xem trọn bộ chất lượng cao HD miễn phí tại website APhim.top (gắn link khéo léo).
4. Hashtags chuẩn SEO TikTok: Ít nhất 7 hashtags. Bắt buộc có #aphim #phimhay #reviewphim #xemphim. Các hashtag còn lại dựa trên thể loại phim và tên phim.

Định dạng đầu ra: Chỉ trả về nội dung caption, không cần thêm giải thích.
`;

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 300,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const caption = response.data.choices[0].message.content.trim();
        console.log("=== KẾT QUẢ AI SINH RA ===");
        console.log(caption);
        console.log("============================");
        
        return caption;
    } catch (error) {
        console.error("Lỗi khi gọi Groq AI:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Chạy thử nghiệm nếu file được chạy trực tiếp bằng lệnh: node scripts/tiktok-ai-generator.js
if (require.main === module) {
    generateTikTokCaption(
        "Mai", 
        "Một cô gái tên Mai làm nghề mát-xa có số phận vô cùng bi đát, luôn khao khát tình yêu nhưng lại gặp vô vàn định kiến xã hội. Cuộc đời cô thay đổi khi gặp Dương, một chàng trai lãng tử...", 
        "Tình Cảm, Tâm Lý, Gia Đình"
    );
}

module.exports = { generateTikTokCaption };
