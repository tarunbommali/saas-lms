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
    "duration": 4.0,  # Duration should be numeric (weeks)
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

# Existing test data from review request
EXISTING_COURSE_ID = "80f49e63-b381-426c-8196-bbc09cfad7c8"
EXISTING_MODULE_ID = "d12641ba-e8c5-4adb-940c-150e938a8e99"
EXISTING_QUIZ_ID = "3a721760-a873-4c55-9c2e-c0dd41708a33"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_course_id = None
        self.test_enrollment_id = None
        self.test_module_id = None
        self.test_lesson_id = None
        self.test_quiz_id = None
        self.test_question_id = None
        self.test_attempt_id = None
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
        # This should return 401 for invalid credential
        self.assert_response(response, 401, "Google Auth - Invalid Credential")

    def test_courses_list(self):
        """Test courses listing"""
        self.log("Testing courses listing...")
        
        # Test public courses list
        response = self.session.get(f"{API_BASE}/courses")
        self.assert_response(response, 200, "Courses List - Public")
        
        # Test with simple query parameters (avoid ilike issue)
        response = self.session.get(f"{API_BASE}/courses?featured=true")
        self.assert_response(response, 200, "Courses List - Featured Filter")

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

    # =====================================================
    # NEW LMS API TESTS
    # =====================================================

    def test_lms_modules_apis(self):
        """Test Module APIs comprehensively"""
        self.log("\n🏗️ Testing Module APIs...")
        
        if not self.admin_token:
            self.log("❌ No admin token available for module tests", "ERROR")
            return
            
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Get modules for existing course (public access)
        response = self.session.get(f"{API_BASE}/modules/{EXISTING_COURSE_ID}")
        self.assert_response(response, 200, "Get Modules for Course - Public")
        
        # Test 2: Create a new module (admin only)
        module_data = {
            "courseId": EXISTING_COURSE_ID,
            "title": "Test Module for LMS Testing",
            "description": "A comprehensive test module for API validation",
            "summary": "Test module summary",
            "orderIndex": 1,
            "durationMinutes": 60,
            "contentType": "video",
            "contentUrl": "https://example.com/video.mp4",
            "isFreePreview": False,
            "isPublished": True,
            "requiresPreviousCompletion": True,
            "passingScore": 80
        }
        
        response = self.session.post(f"{API_BASE}/modules", 
                                   headers=admin_headers,
                                   json=module_data)
        if self.assert_response(response, 201, "Create Module - Admin"):
            data = response.json()
            if "module" in data and "id" in data["module"]:
                self.test_module_id = data["module"]["id"]
                self.log(f"✅ Module created with ID: {self.test_module_id}")
        
        # Test 3: Create module without admin token (should fail)
        response = self.session.post(f"{API_BASE}/modules", json=module_data)
        self.assert_response(response, 401, "Create Module - No Token")
        
        # Test 4: Create module with user token (should fail)
        if self.user_token:
            response = self.session.post(f"{API_BASE}/modules", 
                                       headers=user_headers,
                                       json=module_data)
            self.assert_response(response, 403, "Create Module - User Token")
        
        # Test 5: Get single module details
        if self.test_module_id:
            response = self.session.get(f"{API_BASE}/modules/detail/{self.test_module_id}")
            self.assert_response(response, 200, "Get Module Details")
        
        # Test 6: Update module (admin only)
        if self.test_module_id:
            update_data = {
                "title": "Updated Test Module",
                "durationMinutes": 90,
                "passingScore": 85
            }
            response = self.session.put(f"{API_BASE}/modules/{self.test_module_id}",
                                      headers=admin_headers,
                                      json=update_data)
            self.assert_response(response, 200, "Update Module - Admin")
            
            # Test update without admin
            if self.user_token:
                response = self.session.put(f"{API_BASE}/modules/{self.test_module_id}",
                                          headers=user_headers,
                                          json=update_data)
                self.assert_response(response, 403, "Update Module - User Token")
        
        # Test 7: Create lesson for module
        if self.test_module_id:
            lesson_data = {
                "title": "Test Lesson for Module",
                "description": "A test lesson for API validation",
                "orderIndex": 1,
                "durationMinutes": 30,
                "contentType": "video",
                "contentUrl": "https://example.com/lesson.mp4",
                "isFreePreview": False,
                "isPublished": True
            }
            
            response = self.session.post(f"{API_BASE}/modules/{self.test_module_id}/lessons",
                                       headers=admin_headers,
                                       json=lesson_data)
            if self.assert_response(response, 201, "Create Lesson - Admin"):
                data = response.json()
                if "lesson" in data and "id" in data["lesson"]:
                    self.test_lesson_id = data["lesson"]["id"]
                    self.log(f"✅ Lesson created with ID: {self.test_lesson_id}")
        
        # Test 8: Get lessons for module
        if self.test_module_id:
            response = self.session.get(f"{API_BASE}/modules/{self.test_module_id}/lessons")
            self.assert_response(response, 200, "Get Module Lessons")
        
        # Test 9: Update lesson
        if self.test_lesson_id:
            lesson_update = {"title": "Updated Test Lesson", "durationMinutes": 45}
            response = self.session.put(f"{API_BASE}/modules/lessons/{self.test_lesson_id}",
                                      headers=admin_headers,
                                      json=lesson_update)
            self.assert_response(response, 200, "Update Lesson - Admin")
        
        # Test 10: Reorder modules
        if self.test_module_id:
            reorder_data = {
                "moduleOrder": [
                    {"moduleId": self.test_module_id, "orderIndex": 2}
                ]
            }
            response = self.session.put(f"{API_BASE}/modules/reorder/{EXISTING_COURSE_ID}",
                                      headers=admin_headers,
                                      json=reorder_data)
            self.assert_response(response, 200, "Reorder Modules - Admin")

    def test_lms_quizzes_apis(self):
        """Test Quiz APIs comprehensively"""
        self.log("\n📝 Testing Quiz APIs...")
        
        if not self.admin_token:
            self.log("❌ No admin token available for quiz tests", "ERROR")
            return
            
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Get quizzes for course
        response = self.session.get(f"{API_BASE}/quizzes/course/{EXISTING_COURSE_ID}")
        self.assert_response(response, 200, "Get Quizzes for Course")
        
        # Test 2: Get quizzes for module
        if self.test_module_id:
            response = self.session.get(f"{API_BASE}/quizzes/module/{self.test_module_id}")
            self.assert_response(response, 200, "Get Quizzes for Module")
        
        # Test 3: Create a new quiz (admin only)
        quiz_data = {
            "courseId": EXISTING_COURSE_ID,
            "moduleId": self.test_module_id,
            "title": "Test Quiz for LMS Testing",
            "description": "A comprehensive test quiz for API validation",
            "instructions": "Answer all questions to the best of your ability",
            "passingScore": 70,
            "timeLimitMinutes": 30,
            "maxAttempts": 3,
            "shuffleQuestions": True,
            "shuffleOptions": True,
            "showCorrectAnswers": True,
            "showScore": True,
            "isRequired": True,
            "isPublished": True,
            "orderIndex": 1
        }
        
        response = self.session.post(f"{API_BASE}/quizzes", 
                                   headers=admin_headers,
                                   json=quiz_data)
        if self.assert_response(response, 201, "Create Quiz - Admin"):
            data = response.json()
            if "quiz" in data and "id" in data["quiz"]:
                self.test_quiz_id = data["quiz"]["id"]
                self.log(f"✅ Quiz created with ID: {self.test_quiz_id}")
        
        # Test 4: Create quiz without admin token (should fail)
        response = self.session.post(f"{API_BASE}/quizzes", json=quiz_data)
        self.assert_response(response, 401, "Create Quiz - No Token")
        
        # Test 5: Create quiz with user token (should fail)
        if self.user_token:
            response = self.session.post(f"{API_BASE}/quizzes", 
                                       headers=user_headers,
                                       json=quiz_data)
            self.assert_response(response, 403, "Create Quiz - User Token")
        
        # Test 6: Add questions to quiz
        if self.test_quiz_id:
            question_data = {
                "questionText": "What is the capital of India?",
                "questionType": "multiple_choice",
                "options": ["Mumbai", "Delhi", "Kolkata", "Chennai"],
                "correctAnswer": "Delhi",
                "explanation": "Delhi is the capital city of India",
                "points": 10,
                "orderIndex": 1,
                "difficulty": "easy",
                "tags": ["geography", "india"]
            }
            
            response = self.session.post(f"{API_BASE}/quizzes/{self.test_quiz_id}/questions",
                                       headers=admin_headers,
                                       json=question_data)
            if self.assert_response(response, 201, "Add Question to Quiz - Admin"):
                data = response.json()
                if "question" in data and "id" in data["question"]:
                    self.test_question_id = data["question"]["id"]
                    self.log(f"✅ Question created with ID: {self.test_question_id}")
        
        # Test 7: Add another question for better testing
        if self.test_quiz_id:
            question_data2 = {
                "questionText": "Which programming language is used for backend development?",
                "questionType": "multiple_choice",
                "options": ["JavaScript", "Python", "Java", "All of the above"],
                "correctAnswer": "All of the above",
                "explanation": "All these languages can be used for backend development",
                "points": 10,
                "orderIndex": 2,
                "difficulty": "medium"
            }
            
            response = self.session.post(f"{API_BASE}/quizzes/{self.test_quiz_id}/questions",
                                       headers=admin_headers,
                                       json=question_data2)
            self.assert_response(response, 201, "Add Second Question to Quiz - Admin")
        
        # Test 8: Get quiz with questions (requires auth)
        if self.test_quiz_id and self.user_token:
            response = self.session.get(f"{API_BASE}/quizzes/{self.test_quiz_id}",
                                      headers=user_headers)
            self.assert_response(response, 200, "Get Quiz with Questions - User")
            
            # Verify that correct answers are hidden for non-admin
            if response.status_code == 200:
                data = response.json()
                if "questions" in data and len(data["questions"]) > 0:
                    first_question = data["questions"][0]
                    if "correctAnswer" not in first_question or first_question["correctAnswer"] is None:
                        self.log("✅ Correct answers properly hidden for non-admin users")
                    else:
                        self.log("❌ Correct answers not hidden for non-admin users", "ERROR")
        
        # Test 9: Update quiz
        if self.test_quiz_id:
            update_data = {
                "title": "Updated Test Quiz",
                "passingScore": 75,
                "maxAttempts": 5
            }
            response = self.session.put(f"{API_BASE}/quizzes/{self.test_quiz_id}",
                                      headers=admin_headers,
                                      json=update_data)
            self.assert_response(response, 200, "Update Quiz - Admin")
        
        # Test 10: Update question
        if self.test_question_id:
            question_update = {
                "questionText": "What is the capital city of India?",
                "points": 15,
                "difficulty": "medium"
            }
            response = self.session.put(f"{API_BASE}/quizzes/questions/{self.test_question_id}",
                                      headers=admin_headers,
                                      json=question_update)
            self.assert_response(response, 200, "Update Question - Admin")

    def test_lms_quiz_taking_workflow(self):
        """Test the complete quiz taking workflow"""
        self.log("\n🎯 Testing Quiz Taking Workflow...")
        
        if not self.user_token or not self.test_quiz_id:
            self.log("❌ Missing user token or quiz ID for quiz taking tests", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Start quiz attempt (requires enrollment)
        response = self.session.post(f"{API_BASE}/quizzes/{self.test_quiz_id}/start",
                                   headers=user_headers)
        if self.assert_response(response, 201, "Start Quiz Attempt"):
            data = response.json()
            if "attempt" in data and "id" in data["attempt"]:
                self.test_attempt_id = data["attempt"]["id"]
                self.log(f"✅ Quiz attempt started with ID: {self.test_attempt_id}")
        
        # Test 2: Submit quiz answers
        if self.test_attempt_id:
            # Get the quiz questions first to know question IDs
            quiz_response = self.session.get(f"{API_BASE}/quizzes/{self.test_quiz_id}",
                                           headers=user_headers)
            if quiz_response.status_code == 200:
                quiz_data = quiz_response.json()
                questions = quiz_data.get("questions", [])
                
                # Prepare answers - mix correct and incorrect for testing
                answers = {}
                if len(questions) >= 2:
                    answers[questions[0]["id"]] = "Delhi"  # Correct answer
                    answers[questions[1]["id"]] = "JavaScript"  # Incorrect answer (correct is "All of the above")
                
                submit_data = {
                    "attemptId": self.test_attempt_id,
                    "answers": answers,
                    "timeSpentSeconds": 300
                }
                
                response = self.session.post(f"{API_BASE}/quizzes/{self.test_quiz_id}/submit",
                                           headers=user_headers,
                                           json=submit_data)
                if self.assert_response(response, 200, "Submit Quiz Answers"):
                    data = response.json()
                    score = data.get("score", 0)
                    passed = data.get("passed", False)
                    correct_answers = data.get("correctAnswers", 0)
                    total_questions = data.get("totalQuestions", 0)
                    
                    self.log(f"✅ Quiz submitted - Score: {score}%, Correct: {correct_answers}/{total_questions}, Passed: {passed}")
                    
                    # Verify scoring logic
                    if len(questions) >= 2:
                        expected_score = 50  # 1 correct out of 2 questions
                        if abs(score - expected_score) <= 5:  # Allow small variance
                            self.log("✅ Quiz scoring logic working correctly")
                        else:
                            self.log(f"❌ Quiz scoring incorrect - Expected ~{expected_score}%, Got {score}%", "ERROR")
        
        # Test 3: Get user's quiz attempts
        response = self.session.get(f"{API_BASE}/quizzes/{self.test_quiz_id}/attempts",
                                  headers=user_headers)
        self.assert_response(response, 200, "Get User Quiz Attempts")
        
        # Test 4: Get specific attempt details
        if self.test_attempt_id:
            response = self.session.get(f"{API_BASE}/quizzes/attempts/{self.test_attempt_id}",
                                      headers=user_headers)
            self.assert_response(response, 200, "Get Specific Attempt Details")
        
        # Test 5: Try to start another attempt (should work if under max attempts)
        response = self.session.post(f"{API_BASE}/quizzes/{self.test_quiz_id}/start",
                                   headers=user_headers)
        # This should either succeed (if under max attempts) or fail with appropriate message
        if response.status_code in [201, 400]:
            if response.status_code == 201:
                self.log("✅ Second quiz attempt started successfully")
                self.results["passed"] += 1
            else:
                data = response.json()
                if "Maximum attempts" in data.get("error", ""):
                    self.log("✅ Max attempts limit working correctly")
                    self.results["passed"] += 1
                else:
                    self.log(f"❌ Unexpected error on second attempt: {data.get('error')}", "ERROR")
                    self.results["failed"] += 1
        else:
            self.log(f"❌ Unexpected status code for second attempt: {response.status_code}", "ERROR")
            self.results["failed"] += 1

    def test_lms_learning_progress_apis(self):
        """Test Learning Progress APIs"""
        self.log("\n📊 Testing Learning Progress APIs...")
        
        if not self.user_token:
            self.log("❌ No user token available for progress tests", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Get complete course progress (requires enrollment)
        response = self.session.get(f"{API_BASE}/learning-progress/{EXISTING_COURSE_ID}",
                                  headers=user_headers)
        self.assert_response(response, 200, "Get Course Learning Progress")
        
        # Test 2: Update module progress
        if self.test_module_id:
            progress_data = {
                "progressPercentage": 50,
                "timeSpentMinutes": 30,
                "status": "in_progress"
            }
            response = self.session.put(f"{API_BASE}/learning-progress/module/{self.test_module_id}",
                                      headers=user_headers,
                                      json=progress_data)
            self.assert_response(response, 200, "Update Module Progress")
        
        # Test 3: Update lesson progress
        if self.test_lesson_id:
            lesson_progress_data = {
                "progressPercentage": 75,
                "timeSpentMinutes": 20,
                "lastPosition": 450,
                "notes": "Completed video content",
                "status": "in_progress"
            }
            response = self.session.put(f"{API_BASE}/learning-progress/lesson/{self.test_lesson_id}",
                                      headers=user_headers,
                                      json=lesson_progress_data)
            self.assert_response(response, 200, "Update Lesson Progress")
        
        # Test 4: Mark module as complete (should fail if quiz required and not passed)
        if self.test_module_id:
            response = self.session.post(f"{API_BASE}/learning-progress/module/{self.test_module_id}/complete",
                                       headers=user_headers)
            # This might fail if quiz is required and not passed with sufficient score
            if response.status_code in [200, 400]:
                if response.status_code == 200:
                    self.log("✅ Module marked as complete successfully")
                    self.results["passed"] += 1
                else:
                    data = response.json()
                    if "quiz" in data.get("error", "").lower():
                        self.log("✅ Gated learning working - quiz required for completion")
                        self.results["passed"] += 1
                    else:
                        self.log(f"❌ Unexpected error completing module: {data.get('error')}", "ERROR")
                        self.results["failed"] += 1
            else:
                self.log(f"❌ Unexpected status code for module completion: {response.status_code}", "ERROR")
                self.results["failed"] += 1
        
        # Test 5: Test without authentication
        response = self.session.get(f"{API_BASE}/learning-progress/{EXISTING_COURSE_ID}")
        self.assert_response(response, 401, "Get Progress - No Auth")

    def test_lms_admin_vs_user_access(self):
        """Test admin vs non-admin access control"""
        self.log("\n🔐 Testing Admin vs User Access Control...")
        
        if not self.user_token:
            self.log("❌ No user token available for access control tests", "ERROR")
            return
            
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test admin-only endpoints with user token (should all fail with 403)
        admin_only_tests = [
            ("POST", f"{API_BASE}/modules", {"courseId": EXISTING_COURSE_ID, "title": "Test"}),
            ("PUT", f"{API_BASE}/modules/{EXISTING_MODULE_ID}", {"title": "Updated"}),
            ("DELETE", f"{API_BASE}/modules/{EXISTING_MODULE_ID}", None),
            ("POST", f"{API_BASE}/quizzes", {"courseId": EXISTING_COURSE_ID, "title": "Test Quiz"}),
            ("PUT", f"{API_BASE}/quizzes/{EXISTING_QUIZ_ID}", {"title": "Updated Quiz"}),
            ("DELETE", f"{API_BASE}/quizzes/{EXISTING_QUIZ_ID}", None),
        ]
        
        for method, url, data in admin_only_tests:
            if method == "POST":
                response = self.session.post(url, headers=user_headers, json=data)
            elif method == "PUT":
                response = self.session.put(url, headers=user_headers, json=data)
            elif method == "DELETE":
                response = self.session.delete(url, headers=user_headers)
            
            endpoint_name = url.split("/")[-1] if method == "DELETE" else f"{method} {url.split('/')[-1]}"
            self.assert_response(response, 403, f"Admin Only - {endpoint_name} (User Token)")

    def test_lms_cleanup(self):
        """Clean up LMS test data"""
        self.log("\n🧹 Cleaning up LMS test data...")
        
        if not self.admin_token:
            return
            
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Delete test lesson
        if self.test_lesson_id:
            response = self.session.delete(f"{API_BASE}/modules/lessons/{self.test_lesson_id}",
                                         headers=admin_headers)
            if response.status_code == 200:
                self.log("✅ Test lesson deleted")
            else:
                self.log(f"⚠️ Failed to delete test lesson: {response.status_code}")
        
        # Delete test question
        if self.test_question_id:
            response = self.session.delete(f"{API_BASE}/quizzes/questions/{self.test_question_id}",
                                         headers=admin_headers)
            if response.status_code == 200:
                self.log("✅ Test question deleted")
            else:
                self.log(f"⚠️ Failed to delete test question: {response.status_code}")
        
        # Delete test quiz
        if self.test_quiz_id:
            response = self.session.delete(f"{API_BASE}/quizzes/{self.test_quiz_id}",
                                         headers=admin_headers)
            if response.status_code == 200:
                self.log("✅ Test quiz deleted")
            else:
                self.log(f"⚠️ Failed to delete test quiz: {response.status_code}")
        
        # Delete test module
        if self.test_module_id:
            response = self.session.delete(f"{API_BASE}/modules/{self.test_module_id}",
                                         headers=admin_headers)

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
            
            # NEW LMS API tests
            self.log("\n🏗️ Testing NEW LMS APIs...")
            self.test_lms_modules_apis()
            self.test_lms_quizzes_apis()
            self.test_lms_quiz_taking_workflow()
            self.test_lms_learning_progress_apis()
            self.test_lms_admin_vs_user_access()
            
            # LMS Cleanup
            self.test_lms_cleanup()
            
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