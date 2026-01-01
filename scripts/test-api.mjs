import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAPIs() {
    console.log('🧪 Testing API Endpoints...\n');

    const tests = [
        { name: 'Health Check', url: '/api/health' },
        { name: 'Public Courses', url: '/api/courses' },
        { name: 'Active Coupons', url: '/api/coupons/active' },
    ];

    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name}`);
            const response = await fetch(`${BASE_URL}${test.url}`);
            const data = await response.json();

            if (response.ok) {
                console.log(`✅ ${test.name}: SUCCESS`);
                if (test.url === '/api/health') {
                    console.log(`   Status: ${data.status}`);
                } else if (Array.isArray(data)) {
                    console.log(`   Found ${data.length} items`);
                }
            } else {
                console.log(`❌ ${test.name}: FAILED (${response.status})`);
                console.log(`   Error: ${data.error || data.message}`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: CONNECTION FAILED`);
            console.log(`   Error: ${error.message}`);
        }
        console.log('');
    }

    console.log('✨ API tests complete!');
}

testAPIs().catch(console.error);
