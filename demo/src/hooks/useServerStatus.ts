import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export function useServerStatus() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('http://localhost:3070/api/health', {
          signal: AbortSignal.timeout(2000),
        });
        dispatch({ type: 'SET_CONNECTED', payload: res.ok });
      } catch {
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
    }

    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [dispatch]);

  return state.connected;
}
