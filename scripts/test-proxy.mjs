#!/usr/bin/env node

/**
 * Quick test script to verify proxy configuration
 */

console.log('🧪 Testing Proxy Configuration...\n');

// Test 1: Check if backend is accessible
console.log('Test 1: Checking backend health endpoint...');
fetch('http://localhost:3000/api/health')
    .then(res => res.json())
    .then(data => {
        console.log('✅ Backend is running:', data.message);
    })
    .catch(err => {
        console.log('❌ Backend not accessible:', err.message);
        console.log('   Make sure backend is running on port 3000');
    });

// Test 2: Check if frontend dev server is accessible
console.log('\nTest 2: Checking frontend dev server...');
fetch('http://localhost:5173')
    .then(res => {
        console.log('✅ Frontend dev server is running on port 5173');
    })
    .catch(err => {
        console.log('❌ Frontend not accessible:', err.message);
        console.log('   Make sure Vite is running on port 5173');
    });

// Test 3: Check proxy
console.log('\nTest 3: Testing proxy (frontend -> backend)...');
fetch('http://localhost:5173/api/health')
    .then(res => res.json())
    .then(data => {
        console.log('✅ Proxy is working! Frontend can access backend API');
        console.log('   Response:', data.message);
    })
    .catch(err => {
        console.log('❌ Proxy not working:', err.message);
    });

setTimeout(() => {
    console.log('\n📝 Summary:');
    console.log('   - Access your app at: http://localhost:5173');
    console.log('   - Backend API runs on: http://localhost:3000');
    console.log('   - All /api requests from frontend are proxied to backend');
}, 2000);
