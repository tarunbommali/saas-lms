/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ToastNotification = ({
  show = false,
  message = '',
  type = 'info',
  duration = 5000,
  onClose,
  position = 'bottom-center', // ✅ default now bottom-center
  showCloseButton = true,
  title,
  action
}) => {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getIconConfig = () => {
    const baseConfig = {
      success: {
        icon: CheckCircle,
        color: colors.success,
        bgColor: isDark ? 'rgba(110, 231, 183, 0.1)' : 'rgba(56, 161, 105, 0.1)',
        borderColor: isDark ? 'rgba(110, 231, 183, 0.3)' : 'rgba(56, 161, 105, 0.3)'
      },
      error: {
        icon: XCircle,
        color: colors.error,
        bgColor: isDark ? 'rgba(255, 105, 97, 0.1)' : 'rgba(217, 83, 79, 0.1)',
        borderColor: isDark ? 'rgba(255, 105, 97, 0.3)' : 'rgba(217, 83, 79, 0.3)'
      },
      warning: {
        icon: AlertTriangle,
        color: colors.warning,
        bgColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(245, 158, 11, 0.3)'
      },
      info: {
        icon: Info,
        color: colors.primary,
        bgColor: isDark ? 'rgba(77, 159, 255, 0.1)' : 'rgba(10, 102, 194, 0.1)',
        borderColor: isDark ? 'rgba(77, 159, 255, 0.3)' : 'rgba(10, 102, 194, 0.3)'
      }
    };
    return baseConfig[type] || baseConfig.info;
  };

  // ✅ updated to include bottom-center default
  const getPositionClasses = () => {
    const positionMap = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };
    return positionMap[position] || positionMap['bottom-center'];
  };

  // ✅ animation from bottom for center positions
  const getAnimationClass = () => {
    const centerTopBottom = ['top-center', 'bottom-center'];
    if (centerTopBottom.includes(position)) {
      return position === 'bottom-center'
        ? 'animate-in slide-in-from-bottom-full duration-300'
        : 'animate-in slide-in-from-top-full duration-300';
    }
    return 'animate-in slide-in-from-right-full duration-300';
  };

  const { icon: IconComponent, color, bgColor, borderColor } = getIconConfig();
  const positionClasses = getPositionClasses();
  const animationClass = getAnimationClass();

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full sm:max-w-md
        ${animationClass}
        ${positionClasses}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          relative flex items-start gap-3 p-4 rounded-lg shadow-lg
          border transition-all duration-200 ease-in-out
          hover:shadow-xl transform hover:scale-[1.02]
        `}
        style={{
          backgroundColor: colors.surface,
          borderColor: borderColor,
          color: colors.textHigh
        }}
      >
        <div
          className="flex-shrink-0 mt-0.5 rounded-full p-1"
          style={{ backgroundColor: bgColor }}
        >
          <IconComponent size={20} style={{ color }} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-sm font-semibold mb-1"
              style={{ color: colors.textHigh }}
            >
              {title}
            </h3>
          )}
          <p
            className="text-sm leading-relaxed"
            style={{ color: colors.textMedium }}
          >
            {message}
          </p>
          {action && <div className="mt-2">{action}</div>}
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 ml-2 p-1 rounded-md transition-colors
              hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2
            `}
            style={{ color: colors.textLow }}
            aria-label="Close notification"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        {duration > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 rounded-b-lg origin-left"
            style={{ backgroundColor: color }}
          >
            <div
              className="h-full rounded-b-lg transition-all duration-linear"
              style={{
                backgroundColor: color,
                animation: `shrinkWidth ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;
