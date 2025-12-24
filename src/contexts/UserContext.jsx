import { createContext, useContext } from 'react';
import { useUserEnrollments } from '../hooks/useApiData.js';
import { useAuth } from './AuthContext';

const UserContext = createContext(undefined);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { enrollments, loading: loadingEnrollments, error: enrollmentsError, isEnrolled, refreshEnrollments } = useUserEnrollments(currentUser?.uid);

  const value = {
    enrollments,
    loadingEnrollments,
    enrollmentsError,
    isEnrolled,
    refreshEnrollments,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};