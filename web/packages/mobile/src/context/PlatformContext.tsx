import { gql, useQuery } from '@apollo/client';
import React, { createContext, useContext } from 'react';

const PLATFORM_SETTINGS_QUERY = gql`
  query PlatformSettings {
    platformSettings {
      key
      value
    }
  }
`;

interface PlatformSettingItem {
  key: string;
  value: string;
}

interface PlatformContextValue {
  platformMode: 'pre_release' | 'live';
  loading: boolean;
  isPreRelease: boolean;
  isLive: boolean;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery<{ platformSettings: PlatformSettingItem[] }>(
    PLATFORM_SETTINGS_QUERY,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const modeValue = data?.platformSettings?.find((s) => s.key === 'platform_mode')?.value;
  const platformMode: 'pre_release' | 'live' =
    modeValue === 'pre_release' ? 'pre_release' : 'live';

  return (
    <PlatformContext.Provider
      value={{
        platformMode,
        loading,
        isPreRelease: platformMode === 'pre_release',
        isLive: platformMode === 'live',
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
