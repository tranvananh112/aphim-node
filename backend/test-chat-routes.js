/**
 * TEST SCRIPT - Chat Routes
 * Kiểm tra xem các API chat-ban và chat-role có hoạt động không
 */

const API_URL = 'http://localhost:5000/api';

// Lấy token từ localStorage hoặc hardcode để test
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Thay bằng token thật
const TEST_USER_ID = '6995284bf98d98c43817f2cd'; // Thay bằng user ID thật

async function testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        console.log('✅ Health Check:', data);
        return true;
    } catch (err) {
        console.error('❌ Health Check Failed:', err.message);
        return false;
    }
}

async function testChatBan() {
    console.log('\n🔍 Testing Chat Ban API...');
    try {
        const res = await fetch(`${API_URL}/users/${TEST_USER_ID}/chat-ban`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.status === 404) {
            console.error('❌ 404 Not Found - Route chưa được đăng ký hoặc server chưa restart');
            return false;
        }

        if (res.status === 401) {
            console.error('❌ 401 Unauthorized - Token không hợp lệ hoặc không phải admin');
            return false;
        }

        const data = await res.json();
        console.log('✅ Chat Ban Response:', data);
        return true;
    } catch (err) {
        console.error('❌ Chat Ban Failed:', err.message);
        return false;
    }
}

async function testChatRole() {
    console.log('\n🔍 Testing Chat Role API...');
    try {
        const res = await fetch(`${API_URL}/users/${TEST_USER_ID}/chat-role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: 'admin' })
        });

        if (res.status === 404) {
            console.error('❌ 404 Not Found - Route chưa được đăng ký hoặc server chưa restart');
            return false;
        }

        if (res.status === 401) {
            console.error('❌ 401 Unauthorized - Token không hợp lệ hoặc không phải admin');
            return false;
        }

        const data = await res.json();
        console.log('✅ Chat Role Response:', data);
        return true;
    } catch (err) {
        console.error('❌ Chat Role Failed:', err.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Chat Routes Tests...\n');
    console.log('📝 Config:');
    console.log('   API URL:', API_URL);
    console.log('   User ID:', TEST_USER_ID);
    console.log('   Token:', ADMIN_TOKEN ? 'Set' : 'NOT SET');

    const healthOk = await testHealthCheck();
    if (!healthOk) {
        console.error('\n❌ Server không chạy hoặc không kết nối được!');
        console.log('\n💡 Giải pháp:');
        console.log('   1. Kiểm tra server có đang chạy: cd backend && node server.js');
        console.log('   2. Kiểm tra port 5000 có bị chiếm: netstat -ano | findstr :5000');
        return;
    }

    if (!ADMIN_TOKEN || ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
        console.error('\n❌ Chưa set ADMIN_TOKEN!');
        console.log('\n💡 Cách lấy token:');
        console.log('   1. Mở admin/chat.html trong browser');
        console.log('   2. Mở Console (F12)');
        console.log('   3. Gõ: localStorage.getItem("cinestream_admin_token")');
        console.log('   4. Copy token và paste vào file này');
        return;
    }

    await testChatBan();
    await testChatRole();

    console.log('\n✅ Tests completed!');
}

// Run tests
runTests();
