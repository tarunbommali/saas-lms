import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../utils/constants';

/**
 * Custom hook to detect responsive breakpoints
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

/**
 * Hook to detect specific breakpoints
 */
export const useBreakpoint = () => {
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.SM}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.MD}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.LG}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.XL}px)`);
  const is2Xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2XL']}px)`);

  return {
    isMobile: !isSm,
    isTablet: isSm && !isLg,
    isDesktop: isLg,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
  };
};

export default useMediaQuery;
