// Tự động nhận diện thiết bị và tính toán độ giãn layout cho vừa khít tuyệt đối trên Mobile (Node Version)
function adaptDynamicLayout() {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    const heroContent = document.getElementById('heroContent');
    const heroContentInner = document.querySelector('#heroContent > div');
    const thumbContainer = document.querySelector('.hero-thumbnails-container');
    const interestsSection = document.querySelector('.interests-section');
    
    if (!heroContent || !heroContentInner || !thumbContainer || !interestsSection) return;

    if (screenWidth < 768) {
        // Reset flexbox mặc định của heroContent để tránh gây nhiễu
        heroContent.style.setProperty('justify-content', 'flex-end', 'important');
        heroContent.style.setProperty('padding-bottom', '0px', 'important');
        
        // Ép khối nội dung (Nút Play + Text) thành absolute để neo tuyệt đối theo hệ tọa độ bottom
        heroContentInner.style.setProperty('position', 'absolute', 'important');
        heroContentInner.style.setProperty('left', '16px', 'important');
        heroContentInner.style.setProperty('right', '16px', 'important');
        heroContentInner.style.setProperty('margin-top', '0px', 'important');
        heroContentInner.style.setProperty('margin-bottom', '0px', 'important');

        // MOBILE LOGIC: Tính toán động theo % màn hình thực tế (bao gồm cả thanh địa chỉ safari)
        let interestsBottom = 30; // Mặc định như cũ
        
        if (screenHeight > 800) interestsBottom = 60;
        if (screenHeight > 900) interestsBottom = 90;
        if (screenHeight < 700) interestsBottom = 20;

        let thumbBottom = interestsBottom + 140; // Đẩy cao hơn interests một khoảng an toàn
        let heroPadding = thumbBottom + 85; // Nút Play nằm ngay trên Thumbnail

        // Áp dụng tọa độ bottom tuyệt đối cho cả 3 khối
        heroContentInner.style.setProperty('bottom', heroPadding + 'px', 'important');
        thumbContainer.style.setProperty('bottom', thumbBottom + 'px', 'important');
        interestsSection.style.setProperty('bottom', interestsBottom + 'px', 'important');
    } else {
        // TABLET / DESKTOP LOGIC: Gỡ bỏ inline style để trả về CSS ban đầu của Desktop
        heroContentInner.style.removeProperty('position');
        heroContentInner.style.removeProperty('bottom');
        heroContentInner.style.removeProperty('left');
        heroContentInner.style.removeProperty('right');
        heroContentInner.style.removeProperty('margin-top');
        heroContentInner.style.removeProperty('margin-bottom');
        
        thumbContainer.style.removeProperty('bottom');
        interestsSection.style.removeProperty('bottom');
        
        heroContent.style.removeProperty('justify-content');
        heroContent.style.removeProperty('padding-bottom');
    }
}

// Bắt sự kiện resize (xoay màn hình, Safari thu/phóng thanh địa chỉ, v.v.)
window.addEventListener('resize', adaptDynamicLayout);
window.addEventListener('orientationchange', adaptDynamicLayout);
document.addEventListener('DOMContentLoaded', adaptDynamicLayout);

// Khởi chạy ngay lập tức để tránh FOUC (giật layout)
adaptDynamicLayout();
