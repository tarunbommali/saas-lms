import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const buildNotification = (notification = {}) => ({
  id: notification.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`),
  createdAt: notification.createdAt || new Date().toISOString(),
  isRead: Boolean(notification.isRead),
  isDeleted: Boolean(notification.isDeleted),
  ...notification,
});

export const useRealtimeNotifications = (options = {}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const { limitCount = 50, enabled = true } = options;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && isAuthenticated));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || !currentUser?.uid) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(false);
    setError(null);
    return [];
  }, [enabled, isAuthenticated, currentUser?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutateNotifications = useCallback((updater) => {
    setNotifications((prev) => {
      const updated = updater(prev);
      return Array.isArray(updated) ? updated.slice(0, limitCount) : prev;
    });
  }, [limitCount]);

  const markAsRead = useCallback((notificationId) => {
    mutateNotifications((prev) => prev.map((notification) => (
      notification.id === notificationId
        ? { ...notification, isRead: true, readAt: new Date().toISOString() }
        : notification
    )));
    return { success: true };
  }, [mutateNotifications]);

  const markAllAsRead = useCallback(() => {
    mutateNotifications((prev) => prev.map((notification) => ({
      ...notification,
      isRead: true,
      readAt: new Date().toISOString(),
    })));
    return { success: true };
  }, [mutateNotifications]);

  const deleteNotification = useCallback((notificationId) => {
    mutateNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    return { success: true };
  }, [mutateNotifications]);

  const unreadCount = (notifications || []).filter((notification) => !notification.isRead).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
};

export const useNotificationCreator = () => {
  const [error, setError] = useState(null);

  const unsupported = useCallback(async () => {
    const message = 'Notifications service is not configured.';
    setError(message);
    return { success: false, error: message };
  }, []);

  return {
    createNotification: unsupported,
    createBulkNotifications: unsupported,
    loading: false,
    error,
    resetError: () => setError(null),
  };
};

export const NOTIFICATION_TYPES = {
  ENROLLMENT_SUCCESS: 'enrollment_success',
  COURSE_COMPLETED: 'course_completed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  COURSE_UPDATED: 'course_updated',
  NEW_COURSE_AVAILABLE: 'new_course_available',
  COUPON_EXPIRING: 'coupon_expiring',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
};

export const createNotificationData = (type, userId, data = {}) => {
  const baseData = buildNotification({
    userId,
    type,
    isRead: false,
    isDeleted: false,
    priority: 'low',
  });

  switch (type) {
    case NOTIFICATION_TYPES.ENROLLMENT_SUCCESS:
      return {
        ...baseData,
        title: 'Enrollment Successful!',
        message: `You have successfully enrolled in ${data.courseTitle}`,
        actionUrl: `/learn/${data.courseId}`,
        icon: 'book-open',
        priority: 'high',
      };

    case NOTIFICATION_TYPES.COURSE_COMPLETED:
      return {
        ...baseData,
        title: 'Course Completed!',
        message: `Congratulations! You have completed ${data.courseTitle}`,
        actionUrl: `/course/${data.courseId}`,
        icon: 'award',
        priority: 'high',
      };

    case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
      return {
        ...baseData,
        title: 'Payment Successful!',
        message: `Your payment of ₹${data.amount} has been processed successfully`,
        actionUrl: '/profile',
        icon: 'credit-card',
        priority: 'medium',
      };

    case NOTIFICATION_TYPES.PAYMENT_FAILED:
      return {
        ...baseData,
        title: 'Payment Failed',
        message: `Your payment for ${data.courseTitle} could not be processed`,
        actionUrl: `/course/${data.courseId}`,
        icon: 'alert-circle',
        priority: 'high',
      };

    case NOTIFICATION_TYPES.COURSE_UPDATED:
      return {
        ...baseData,
        title: 'Course Updated',
        message: `${data.courseTitle} has been updated with new content`,
        actionUrl: `/course/${data.courseId}`,
        icon: 'refresh-cw',
        priority: 'medium',
      };

    case NOTIFICATION_TYPES.NEW_COURSE_AVAILABLE:
      return {
        ...baseData,
        title: 'New Course Available!',
        message: `Check out the new course: ${data.courseTitle}`,
        actionUrl: `/course/${data.courseId}`,
        icon: 'star',
        priority: 'medium',
      };

    case NOTIFICATION_TYPES.COUPON_EXPIRING:
      return {
        ...baseData,
        title: 'Coupon Expiring Soon',
        message: `Your coupon ${data.couponCode} expires in ${data.daysLeft} days`,
        actionUrl: '/courses',
        icon: 'clock',
        priority: 'medium',
      };

    case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
      return {
        ...baseData,
        title: data.title || 'System Announcement',
        message: data.message,
        actionUrl: data.actionUrl || '/',
        icon: 'megaphone',
        priority: data.priority || 'low',
      };

    default:
      return {
        ...baseData,
        title: 'Notification',
        message: 'You have a new notification',
        icon: 'bell',
        priority: 'low',
      };
  }
};

export default {
  useRealtimeNotifications,
  useNotificationCreator,
  NOTIFICATION_TYPES,
  createNotificationData,
};