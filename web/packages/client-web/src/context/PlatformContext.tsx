import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { PLATFORM_MODE } from '@/graphql/operations';

type PlatformMode = 'pre_release' | 'live';

interface PlatformContextValue {
  platformMode: PlatformMode;
  isPreRelease: boolean;
  loading: boolean;
}

const PlatformContext = createContext<PlatformContextValue>({
  platformMode: 'pre_release',
  isPreRelease: false,
  loading: true,
});

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useQuery(PLATFORM_MODE, {
    fetchPolicy: 'cache-and-network',
  });

  const platformMode = (data?.platformMode ?? 'pre_release') as PlatformMode;

  return (
    <PlatformContext.Provider
      value={{
        platformMode,
        isPreRelease: platformMode === 'pre_release',
        loading,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext);
}
