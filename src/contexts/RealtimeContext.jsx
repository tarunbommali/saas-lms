import { createContext, useContext, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  useRealtimeCourses,
  useRealtimeUserEnrollments,
  useRealtimeAdminUsers,
  useRealtimeAdminEnrollments,
  useRealtimeAdminPayments,
  useRealtimeCoupons,
  useRealtimeCourseMutations,
  useRealtimeEnrollmentMutations
} from '../hooks/useRealtimeApi.js';

const RealtimeContext = createContext(undefined);

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
};

export const RealtimeProvider = ({ children }) => {
  const { currentUser, isAuthenticated, isAdmin } = useAuth();

  // ============================================================================
  // REAL-TIME DATA HOOKS
  // ============================================================================

  // Courses data
  const { 
    data: courses, 
    loading: coursesLoading, 
    error: coursesError 
  } = useRealtimeCourses({ 
    publishedOnly: true, 
    limitCount: 50 
  });

  // User enrollments
  const { 
    enrollments, 
    loading: enrollmentsLoading, 
    error: enrollmentsError, 
    isEnrolled,
    enrollmentCount 
  } = useRealtimeUserEnrollments(currentUser?.uid, { 
    enabled: isAuthenticated 
  });

  // Admin data (only load if user is admin)
  const { 
    data: adminUsers, 
    loading: adminUsersLoading, 
    error: adminUsersError 
  } = useRealtimeAdminUsers({ 
    enabled: isAdmin 
  });

  const { 
    data: adminEnrollments, 
    loading: adminEnrollmentsLoading, 
    error: adminEnrollmentsError 
  } = useRealtimeAdminEnrollments({ 
    enabled: isAdmin 
  });

  const { 
    data: adminPayments, 
    loading: adminPaymentsLoading, 
    error: adminPaymentsError 
  } = useRealtimeAdminPayments({ 
    enabled: isAdmin 
  });

  // Coupons data
  const { 
    data: coupons, 
    loading: couponsLoading, 
    error: couponsError 
  } = useRealtimeCoupons({ 
    activeOnly: true 
  });

  // ============================================================================
  // REAL-TIME MUTATION HOOKS
  // ============================================================================

  const { 
    updateCourse, 
    createCourse, 
    loading: courseMutationsLoading, 
    error: courseMutationsError 
  } = useRealtimeCourseMutations();

  const { 
    createEnrollment, 
    updateEnrollmentProgress, 
    loading: enrollmentMutationsLoading, 
    error: enrollmentMutationsError 
  } = useRealtimeEnrollmentMutations();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const adminStats = useMemo(() => {
    if (!isAdmin) return null;

    const totalUsers = adminUsers?.length || 0;
    const totalEnrollments = adminEnrollments?.length || 0;
    const totalRevenue = adminPayments?.reduce((sum, payment) => {
      return sum + (payment.status === 'captured' ? payment.amount : 0);
    }, 0) || 0;
    const totalCourses = courses?.length || 0;

    return {
      totalUsers,
      totalEnrollments,
      totalRevenue,
      totalCourses,
      activeCoupons: coupons?.length || 0
    };
  }, [isAdmin, adminUsers, adminEnrollments, adminPayments, courses, coupons]);

  const userStats = useMemo(() => {
    if (!isAuthenticated) return null;

    return {
      enrolledCourses: enrollmentCount,
      completedCourses: enrollments?.filter(e => e.progress?.completionPercentage >= 100).length || 0,
      totalSpent: enrollments?.reduce((sum, enrollment) => {
        return sum + (enrollment.amount || 0);
      }, 0) || 0
    };
  }, [isAuthenticated, enrollments, enrollmentCount]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getCourseById = useCallback((courseId) => {
    return courses?.find(c => String(c.id) === String(courseId));
  }, [courses]);

  const getUserEnrollmentsByCourse = useCallback((courseId) => {
    return enrollments?.filter(e => String(e.courseId) === String(courseId));
  }, [enrollments]);

  const getRecentEnrollments = useCallback((limit = 10) => {
    return adminEnrollments?.slice(0, limit) || [];
  }, [adminEnrollments]);

  const getRecentPayments = useCallback((limit = 10) => {
    return adminPayments?.slice(0, limit) || [];
  }, [adminPayments]);

  const parseDate = useCallback((value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    if (value && typeof value === 'object') {
      if (typeof value.toDate === 'function') return value.toDate();
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    }
    return null;
  }, []);

  const getActiveCoupons = useCallback(() => {
    if (!Array.isArray(coupons)) return [];

    return coupons.filter((coupon) => {
      if (coupon?.isActive === false) return false;
      const expiry = parseDate(
        coupon?.validUntil ||
        coupon?.valid_until ||
        coupon?.expiresAt ||
        coupon?.expires_at ||
        coupon?.expiryDate ||
        coupon?.expiry_date ||
        coupon?.endDate ||
        coupon?.end_date
      );

      if (!expiry) return true;
      return expiry.getTime() >= Date.now();
    });
  }, [coupons, parseDate]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo(() => ({
    // Real-time data
    courses,
    enrollments,
    adminUsers,
    adminEnrollments,
    adminPayments,
    coupons,

    // Loading states
    coursesLoading,
    enrollmentsLoading,
    adminUsersLoading,
    adminEnrollmentsLoading,
    adminPaymentsLoading,
    couponsLoading,
    courseMutationsLoading,
    enrollmentMutationsLoading,

    // Error states
    coursesError,
    enrollmentsError,
    adminUsersError,
    adminEnrollmentsError,
    adminPaymentsError,
    couponsError,
    courseMutationsError,
    enrollmentMutationsError,

    // Computed values
    adminStats,
    userStats,

    // Helper functions
    isEnrolled,
    getCourseById,
    getUserEnrollmentsByCourse,
    getRecentEnrollments,
    getRecentPayments,
    getActiveCoupons,

    // Mutations
    updateCourse,
    createCourse,
    createEnrollment,
    updateEnrollmentProgress,

    // Status
    isConnected: !coursesError && !enrollmentsError,
    lastUpdated: new Date().toISOString()
  }), [
    courses,
    enrollments,
    adminUsers,
    adminEnrollments,
    adminPayments,
    coupons,
    coursesLoading,
    enrollmentsLoading,
    adminUsersLoading,
    adminEnrollmentsLoading,
    adminPaymentsLoading,
    couponsLoading,
    courseMutationsLoading,
    enrollmentMutationsLoading,
    coursesError,
    enrollmentsError,
    adminUsersError,
    adminEnrollmentsError,
    adminPaymentsError,
    couponsError,
    courseMutationsError,
    enrollmentMutationsError,
    adminStats,
    userStats,
    isEnrolled,
    getCourseById,
    getUserEnrollmentsByCourse,
    getRecentEnrollments,
    getRecentPayments,
    getActiveCoupons,
    updateCourse,
    createCourse,
    createEnrollment,
    updateEnrollmentProgress
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};