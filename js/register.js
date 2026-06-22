// Register Page Script

// Check if redirected from login page with highlight parameter
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('highlight') === 'true') {
        // Show message
        showMessage('Vui lòng đăng ký tài khoản thủ công bên dưới', 'info');

        // Wait a bit then scroll and highlight
        setTimeout(() => {
            scrollToManualForm();
        }, 500);
    }
    setupAuthLeftPanel();
});

// Setup dynamic background for left panel
function setupAuthLeftPanel() {
    const panel = document.getElementById('auth-left-panel');
    if (!panel) return;

    // Default fallback
    let bgUrl = 'https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8Ez05N5cKk.jpg';
    panel.style.background = `linear-gradient(to bottom, rgba(15,15,30,0.15) 0%, rgba(15,15,30,0.95) 100%), url('${bgUrl}') center / cover no-repeat`;

    // Fetch dynamic
    setTimeout(async () => {
        try {
            const res = await fetch('https://ophim1.com/v1/api/quoc-gia/viet-nam');
            const data = await res.json();
            if (data?.data?.items?.length > 0) {
                const latestMovie = data.data.items[0];
                const url = `https://img.ophim.live/uploads/movies/${latestMovie.thumb_url || latestMovie.poster_url}`;
                panel.style.background = `linear-gradient(to bottom, rgba(15,15,30,0.15) 0%, rgba(15,15,30,0.95) 100%), url('${url}') center / cover no-repeat`;
            }
        } catch (e) {
            console.warn('Could not load dynamic auth background');
        }
    }, 100);
}

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Validation
    if (!name || !email || !phone || !password || !confirmPassword) {
        showMessage('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Email không hợp lệ', 'error');
        return;
    }

    if (!validatePhone(phone)) {
        showMessage('Số điện thoại không hợp lệ', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp', 'error');
        return;
    }

    if (!terms) {
        showMessage('Vui lòng đồng ý với điều khoản sử dụng', 'error');
        return;
    }

    // Register
    const result = await authService.register(email, password, name, phone, rememberMe);

    if (result.success) {
        showMessage('Đăng ký thành công!', 'success');
        setTimeout(() => {
            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirectParam ? decodeURIComponent(redirectParam) : 'index.html';
        }, 800);
    } else {
        showMessage(result.message || 'Đăng ký thất bại', 'error');
    }
});

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + '-icon');

    if (field.type === 'password') {
        field.type = 'text';
        icon.textContent = 'visibility';
    } else {
        field.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone
function validatePhone(phone) {
    const re = /^[0-9]{10,11}$/;
    return re.test(phone.replace(/[\s-]/g, ''));
}

// Validate password
function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing message
    const existing = document.querySelector('.message-toast');
    if (existing) {
        existing.remove();
    }

    // Create message element
    const toast = document.createElement('div');
    toast.className = 'message-toast fixed top-24 right-4 z-50 px-6 py-4 rounded-lg shadow-lg backdrop-blur-md border transform transition-all duration-300';

    if (type === 'success') {
        toast.classList.add('bg-green-500/20', 'border-green-500/50', 'text-green-100');
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-icons-round text-green-400">check_circle</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
    } else if (type === 'error') {
        toast.classList.add('bg-red-500/20', 'border-red-500/50', 'text-red-100');
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-icons-round text-red-400">error</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
    } else {
        toast.classList.add('bg-blue-500/20', 'border-blue-500/50', 'text-blue-100');
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-icons-round text-blue-400">info</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
    }

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Social login functions
function loginWithGoogle() {
    showMessage('Hiện tại chưa hỗ trợ đăng ký bằng Google. Vui lòng đăng ký thủ công bên dưới.', 'error');
    scrollToManualForm();
}

function loginWithFacebook() {
    showMessage('Hiện tại chưa hỗ trợ đăng ký bằng Facebook. Vui lòng đăng ký thủ công bên dưới.', 'error');
    scrollToManualForm();
}

// Scroll to manual registration form and highlight it
function scrollToManualForm() {
    const form = document.getElementById('registerForm');
    if (form) {
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add red border highlight
        form.style.border = '2px solid #ef4444';
        form.style.borderRadius = '12px';
        form.style.padding = '20px';
        form.style.transition = 'all 0.3s ease';

        // Add pulsing animation
        form.style.animation = 'pulse-red 1.5s ease-in-out 3';

        // Remove highlight after 5 seconds
        setTimeout(() => {
            form.style.border = '';
            form.style.padding = '';
            form.style.animation = '';
        }, 5000);
    }
}

// Add CSS animation for pulsing effect
if (!document.getElementById('pulse-animation-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-animation-style';
    style.textContent = `
        @keyframes pulse-red {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            50% {
                box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
            }
        }
    `;
    document.head.appendChild(style);
}

// Real-time validation feedback
document.getElementById('email').addEventListener('blur', function () {
    if (this.value && !validateEmail(this.value)) {
        this.classList.add('border-red-500');
    } else {
        this.classList.remove('border-red-500');
    }
});

document.getElementById('phone').addEventListener('blur', function () {
    if (this.value && !validatePhone(this.value)) {
        this.classList.add('border-red-500');
    } else {
        this.classList.remove('border-red-500');
    }
});

document.getElementById('password').addEventListener('input', function () {
    if (this.value && !validatePassword(this.value)) {
        this.classList.add('border-red-500');
    } else {
        this.classList.remove('border-red-500');
    }
});

document.getElementById('confirmPassword').addEventListener('input', function () {
    const password = document.getElementById('password').value;
    if (this.value && this.value !== password) {
        this.classList.add('border-red-500');
    } else {
        this.classList.remove('border-red-500');
    }
});

