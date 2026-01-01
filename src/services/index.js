import {
  authApi,
  coursesApi,
  enrollmentsApi,
  paymentsApi,
  couponsApi,
  usersApi,
  progressApi,
  certificationsApi,
  modulesApi,
  quizzesApi,
  learningProgressApi,
} from '../api/index.js';

const toError = (error) => {
  if (!error) return 'Request failed';
  if (typeof error === 'string') return error;
  return error.message || error.statusText || 'Request failed';
};

const wrapSuccess = (data, extras = {}) => ({ success: true, data, ...extras });
const wrapFailure = (error, extras = {}) => ({ success: false, error: toError(error), ...extras });

const normalizeUser = (user) => {
  if (!user) return null;
  const normalized = authApi?.normalizeUser ? authApi.normalizeUser(user) : { ...user };
  const uid = normalized.uid ?? normalized.id ?? normalized.userId ?? normalized.user_id;
  const isActive = normalized.isActive ?? normalized.active ?? normalized.status === 'active';
  const isAdmin = normalized.isAdmin ?? normalized.role === 'admin';
  return {
    ...normalized,
    uid: uid ?? null,
    id: normalized.id ?? uid ?? null,
    role: normalized.role ?? (isAdmin ? 'admin' : 'student'),
    isAdmin,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    status: normalized.status ?? (isActive ? 'active' : 'inactive'),
  };
};

const normalizeCourse = (course) => {
  if (!course) return null;
  const id = String(course.courseId ?? course.id ?? course.slug ?? '');
  return {
    ...course,
    id,
    courseId: course.courseId ?? id,
    price: Number.isFinite(Number(course.price)) ? Number(course.price) : 0,
    originalPrice: Number.isFinite(Number(course.originalPrice))
      ? Number(course.originalPrice)
      : course.originalPrice ?? null,
  };
};

export const createOrUpdateUser = async (_user, payload = {}) => {
  try {
    const result = await authApi.updateProfile(payload);
    return wrapSuccess(normalizeUser(result));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserProfile = async (userId) => {
  try {
    if (!userId) {
      const profile = await authApi.fetchCurrentUser();
      return wrapSuccess(normalizeUser(profile));
    }

    if (userId === 'me') {
      const profile = await authApi.fetchCurrentUser();
      return wrapSuccess(normalizeUser(profile));
    }

    const user = await usersApi.getUserById(userId);
    return wrapSuccess(normalizeUser(user));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateUserProfile = async (_userId, payload) => {
  try {
    const result = await authApi.updateProfile(payload);
    return wrapSuccess(normalizeUser(result));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createUserWithCredentials = async (payload) => {
  try {
    const result = await usersApi.createUser(payload);
    return wrapSuccess(normalizeUser(result));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserData = async (userId) => {
  try {
    if (!userId) {
      return wrapFailure('User ID is required');
    }
    const user = await usersApi.getUserById(userId);
    return wrapSuccess(normalizeUser(user));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const toggleUserAccountStatus = async (userId, status) => {
  try {
    const result = await usersApi.updateUserById(userId, { status });
    return wrapSuccess(normalizeUser(result));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateUserRole = async (userId, role) => {
  try {
    const result = await usersApi.updateUserById(userId, { role });
    return wrapSuccess(normalizeUser(result));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllUsersData = async (limit) => {
  try {
    const users = await usersApi.getAllUsers({ limit });
    return wrapSuccess(users.map((user) => normalizeUser(user)));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllCourses = async (params = {}) => {
  try {
    let courses;
    try {
      courses = await coursesApi.getAdminCourses();
    } catch {
      courses = await coursesApi.getCourses(params);
    }
    return wrapSuccess(Array.isArray(courses) ? courses.map((course) => normalizeCourse(course)) : []);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getCourseById = async (courseId) => {
  try {
    const course = await coursesApi.getCourseById(courseId);
    return wrapSuccess(normalizeCourse(course));
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createCourse = async (payload) => {
  try {
    const result = await coursesApi.createCourse(payload);
    if (!result?.success) {
      return wrapFailure(result?.error || 'Failed to create course', { details: result?.payload, status: result?.status });
    }
    return wrapSuccess(result.data);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateCourse = async (courseId, payload) => {
  try {
    const result = await coursesApi.updateCourse(courseId, payload);
    if (!result?.success) {
      return wrapFailure(result?.error || 'Failed to update course', { details: result?.payload, status: result?.status });
    }
    return wrapSuccess(result.data);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const deleteCourse = async (courseId) => {
  try {
    await coursesApi.deleteCourse(courseId);
    return wrapSuccess(true);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createEnrollment = async (payload) => {
  try {
    const enrollment = await enrollmentsApi.createEnrollment(payload);
    return wrapSuccess(enrollment);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createEnrollmentWithPayment = async (enrollmentPayload, paymentPayload = {}) => {
  try {
    const enrollmentResult = await createEnrollment(enrollmentPayload);
    if (!enrollmentResult.success) {
      return enrollmentResult;
    }

    const paymentResult = await createPaymentRecord({
      ...paymentPayload,
      courseId: enrollmentPayload.courseId,
      enrollmentId: enrollmentResult.data?.id || paymentPayload.enrollmentId,
    });

    if (!paymentResult.success) {
      return paymentResult;
    }

    return wrapSuccess({
      enrollment: enrollmentResult.data,
      payment: paymentResult.data,
    });
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserEnrollments = async (userId) => {
  try {
    const enrollments = userId
      ? await enrollmentsApi.getUserEnrollments(userId)
      : await enrollmentsApi.getMyEnrollments();
    return wrapSuccess(enrollments);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const checkUserEnrollment = async (_userId, courseId) => {
  try {
    const enrollment = await enrollmentsApi.checkUserEnrollment(courseId);
    return wrapSuccess({
      isEnrolled: Boolean(enrollment),
      enrollment,
    });
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateEnrollmentProgress = async (enrollmentId, payload) => {
  try {
    const updated = await enrollmentsApi.updateEnrollment(enrollmentId, { progress: payload });
    return wrapSuccess(updated);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserEnrollmentStats = async (userId) => {
  try {
    const stats = await enrollmentsApi.getUserEnrollmentStats(userId);
    return wrapSuccess(stats);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateEnrollment = async (enrollmentId, payload) => {
  try {
    const updated = await enrollmentsApi.updateEnrollment(enrollmentId, payload);
    return wrapSuccess(updated);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const deleteEnrollment = async (enrollmentId) => {
  try {
    await enrollmentsApi.deleteEnrollment(enrollmentId);
    return wrapSuccess(true);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllEnrollments = async (params) => {
  try {
    const enrollments = await enrollmentsApi.getAllEnrollments(params);
    return wrapSuccess(enrollments);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getEnrollmentById = async (enrollmentId) => {
  try {
    const enrollment = await enrollmentsApi.getEnrollmentById(enrollmentId);
    return wrapSuccess(enrollment);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllActiveCoupons = async () => {
  try {
    const coupons = await couponsApi.getActiveCoupons();
    return wrapSuccess(coupons);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllCoupons = async () => {
  try {
    const allCoupons = await couponsApi.getAllCoupons();
    return wrapSuccess(allCoupons);
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      try {
        const fallback = await couponsApi.getActiveCoupons();
        return wrapSuccess(fallback, { scope: 'active' });
      } catch (fallbackError) {
        return wrapFailure(fallbackError, { details: fallbackError?.payload });
      }
    }
    return wrapFailure(error, { details: error?.payload });
  }
};

export const validateCouponCode = async (code, courseId, userId, amount) => {
  try {
    const response = await couponsApi.validateCouponCode({ code, courseId, userId, amount });
    if (!response.valid) {
      return wrapFailure(response.message || 'Invalid coupon');
    }
    return wrapSuccess(response, { coupon: response.coupon, discount: response.discount });
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const applyCoupon = async (code, courseId, userId, amount) => {
  try {
    const response = await couponsApi.applyCoupon({ code, courseId, userId, amount });
    if (!response.applied) {
      return wrapFailure(response.message || 'Failed to apply coupon');
    }
    return wrapSuccess(response, { coupon: response.coupon, discount: response.discount });
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createCoupon = async (payload) => {
  try {
    const coupon = await couponsApi.createCoupon(payload);
    return wrapSuccess(coupon);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateCoupon = async (couponId, payload) => {
  try {
    const coupon = await couponsApi.updateCoupon(couponId, payload);
    return wrapSuccess(coupon);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const deleteCoupon = async (couponId) => {
  try {
    await couponsApi.deleteCoupon(couponId);
    return wrapSuccess(true);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createPaymentRecord = async (payload) => {
  try {
    const payment = await paymentsApi.createPaymentRecord(payload);
    return wrapSuccess(payment);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updatePaymentStatus = async (paymentId, statusPayload) => {
  try {
    const payment = await paymentsApi.updatePaymentStatus(paymentId, statusPayload);
    return wrapSuccess(payment);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserPaymentHistory = async () => {
  try {
    const payments = await paymentsApi.getMyPayments();
    return wrapSuccess(payments);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllPayments = async (params) => {
  try {
    const payments = await paymentsApi.getAllPayments(params);
    return wrapSuccess(payments);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getUserProgress = async (_userId, courseId) => {
  try {
    const progress = await progressApi.getUserProgress(courseId);
    if (!progress) {
      return wrapFailure('Progress not found');
    }
    return wrapSuccess(progress);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateUserProgress = async (_userId, courseId, payload) => {
  try {
    const progress = await progressApi.updateUserProgress(courseId, payload);
    return wrapSuccess(progress);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getAllCertifications = async (params = {}) => {
  try {
    const certifications = await certificationsApi.getAdminCertifications(params);
    return wrapSuccess(Array.isArray(certifications) ? certifications : []);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getCertificationById = async (certificationId) => {
  try {
    if (!certificationId) {
      return wrapFailure('Certification ID is required');
    }
    const certification = await certificationsApi.getCertificationById(certificationId);
    return wrapSuccess(certification);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createCertification = async (payload) => {
  try {
    if (!payload?.userId || !payload?.courseId) {
      return wrapFailure('userId and courseId are required');
    }

    const response = await certificationsApi.createCertification(payload);
    return wrapSuccess(response);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateCertification = async (certificationId, payload) => {
  try {
    if (!certificationId) {
      return wrapFailure('Certification ID is required');
    }

    const response = await certificationsApi.updateCertification(certificationId, payload);
    return wrapSuccess(response);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const deleteCertification = async (certificationId) => {
  try {
    if (!certificationId) {
      return wrapFailure('Certification ID is required');
    }

    await certificationsApi.deleteCertification(certificationId);
    return wrapSuccess(true);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getSecureVideoAccessUrl = async (_userId, courseId, payload) => {
  try {
    const result = await progressApi.getSecureVideoAccessUrl(courseId, payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

// =====================================================
// LMS Services - Modules, Quizzes, Learning Progress
// =====================================================

// Module Services
export const getModulesByCourse = async (courseId) => {
  try {
    const modules = await modulesApi.getModulesByCourse(courseId);
    return wrapSuccess(modules);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getModuleById = async (moduleId) => {
  try {
    const module = await modulesApi.getModuleById(moduleId);
    return wrapSuccess(module);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const createModule = async (payload) => {
  try {
    const result = await modulesApi.createModule(payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateModule = async (moduleId, payload) => {
  try {
    const result = await modulesApi.updateModule(moduleId, payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const deleteModule = async (moduleId) => {
  try {
    await modulesApi.deleteModule(moduleId);
    return wrapSuccess(true);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

// Quiz Services
export const getQuizzesByCourse = async (courseId) => {
  try {
    const quizzes = await quizzesApi.getQuizzesByCourse(courseId);
    return wrapSuccess(quizzes);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getQuizById = async (quizId) => {
  try {
    const quiz = await quizzesApi.getQuizById(quizId);
    return wrapSuccess(quiz);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const startQuizAttempt = async (quizId) => {
  try {
    const result = await quizzesApi.startQuizAttempt(quizId);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const submitQuizAnswers = async (quizId, payload) => {
  try {
    const result = await quizzesApi.submitQuizAnswers(quizId, payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getQuizAttempts = async (quizId) => {
  try {
    const attempts = await quizzesApi.getQuizAttempts(quizId);
    return wrapSuccess(attempts);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

// Learning Progress Services
export const getCourseProgress = async (courseId) => {
  try {
    const progress = await learningProgressApi.getCourseProgress(courseId);
    return wrapSuccess(progress);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateModuleProgress = async (moduleId, payload) => {
  try {
    const result = await learningProgressApi.updateModuleProgress(moduleId, payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const updateLessonProgress = async (lessonId, payload) => {
  try {
    const result = await learningProgressApi.updateLessonProgress(lessonId, payload);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const completeModule = async (moduleId) => {
  try {
    const result = await learningProgressApi.completeModule(moduleId);
    return wrapSuccess(result);
  } catch (error) {
    return wrapFailure(error, { details: error?.payload });
  }
};

export const getProfileViaAPI = getUserProfile;
export const updateProfileViaAPI = updateUserProfile;

export default {
  createOrUpdateUser,
  createUserWithCredentials,
  getUserProfile,
  updateUserProfile,
  getUserData,
  toggleUserAccountStatus,
  updateUserRole,
  getAllUsersData,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  createEnrollment,
  getUserEnrollments,
  getAllEnrollments,
  getEnrollmentById,
  checkUserEnrollment,
  updateEnrollmentProgress,
  getUserEnrollmentStats,
  updateEnrollment,
  deleteEnrollment,
  getAllActiveCoupons,
  getAllCoupons,
  validateCouponCode,
  applyCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  createPaymentRecord,
  updatePaymentStatus,
  getAllPayments,
  getUserPaymentHistory,
  createEnrollmentWithPayment,
  getUserProgress,
  updateUserProgress,
  getSecureVideoAccessUrl,
  getProfileViaAPI,
  updateProfileViaAPI,
  getAllCertifications,
  getCertificationById,
  createCertification,
  updateCertification,
  deleteCertification,
  // LMS Services
  getModulesByCourse,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  getQuizzesByCourse,
  getQuizById,
  startQuizAttempt,
  submitQuizAnswers,
  getQuizAttempts,
  getCourseProgress,
  updateModuleProgress,
  updateLessonProgress,
  completeModule,
};
