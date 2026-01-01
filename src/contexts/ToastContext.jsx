import React, { createContext, useContext } from 'react';
import { ToastContainer } from '../components/ui/Toast';
import useToast from '../hooks/useToast';

/**
 * Toast Context for global notifications
 */
const ToastContext = createContext(null);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children, position = 'top-right' }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer
        toasts={toast.toasts}
        removeToast={toast.removeToast}
        position={position}
      />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
