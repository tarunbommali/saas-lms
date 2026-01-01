import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const isAuthenticated = Boolean(currentUser);
  const isAdmin = currentUser?.isAdmin || currentUser?.is_admin;

  if (loading) return <div className="p-8 text-center">Loading user status...</div>;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/signin"
        replace
        state={{ from: location }}
      />
    );
  }
  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;

