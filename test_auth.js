const axios = require('axios');

const API_BASE = 'http://localhost:8001/api';

async function testAuth() {
    try {
        console.log('Testing authentication flow...');
        
        // Test login
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login?username=demo&password=demo`, {}, {
            withCredentials: true,
            validateStatus: () => true
        });
        
        console.log('Login response:', loginResponse.status, loginResponse.data);
        
        if (loginResponse.status === 200) {
            // Extract cookies
            const cookies = loginResponse.headers['set-cookie'];
            console.log('Cookies received:', cookies);
            
            // Test session check
            console.log('2. Testing session check...');
            const sessionResponse = await axios.get(`${API_BASE}/auth/me`, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : ''
                },
                validateStatus: () => true
            });
            
            console.log('Session response:', sessionResponse.status, sessionResponse.data);
            
            // Test logout
            console.log('3. Testing logout...');
            const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : ''
                },
                validateStatus: () => true
            });
            
            console.log('Logout response:', logoutResponse.status, logoutResponse.data);
        }
        
        console.log('Authentication test completed!');
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testAuth();