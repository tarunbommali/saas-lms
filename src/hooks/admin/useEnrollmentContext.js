import { useState, useEffect, useCallback } from "react";
import {
  getAllUsersData,
  getAllCourses,
  getAllEnrollments,
} from "../../services/index.js";

export const useEnrollmentContext = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, coursesResult, enrollmentsResult] = await Promise.all([
        getAllUsersData(500),
        getAllCourses(),
        getAllEnrollments({ limit: 2000 }),
      ]);

      if (!usersResult?.success) {
        throw new Error(usersResult?.error || "Failed to fetch users");
      }
      if (!coursesResult?.success) {
        throw new Error(coursesResult?.error || "Failed to fetch courses");
      }
      if (!enrollmentsResult?.success) {
        throw new Error(enrollmentsResult?.error || "Failed to fetch enrollments");
      }

      const userList = Array.isArray(usersResult.data) ? usersResult.data : [];
      const courseList = Array.isArray(coursesResult.data) ? coursesResult.data : [];
      const enrollmentList = Array.isArray(enrollmentsResult.data) ? enrollmentsResult.data : [];

      const courseMap = new Map(courseList.map((course) => [String(course.courseId || course.id), course]));
      const userMap = new Map(userList.map((user) => [String(user.uid || user.id), user]));

      const normalizedEnrollments = enrollmentList.map((enrollment) => {
        const courseId = String(enrollment.courseId);
        const userId = String(enrollment.userId);
        return {
          ...enrollment,
          user: userMap.get(userId) || null,
          course: courseMap.get(courseId) || null,
        };
      });

      setUsers(userList);
      setCourses(courseList);
      setEnrollments(normalizedEnrollments);
    } catch (err) {
      const message = err?.message || "Failed to load data";
      setError(message);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshData = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    // State
    enrollments,
    users,
    courses,
    loading,
    error,
    
    // Actions
    refreshData,
    setEnrollments,
  };
};