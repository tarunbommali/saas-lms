import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Enhanced Card Component
 * Supports hover effects, borders, shadows, and interactive states
 */
const Card = React.forwardRef(({ 
  className, 
  children,
  elevated = false,
  hoverable = false,
  bordered = true,
  padding = true,
  onClick,
  ...props 
}, ref) => {
  const isInteractive = !!onClick || hoverable;
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg transition-all duration-200',
        bordered && 'border border-gray-200',
        elevated && 'shadow-lg',
        !elevated && 'shadow-sm',
        padding && 'p-6',
        isInteractive && 'cursor-pointer hover:shadow-md hover:border-blue-300 active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-2 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight text-gray-900',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-gray-100', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };