import { useState, useCallback } from 'react';
import { getErrorMessage } from '../utils/apiHelpers';

/**
 * Custom hook for handling async operations with loading, error, and success states
 */
export const useAsync = (initialState = {}) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
    ...initialState,
  });

  const execute = useCallback(async (promise) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await promise;
      setState({ loading: false, error: null, data });
      return { success: true, data };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setState({ loading: false, error: errorMessage, data: null });
      return { success: false, error: errorMessage };
    }
  }, []);

  const setData = useCallback((data) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    execute,
    setData,
    setError,
    reset,
  };
};

export default useAsync;
