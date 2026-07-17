require('dotenv').config();
const axios = require('axios');

async function generateTikTokCaption(movieTitle, movieDescription, genres) {
    const prompt = `Bạn là một Content Creator TikTok chuyên nghiệp chuyên review phim.
Mục tiêu của bạn là viết một đoạn caption ngắn, giật gân, khơi gợi trí tò mò để khiến người xem phải thèm thuồng và tò mò về bộ phim sau:
- Tên phim: ${movieTitle}
- Thể loại: ${genres}
- Nội dung: ${movieDescription}

ĐẶC BIỆT QUAN TRỌNG: Phải luôn có một câu chốt (Call To Action - Lùa gà) khuyên người xem truy cập ngay vào website "aphim.top" để xem bản Full HD miễn phí.

YÊU CẦU BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. RẤT NGẮN GỌN: Tối đa 3-4 câu. Đoạn cắt video trên TikTok rất ngắn nên caption phải đọc nhanh.
2. KHÔNG DÙNG KÝ TỰ MARKDOWN: TUYỆT ĐỐI KHÔNG dùng dấu sao (*) hoặc (**) để in đậm in nghiêng. Viết văn bản thuần túy (Plain text).
3. LUÔN CÓ WEB: Phải nhắc đến "aphim.top" ở câu cuối cùng.
4. HASHTAG: Thêm 3-5 hashtag liên quan ở cuối (ví dụ: #aphim #phimhay #reviewphim).
5. EMOJI: Dùng 1-2 emoji bắt mắt nhưng không lạm dụng.
6. Kết quả trả về CHỈ LÀ ĐOẠN CAPTION, không kèm theo lời chào, không kèm theo giải thích.`;

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
