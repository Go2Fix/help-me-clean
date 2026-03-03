import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { PLATFORM_MODE, PLATFORM_SETTINGS } from '@/graphql/operations';

type PlatformMode = 'pre_release' | 'live';

interface PlatformSetting {
  key: string;
  value: string;
}

interface PlatformContextValue {
  platformMode: PlatformMode;
  isPreRelease: boolean;
  loading: boolean;
  /** Support phone number configured by admin (e.g. "+40726433942"). Empty string if not set. */
  supportPhone: string;
  /** Builds a wa.me deep-link with the configured support phone and an optional pre-filled message. */
  buildWhatsAppUrl: (message?: string) => string;
}

const PlatformContext = createContext<PlatformContextValue>({
  platformMode: 'pre_release',
  isPreRelease: false,
  loading: true,
  supportPhone: '',
  buildWhatsAppUrl: () => 'https://wa.me/',
});

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { data: modeData, loading: modeLoading } = useQuery(PLATFORM_MODE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: settingsData, loading: settingsLoading } = useQuery<{
    platformSettings: PlatformSetting[];
  }>(PLATFORM_SETTINGS, { fetchPolicy: 'cache-and-network' });

  const platformMode = (modeData?.platformMode ?? 'pre_release') as PlatformMode;

  const supportPhone = useMemo(() => {
    const settings: PlatformSetting[] = settingsData?.platformSettings ?? [];
    return settings.find((s) => s.key === 'support_phone')?.value ?? '';
  }, [settingsData]);

  const buildWhatsAppUrl = useMemo(
    () =>
      (message?: string): string => {
        // Strip leading + for wa.me compatibility (both formats work, but bare digits are safer)
        const phone = supportPhone.replace(/^\+/, '');
        const base = `https://wa.me/${phone}`;
        return message ? `${base}?text=${encodeURIComponent(message)}` : base;
      },
    [supportPhone],
  );

  return (
    <PlatformContext.Provider
      value={{
        platformMode,
        isPreRelease: platformMode === 'pre_release',
        loading: modeLoading || settingsLoading,
        supportPhone,
        buildWhatsAppUrl,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext);
}
