import { useState, useEffect } from 'react';
import { debounce } from '../utils/helpers';

/**
 * Custom hook for debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    handler();

    return () => {
      // Cleanup
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
