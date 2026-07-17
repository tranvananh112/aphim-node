require('dotenv').config();
const axios = require('axios');

async function generateTikTokCaption(movieTitle, movieDescription, genres) {
    const prompt = `
Bạn là một chuyên gia Social Media và Cố vấn Kịch bản hạng S trên TikTok.
Nhiệm vụ của bạn là viết một bài Caption cực kỳ viral (giật gân, thu hút) để giới thiệu bộ phim sau:
- Tên phim: ${movieTitle}
- Thể loại: ${genres}
- Nội dung: ${movieDescription}

YÊU CẦU NGHIÊM NGẶT (PHẢI TUÂN THỦ 100%):
1. **Câu Hook 3 giây đầu:** Mở đầu bằng một câu "Móc câu" cực sốc, giật gân, khơi gợi tò mò tột độ (IN HOA, dùng Emoji mạnh). Tuyệt đối không dùng những câu sáo rỗng.
2. **Kể chuyện mập mờ:** Tóm tắt phim theo phong cách Review bí ẩn, kể một nửa câu chuyện và đặt câu hỏi mở để ép người xem phải click vào link hoặc xem hết video.
3. **Kêu gọi hành động (CTA):** Điều hướng người xem truy cập link "aphim.top" một cách khéo léo và tự nhiên nhất.
4. **Chuẩn SEO & Hidden Keywords:**
   - Chọn ra 5 Hashtags đang thịnh hành nhất và liên quan sát nhất (VD: #aphim #phimhay #reviewphim #xemphim #phim[theloai]).
   - Chèn lồng ghép các từ khoá tìm kiếm tự nhiên vào trong văn bản.
5. **Chống trùng lặp:** Không sử dụng lại các mô típ văn mẫu như "Bạn đã sẵn sàng chưa?", "Đừng bỏ lỡ!". Hãy dùng văn phong sáng tạo, tự nhiên, đôi khi hơi "đời" hoặc "slang" của Gen Z.
6. Kết quả trả về CHỈ LÀ ĐOẠN CAPTION, không kèm theo lời chào, không kèm theo giải thích.
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
