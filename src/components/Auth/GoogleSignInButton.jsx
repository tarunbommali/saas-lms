import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Google Sign-In Button Component
 * Renders Google's official sign-in button using their SDK
 * 
 * @param {Object} props
 * @param {string} props.theme - 'outline' | 'filled_blue' | 'filled_black' (default: 'outline')
 * @param {string} props.size - 'large' | 'medium' | 'small' (default: 'large')
 * @param {string} props.text - 'signin_with' | 'signup_with' | 'continue_with' (default: 'continue_with')
 * @param {string} props.shape - 'rectangular' | 'pill' | 'circle' | 'square' (default: 'rectangular')
 * @param {number} props.width - Button width in pixels (default: 300)
 * @param {Function} props.onSuccess - Callback when sign-in succeeds
 * @param {Function} props.onError - Callback when sign-in fails
 * @param {string} props.className - Additional CSS classes for the container
 */
const GoogleSignInButton = ({
    theme = 'outline',
    size = 'large',
    text = 'continue_with',
    shape = 'rectangular',
    width = 300,
    onSuccess,
    onError,
    className = '',
}) => {
    const containerRef = useRef(null);
    const { renderGoogleButton, handleGoogleCredential, isGoogleConfigured } = useAuth();

    useEffect(() => {
        if (!containerRef.current || !isGoogleConfigured) return;

        // Set up the callback before rendering the button
        const originalCallback = window.googleSignInCallback;

        window.googleSignInCallback = async (response) => {
            if (response?.credential) {
                try {
                    const user = await handleGoogleCredential(response.credential);
                    onSuccess?.(user);
                } catch (error) {
                    console.error('Google sign-in error:', error);
                    onError?.(error);
                }
            }
        };

        // Render the Google button
        renderGoogleButton(containerRef.current, {
            theme,
            size,
            text,
            shape,
            width,
        });

        return () => {
            window.googleSignInCallback = originalCallback;
        };
    }, [renderGoogleButton, handleGoogleCredential, isGoogleConfigured, theme, size, text, shape, width, onSuccess, onError]);

    if (!isGoogleConfigured) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={`google-signin-button ${className}`}
            style={{ display: 'flex', justifyContent: 'center' }}
        />
    );
};

export default GoogleSignInButton;
