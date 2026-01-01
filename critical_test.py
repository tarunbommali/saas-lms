#!/usr/bin/env python3
"""
JNTU-GV Backend API Critical Test Suite
Tests core functionality without rate-limited endpoints
"""

import requests
import json
import time
import sys

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

class CriticalAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
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

    def test_critical_apis(self):
        """Test all critical APIs"""
        self.log("Testing Critical Backend APIs...")
        self.log("=" * 50)
        
        # 1. Health Check
        self.log("\n🏥 Health Check")
        response = self.session.get(f"{API_BASE}/health")
        self.assert_response(response, 200, "Health Check")
        
        # 2. Authentication Flow
        self.log("\n🔐 Authentication Tests")
        
        # Login as admin
        response = self.session.post(f"{API_BASE}/auth/login", json=ADMIN_CREDENTIALS)
        if self.assert_response(response, 200, "Admin Login"):
            self.admin_token = response.json().get("token")
        
        # Login as user
        response = self.session.post(f"{API_BASE}/auth/login", json=TEST_USER_CREDENTIALS)
        if self.assert_response(response, 200, "User Login"):
            self.user_token = response.json().get("token")
        
        # Test /me endpoint
        if self.user_token:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = self.session.get(f"{API_BASE}/auth/me", headers=headers)
            self.assert_response(response, 200, "Get User Profile")
        
        # 3. Course APIs
        self.log("\n📚 Course APIs")
        
        # List courses
        response = self.session.get(f"{API_BASE}/courses")
        self.assert_response(response, 200, "List Courses")
        
        # Create course (admin only)
        if self.admin_token:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            course_data = {
                "title": "Critical Test Course",
                "description": "Test course for critical API testing",
                "price": 999,
                "duration": 2.0,
                "isPublished": True
            }
            response = self.session.post(f"{API_BASE}/courses", 
                                       headers=admin_headers, 
                                       json=course_data)
            if self.assert_response(response, 201, "Create Course (Admin)"):
                course_id = response.json().get("course", {}).get("id")
                
                # Get specific course
                response = self.session.get(f"{API_BASE}/courses/{course_id}")
                self.assert_response(response, 200, "Get Specific Course")
                
                # 4. Enrollment APIs
                self.log("\n📝 Enrollment APIs")
                
                if self.user_token and course_id:
                    user_headers = {"Authorization": f"Bearer {self.user_token}"}
                    
                    # Create enrollment
                    enrollment_data = {
                        "courseId": course_id,
                        "courseTitle": "Critical Test Course",
                        "paymentData": {"method": "free", "amount": 0}
                    }
                    response = self.session.post(f"{API_BASE}/enrollments",
                                               headers=user_headers,
                                               json=enrollment_data)
                    if self.assert_response(response, 201, "Create Enrollment"):
                        enrollment_id = response.json().get("id")
                        
                        # Get my enrollments
                        response = self.session.get(f"{API_BASE}/enrollments/my-enrollments",
                                                  headers=user_headers)
                        self.assert_response(response, 200, "Get My Enrollments")
                        
                        # Get enrollment by course ID
                        response = self.session.get(f"{API_BASE}/enrollments/{course_id}",
                                                  headers=user_headers)
                        self.assert_response(response, 200, "Get Enrollment by Course")
                        
                        # 5. Progress APIs
                        self.log("\n📊 Progress APIs")
                        
                        # Get progress
                        response = self.session.get(f"{API_BASE}/progress/{course_id}",
                                                  headers=user_headers)
                        self.assert_response(response, 200, "Get Progress")
                        
                        # Update progress
                        progress_data = {
                            "completionPercentage": 50,
                            "currentModule": 1,
                            "timeSpent": 1800
                        }
                        response = self.session.put(f"{API_BASE}/progress/{course_id}",
                                                  headers=user_headers,
                                                  json=progress_data)
                        self.assert_response(response, 200, "Update Progress")
                        
                        # Update enrollment with task progress
                        if enrollment_id:
                            task_progress_data = {
                                "taskProgress": {
                                    "totalTasks": 5,
                                    "completedTasks": 3,
                                    "completionPercentage": 60,
                                    "validated": False
                                }
                            }
                            response = self.session.put(f"{API_BASE}/enrollments/{enrollment_id}",
                                                      headers=user_headers,
                                                      json=task_progress_data)
                            self.assert_response(response, 200, "Update Enrollment Progress")
                
                # Cleanup - delete test course
                response = self.session.delete(f"{API_BASE}/courses/{course_id}",
                                             headers=admin_headers)
                if response.status_code == 200:
                    self.log("✅ Test course cleaned up")
        
        # 6. Authorization Tests
        self.log("\n🔒 Authorization Tests")
        
        # Test unauthorized access
        response = self.session.post(f"{API_BASE}/courses", json={"title": "Unauthorized"})
        self.assert_response(response, 401, "Create Course - No Token")
        
        # Test forbidden access (user trying admin action)
        if self.user_token:
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            response = self.session.post(f"{API_BASE}/courses", 
                                       headers=user_headers, 
                                       json={"title": "Forbidden"})
            self.assert_response(response, 403, "Create Course - User Token")
        
        # Test invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        response = self.session.get(f"{API_BASE}/auth/me", headers=invalid_headers)
        self.assert_response(response, 401, "Get Profile - Invalid Token")

    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "=" * 50)
        self.log("CRITICAL API TEST RESULTS")
        self.log("=" * 50)
        self.log(f"✅ Passed: {self.results['passed']}")
        self.log(f"❌ Failed: {self.results['failed']}")
        self.log(f"📊 Total: {self.results['passed'] + self.results['failed']}")
        
        if self.results["errors"]:
            self.log("\n🚨 FAILED TESTS:")
            for error in self.results["errors"]:
                self.log(f"  • {error}")
        
        if self.results["failed"] == 0:
            self.log("\n🎉 ALL CRITICAL TESTS PASSED!")
            return True
        else:
            self.log(f"\n⚠️ {self.results['failed']} CRITICAL TESTS FAILED")
            return False

    def run(self):
        """Run critical tests"""
        try:
            self.test_critical_apis()
        except Exception as e:
            self.log(f"❌ Critical test suite failed: {str(e)}", "ERROR")
            self.results["failed"] += 1
        
        return self.print_summary()

if __name__ == "__main__":
    tester = CriticalAPITester()
    success = tester.run()
    sys.exit(0 if success else 1)