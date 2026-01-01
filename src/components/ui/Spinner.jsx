import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Spinner/Loading Component
 */
const Spinner = ({ size = 'md', className, color = 'primary' }) => {
  const sizes = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const colors = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    success: 'border-green-600 border-t-transparent',
    error: 'border-red-600 border-t-transparent',
    warning: 'border-yellow-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizes[size],
        colors[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Loading Screen Component
 */
const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-50"
      data-testid="loading-screen"
    >
      <Spinner size="xl" />
      <p className="mt-4 text-gray-600 text-lg">{message}</p>
    </div>
  );
};

/**
 * Loading Overlay Component
 */
const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader Component
 */
const Skeleton = ({ className, variant = 'rectangular', ...props }) => {
  const variants = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Spinner, LoadingScreen, LoadingOverlay, Skeleton };
export default Spinner;
