import React from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Button Component
 * Supports multiple variants, sizes, loading state, and icons
 */
const Button = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      asChild = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    // eslint-disable-next-line no-unused-vars
    const { colors } = useTheme();

    const baseClasses =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none";

    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm hover:shadow-md active:scale-95",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 border border-gray-300",
      outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500",
      ghost: "text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500",
      link: "text-blue-600 hover:text-blue-700 hover:underline underline-offset-4",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm hover:shadow-md active:scale-95",
      success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm hover:shadow-md active:scale-95",
      warning: "bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500 shadow-sm hover:shadow-md active:scale-95",
    };

    const sizes = {
      xs: "h-7 px-2 text-xs",
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 py-2 text-base",
      lg: "h-12 px-6 text-lg",
      xl: "h-14 px-8 text-xl",
      icon: "h-10 w-10 p-0",
    };

    const widthClass = fullWidth ? "w-full" : "";

    const classes = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      widthClass,
      loading && "relative cursor-wait",
      className
    );

    // If asChild is true, render the single child element and merge classes/props
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(classes, children.props.className),
        ref,
        ...props,
      });
    }

    return (
      <button 
        className={classes} 
        ref={ref} 
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className={loading ? "opacity-0" : ""}>{children}</span>
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
