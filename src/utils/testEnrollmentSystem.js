/* eslint-disable no-console */
/**
 * Test script for enrollment system CRUD operations (MySQL/API version)
 * This can be run in the browser console for testing
 * 
 * NOTE: This test script uses the API-based services, not Firebase.
 */

import { apiRequest } from '../api/client.js';

export const testEnrollmentSystem = async () => {
  console.log('🧪 Starting Enrollment System Tests (API/MySQL)...');

  const testResults = {
    courseListing: false,
    userProfile: false,
    enrollmentListing: false,
  };

  try {
    // Test 1: List courses
    console.log('📝 Test 1: Listing courses...');
    try {
      const courses = await apiRequest('/courses');
      if (courses && Array.isArray(courses)) {
        testResults.courseListing = true;
        console.log(`✅ Course listing test passed (${courses.length} courses found)`);
      }
    } catch (error) {
      console.error('❌ Course listing test failed:', error.message);
    }

    // Test 2: Get current user profile (requires auth)
    console.log('📝 Test 2: Getting user profile...');
    try {
      const user = await apiRequest('/auth/me');
      if (user && user.id) {
        testResults.userProfile = true;
        console.log(`✅ User profile test passed (User: ${user.email})`);
      }
    } catch (error) {
      console.error('❌ User profile test failed:', error.message);
      console.log('   (This is expected if not logged in)');
    }

    // Test 3: List enrollments (requires auth)
    console.log('📝 Test 3: Listing enrollments...');
    try {
      const enrollments = await apiRequest('/enrollments');
      if (enrollments && Array.isArray(enrollments)) {
        testResults.enrollmentListing = true;
        console.log(`✅ Enrollment listing test passed (${enrollments.length} enrollments found)`);
      }
    } catch (error) {
      console.error('❌ Enrollment listing test failed:', error.message);
      console.log('   (This is expected if not logged in)');
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The API system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check if you are logged in for auth-required tests.');
  }

  return testResults;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testEnrollmentSystem = testEnrollmentSystem;
}

export default testEnrollmentSystem;