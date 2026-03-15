import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useAppStateRefresh(refetch: () => void): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);
}
