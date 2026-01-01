import React from 'react';
import { cn } from '../../utils/cn';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { TOAST_TYPES } from '../../utils/constants';

/**
 * Enhanced Toast Notification Component
 */
const Toast = ({ 
  message, 
  type = TOAST_TYPES.INFO, 
  onClose,
  duration = 5000,
  className 
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const icons = {
    [TOAST_TYPES.SUCCESS]: <CheckCircle className="w-5 h-5" />,
    [TOAST_TYPES.ERROR]: <AlertCircle className="w-5 h-5" />,
    [TOAST_TYPES.WARNING]: <AlertTriangle className="w-5 h-5" />,
    [TOAST_TYPES.INFO]: <Info className="w-5 h-5" />,
  };

  const styles = {
    [TOAST_TYPES.SUCCESS]: 'bg-green-50 border-green-500 text-green-800',
    [TOAST_TYPES.ERROR]: 'bg-red-50 border-red-500 text-red-800',
    [TOAST_TYPES.WARNING]: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    [TOAST_TYPES.INFO]: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg min-w-[300px] max-w-md',
        'transition-all duration-300 ease-in-out',
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
        styles[type],
        className
      )}
      role="alert"
      data-testid={`toast-${type}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Close notification"
        data-testid="toast-close-button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container Component
 */
const ToastContainer = ({ toasts = [], removeToast, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-3',
        positionClasses[position] || positionClasses['top-right']
      )}
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export default Toast;
