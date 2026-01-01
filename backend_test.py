#!/usr/bin/env python3
"""
JNTU-GV Certification Platform Backend API Test Suite
Tests all backend APIs comprehensively including validation and authorization
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@example.com",
    "password": "your_admin_password"
}

TEST_USER_CREDENTIALS = {
    "email": "testuser@example.com", 
    "password": "TestPassword123"
}

# Test data
TEST_COURSE_DATA = {
    "title": "Test Course for API Testing",
    "description": "A comprehensive test course for API validation",
    "shortDescription": "Test course for backend API testing",
    "category": "Technology",
    "instructor": "Test Instructor",
    "duration": "4 weeks",
    "difficulty": "beginner",
    "language": "English",
    "price": 999,
    "currency": "INR",
    "isPublished": True,
    "isFeatured": False,
    "tags": ["testing", "api", "backend"],
    "requirements": ["Basic computer knowledge"],
    "whatYouLearn": ["API testing", "Backend validation"]
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_course_id = None
        self.test_enrollment_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")

    def assert_response(self, response: requests.Response, expected_status: int, test_name: str) -> bool:
        """Assert response status and log results"""
        try:
            if response.status_code == expected_status:
                self.log(f"✅ {test_name} - Status: {response.status_code}")
                self.results["passed"] += 1
                return True
            else:
                self.log(f"❌ {test_name} - Expected: {expected_status}, Got: {response.status_code}", "ERROR")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                self.results["failed"] += 1
                self.results["errors"].append(f"{test_name}: Expected {expected_status}, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: Exception - {str(e)}")
            return False

    def test_health_check(self):
        """Test basic health check"""
        self.log("Testing health check...")
        try:
            response = self.session.get(f"{API_BASE}/health")
            self.assert_response(response, 200, "Health Check")
            if response.status_code == 200:
                data = response.json()
                self.log(f"Server status: {data.get('status', 'unknown')}")
        except Exception as e:
            self.log(f"❌ Health check failed: {str(e)}", "ERROR")
            self.results["failed"] += 1

    def test_auth_signup_validation(self):
        """Test signup validation"""
        self.log("Testing signup validation...")
        
        # Test invalid email
        response = self.session.post(f"{API_BASE}/auth/signup", json={
            "email": "invalid-email",
            "password": "TestPassword123",
            "firstName": "Test",
            "lastName": "User"
        })
        self.assert_response(response, 400, "Signup - Invalid Email")
        
        # Test short password
        response = self.session.post(f"{API_BASE}/auth/signup", json={
            "email": "test@example.com",
            "password": "123",
            "firstName": "Test",
            "lastName": "User"
        })
        self.assert_response(response, 400, "Signup - Short Password")
        
        # Test missing required fields
        response = self.session.post(f"{API_BASE}/auth/signup", json={
            "email": "test@example.com"
        })
        self.assert_response(response, 400, "Signup - Missing Password")

    def test_auth_signup_success(self):
        """Test successful signup"""
        self.log("Testing successful signup...")
        
        # Create unique test user
        test_email = f"testuser_{int(time.time())}@example.com"
        response = self.session.post(f"{API_BASE}/auth/signup", json={
            "email": test_email,
            "password": "TestPassword123",
            "firstName": "Test",
            "lastName": "User",
            "displayName": "Test User"
        })
        
        if self.assert_response(response, 201, "Signup - Success"):
            data = response.json()
            if "token" in data and "user" in data:
                self.log("✅ Signup returned token and user data")
            else:
                self.log("❌ Signup missing token or user data", "ERROR")

    def test_auth_login_validation(self):
        """Test login validation"""
        self.log("Testing login validation...")
        
        # Test invalid credentials
        response = self.session.post(f"{API_BASE}/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        self.assert_response(response, 401, "Login - Invalid Credentials")
        
        # Test missing fields
        response = self.session.post(f"{API_BASE}/auth/login", json={
            "email": "test@example.com"
        })
        self.assert_response(response, 400, "Login - Missing Password")

    def test_auth_login_success(self):
        """Test successful login and store tokens"""
        self.log("Testing successful login...")
        
        # Login as admin
        response = self.session.post(f"{API_BASE}/auth/login", json=ADMIN_CREDENTIALS)
        if self.assert_response(response, 200, "Admin Login"):
            data = response.json()
            self.admin_token = data.get("token")
            if self.admin_token:
                self.log("✅ Admin token obtained")
            else:
                self.log("❌ Admin token not found in response", "ERROR")
        
        # Login as test user
        response = self.session.post(f"{API_BASE}/auth/login", json=TEST_USER_CREDENTIALS)
        if self.assert_response(response, 200, "User Login"):
            data = response.json()
            self.user_token = data.get("token")
            if self.user_token:
                self.log("✅ User token obtained")
            else:
                self.log("❌ User token not found in response", "ERROR")

    def test_auth_me_without_token(self):
        """Test /me endpoint without token"""
        self.log("Testing /me without token...")
        response = self.session.get(f"{API_BASE}/auth/me")
        self.assert_response(response, 401, "Get Me - No Token")

    def test_auth_me_with_token(self):
        """Test /me endpoint with token"""
        self.log("Testing /me with token...")
        if not self.user_token:
            self.log("❌ No user token available for /me test", "ERROR")
            return
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.session.get(f"{API_BASE}/auth/me", headers=headers)
        if self.assert_response(response, 200, "Get Me - With Token"):
            data = response.json()
            if "email" in data and "id" in data:
                self.log("✅ User data returned correctly")
            else:
                self.log("❌ User data incomplete", "ERROR")

    def test_auth_profile_update(self):
        """Test profile update"""
        self.log("Testing profile update...")
        if not self.user_token:
            self.log("❌ No user token available for profile update test", "ERROR")
            return
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.session.put(f"{API_BASE}/auth/profile", 
                                  headers=headers,
                                  json={
                                      "firstName": "Updated",
                                      "lastName": "Name",
                                      "displayName": "Updated Name"
                                  })
        self.assert_response(response, 200, "Profile Update")

    def test_auth_forgot_password(self):
        """Test forgot password flow"""
        self.log("Testing forgot password...")
        
        # Test with valid email
        response = self.session.post(f"{API_BASE}/auth/forgot-password", json={
            "email": TEST_USER_CREDENTIALS["email"]
        })
        if self.assert_response(response, 200, "Forgot Password - Valid Email"):
            data = response.json()
            if "otp" in data:  # Development mode shows OTP
                self.log(f"✅ OTP received: {data['otp']}")
                return data["otp"]
        
        # Test with invalid email format
        response = self.session.post(f"{API_BASE}/auth/forgot-password", json={
            "email": "invalid-email"
        })
        self.assert_response(response, 400, "Forgot Password - Invalid Email")
        
        return None

    def test_auth_verify_otp(self):
        """Test OTP verification"""
        self.log("Testing OTP verification...")
        
        # First get OTP
        otp = self.test_auth_forgot_password()
        if not otp:
            self.log("❌ No OTP available for verification test", "ERROR")
            return None
            
        # Test valid OTP
        response = self.session.post(f"{API_BASE}/auth/verify-otp", json={
            "email": TEST_USER_CREDENTIALS["email"],
            "otp": otp
        })
        if self.assert_response(response, 200, "Verify OTP - Valid"):
            data = response.json()
            if "resetToken" in data:
                self.log("✅ Reset token received")
                return data["resetToken"]
        
        # Test invalid OTP
        response = self.session.post(f"{API_BASE}/auth/verify-otp", json={
            "email": TEST_USER_CREDENTIALS["email"],
            "otp": "000000"
        })
        self.assert_response(response, 400, "Verify OTP - Invalid")
        
        return None

    def test_auth_reset_password(self):
        """Test password reset"""
        self.log("Testing password reset...")
        
        # Get reset token
        reset_token = self.test_auth_verify_otp()
        if not reset_token:
            self.log("❌ No reset token available for password reset test", "ERROR")
            return
            
        # Test valid reset
        response = self.session.post(f"{API_BASE}/auth/reset-password", json={
            "token": reset_token,
            "newPassword": "NewTestPassword123"
        })
        if self.assert_response(response, 200, "Reset Password - Valid"):
            # Update credentials for future tests
            TEST_USER_CREDENTIALS["password"] = "NewTestPassword123"
            self.log("✅ Password reset successful")

    def test_auth_google_validation(self):
        """Test Google OAuth validation"""
        self.log("Testing Google OAuth validation...")
        
        # Test missing credential
        response = self.session.post(f"{API_BASE}/auth/google", json={})
        self.assert_response(response, 400, "Google Auth - Missing Credential")
        
        # Test invalid credential
        response = self.session.post(f"{API_BASE}/auth/google", json={
            "credential": "invalid_token"
        })
        # This should return 500 since Google OAuth is not configured
        self.assert_response(response, 500, "Google Auth - Not Configured")

    def test_courses_list(self):
        """Test courses listing"""
        self.log("Testing courses listing...")
        
        # Test public courses list
        response = self.session.get(f"{API_BASE}/courses")
        self.assert_response(response, 200, "Courses List - Public")
        
        # Test with query parameters
        response = self.session.get(f"{API_BASE}/courses?category=Technology&featured=true")
        self.assert_response(response, 200, "Courses List - With Filters")

    def test_courses_admin_only(self):
        """Test admin-only course operations"""
        self.log("Testing admin-only course operations...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return
            
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test course creation (admin only)
        response = self.session.post(f"{API_BASE}/courses", 
                                   headers=admin_headers,
                                   json=TEST_COURSE_DATA)
        if self.assert_response(response, 201, "Create Course - Admin"):
            data = response.json()
            if "course" in data and "id" in data["course"]:
                self.test_course_id = data["course"]["id"]
                self.log(f"✅ Course created with ID: {self.test_course_id}")
        
        # Test course creation without admin token
        response = self.session.post(f"{API_BASE}/courses", json=TEST_COURSE_DATA)
        self.assert_response(response, 401, "Create Course - No Token")
        
        # Test course creation with user token (should fail)
        if self.user_token:
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            response = self.session.post(f"{API_BASE}/courses", 
                                       headers=user_headers,
                                       json=TEST_COURSE_DATA)
            self.assert_response(response, 403, "Create Course - User Token")

    def test_courses_get_specific(self):
        """Test getting specific course"""
        self.log("Testing specific course retrieval...")
        
        if not self.test_course_id:
            self.log("❌ No test course ID available", "ERROR")
            return
            
        response = self.session.get(f"{API_BASE}/courses/{self.test_course_id}")
        self.assert_response(response, 200, "Get Specific Course")
        
        # Test non-existent course
        response = self.session.get(f"{API_BASE}/courses/non-existent-id")
        self.assert_response(response, 404, "Get Non-existent Course")

    def test_courses_update_delete(self):
        """Test course update and delete (admin only)"""
        self.log("Testing course update and delete...")
        
        if not self.admin_token or not self.test_course_id:
            self.log("❌ Missing admin token or course ID", "ERROR")
            return
            
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test course update
        update_data = {"title": "Updated Test Course", "price": 1299}
        response = self.session.put(f"{API_BASE}/courses/{self.test_course_id}",
                                  headers=admin_headers,
                                  json=update_data)
        self.assert_response(response, 200, "Update Course - Admin")
        
        # Test course update without admin
        if self.user_token:
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            response = self.session.put(f"{API_BASE}/courses/{self.test_course_id}",
                                      headers=user_headers,
                                      json=update_data)
            self.assert_response(response, 403, "Update Course - User Token")

    def test_enrollments_create(self):
        """Test enrollment creation"""
        self.log("Testing enrollment creation...")
        
        if not self.user_token or not self.test_course_id:
            self.log("❌ Missing user token or course ID", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        enrollment_data = {
            "courseId": self.test_course_id,
            "courseTitle": "Test Course for API Testing",
            "paymentData": {
                "method": "free",
                "amount": 0,
                "currency": "INR"
            }
        }
        
        response = self.session.post(f"{API_BASE}/enrollments",
                                   headers=user_headers,
                                   json=enrollment_data)
        if self.assert_response(response, 201, "Create Enrollment"):
            data = response.json()
            if "id" in data:
                self.test_enrollment_id = data["id"]
                self.log(f"✅ Enrollment created with ID: {self.test_enrollment_id}")

    def test_enrollments_my_enrollments(self):
        """Test getting user's enrollments"""
        self.log("Testing my enrollments...")
        
        if not self.user_token:
            self.log("❌ No user token available", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test with authentication
        response = self.session.get(f"{API_BASE}/enrollments/my-enrollments",
                                  headers=user_headers)
        self.assert_response(response, 200, "My Enrollments - Authenticated")
        
        # Test without authentication
        response = self.session.get(f"{API_BASE}/enrollments/my-enrollments")
        self.assert_response(response, 401, "My Enrollments - No Auth")

    def test_enrollments_get_specific(self):
        """Test getting specific enrollment"""
        self.log("Testing specific enrollment retrieval...")
        
        if not self.user_token or not self.test_course_id:
            self.log("❌ Missing user token or course ID", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        response = self.session.get(f"{API_BASE}/enrollments/{self.test_course_id}",
                                  headers=user_headers)
        self.assert_response(response, 200, "Get Enrollment by Course ID")

    def test_enrollments_update(self):
        """Test enrollment update"""
        self.log("Testing enrollment update...")
        
        if not self.user_token or not self.test_enrollment_id:
            self.log("❌ Missing user token or enrollment ID", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        update_data = {
            "completionPercentage": 50,
            "taskProgress": {
                "totalTasks": 10,
                "completedTasks": 5,
                "completionPercentage": 50
            }
        }
        
        response = self.session.put(f"{API_BASE}/enrollments/{self.test_enrollment_id}",
                                  headers=user_headers,
                                  json=update_data)
        self.assert_response(response, 200, "Update Enrollment")

    def test_progress_apis(self):
        """Test progress APIs"""
        self.log("Testing progress APIs...")
        
        if not self.user_token or not self.test_course_id:
            self.log("❌ Missing user token or course ID", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test get progress
        response = self.session.get(f"{API_BASE}/progress/{self.test_course_id}",
                                  headers=user_headers)
        self.assert_response(response, 200, "Get Progress")
        
        # Test update progress
        progress_data = {
            "completionPercentage": 75,
            "currentModule": 2,
            "currentLesson": 3,
            "timeSpent": 3600
        }
        
        response = self.session.put(f"{API_BASE}/progress/{self.test_course_id}",
                                  headers=user_headers,
                                  json=progress_data)
        self.assert_response(response, 200, "Update Progress")
        
        # Test without authentication
        response = self.session.get(f"{API_BASE}/progress/{self.test_course_id}")
        self.assert_response(response, 401, "Get Progress - No Auth")

    def test_cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...")
        
        if self.admin_token and self.test_course_id:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Delete test course
            response = self.session.delete(f"{API_BASE}/courses/{self.test_course_id}",
                                         headers=admin_headers)
            if response.status_code == 200:
                self.log("✅ Test course deleted")
            else:
                self.log(f"⚠️ Failed to delete test course: {response.status_code}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting JNTU-GV Backend API Test Suite...")
        self.log("=" * 60)
        
        try:
            # Basic health check
            self.test_health_check()
            
            # Auth API tests
            self.log("\n🔐 Testing Authentication APIs...")
            self.test_auth_signup_validation()
            self.test_auth_signup_success()
            self.test_auth_login_validation()
            self.test_auth_login_success()
            self.test_auth_me_without_token()
            self.test_auth_me_with_token()
            self.test_auth_profile_update()
            self.test_auth_forgot_password()
            self.test_auth_verify_otp()
            self.test_auth_reset_password()
            self.test_auth_google_validation()
            
            # Course API tests
            self.log("\n📚 Testing Course APIs...")
            self.test_courses_list()
            self.test_courses_admin_only()
            self.test_courses_get_specific()
            self.test_courses_update_delete()
            
            # Enrollment API tests
            self.log("\n📝 Testing Enrollment APIs...")
            self.test_enrollments_create()
            self.test_enrollments_my_enrollments()
            self.test_enrollments_get_specific()
            self.test_enrollments_update()
            
            # Progress API tests
            self.log("\n📊 Testing Progress APIs...")
            self.test_progress_apis()
            
            # Cleanup
            self.test_cleanup()
            
        except Exception as e:
            self.log(f"❌ Test suite failed with exception: {str(e)}", "ERROR")
            self.results["failed"] += 1
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"✅ Passed: {self.results['passed']}")
        self.log(f"❌ Failed: {self.results['failed']}")
        self.log(f"📊 Total: {self.results['passed'] + self.results['failed']}")
        
        if self.results["errors"]:
            self.log("\n🚨 FAILED TESTS:")
            for error in self.results["errors"]:
                self.log(f"  • {error}")
        
        if self.results["failed"] == 0:
            self.log("\n🎉 ALL TESTS PASSED!")
            return True
        else:
            self.log(f"\n⚠️ {self.results['failed']} TESTS FAILED")
            return False

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)