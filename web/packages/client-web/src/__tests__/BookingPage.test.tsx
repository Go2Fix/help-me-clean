import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BookingPage from '@/pages/BookingPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
const mockUseLazyQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

const mockUseAuth = vi.fn(() => ({
  user: null as null | { id: string; fullName: string; email: string; phone?: string | null; role: string; status: string; createdAt: string },
  loading: false,
  isAuthenticated: false,
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refetchUser: vi.fn(),
  refreshToken: vi.fn(),
  requestEmailOtp: vi.fn(),
  loginWithEmailOtp: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({ lang: 'ro' }),
}));

vi.mock('@/context/PlatformContext', () => ({
  usePlatform: () => ({
    platformMode: 'live',
    isPreRelease: false,
    loading: false,
    supportPhone: '',
    buildWhatsAppUrl: () => 'https://wa.me/',
  }),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Stub third-party components that don't contribute to DOM testing
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login" />,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/context/StripeContext', () => ({
  StripeElementsWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/payment/StripePaymentForm', () => ({
  default: () => <div data-testid="stripe-payment-form" />,
}));

vi.mock('@/components/payment/AddCardModal', () => ({
  default: () => null,
}));

vi.mock('@/components/auth/EmailOtpModal', () => ({
  default: () => null,
}));

vi.mock('@/components/seo/SEOHead', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/AddressAutocomplete', () => ({
  default: ({ onChange }: { onChange: (v: unknown) => void }) => (
    <input
      data-testid="address-autocomplete"
      placeholder="Cauta adresa"
      onChange={(e) => onChange({ streetAddress: e.target.value })}
    />
  ),
}));

// ─── Service / category fixtures ─────────────────────────────────────────────

const mockService = {
  id: 'svc-1',
  serviceType: 'STANDARD_CLEANING',
  nameRo: 'Curatenie standard',
  descriptionRo: 'Curatenie generala pentru apartament.',
  basePricePerHour: 50,
  minHours: 2,
  icon: '🧹',
  includedItems: ['Aspirat', 'Sters praf'],
  categoryId: 'cat-1',
  pricingModel: 'HOURLY',
  pricePerSqm: null,
};

const mockCategory = {
  id: 'cat-1',
  slug: 'curatenie',
  nameRo: 'Curatenie',
  nameEn: 'Cleaning',
  icon: '🧹',
  isActive: true,
};

const defaultMutation = [vi.fn(), { loading: false }];

// ─── Setup helpers ────────────────────────────────────────────────────────────

function setupEmptyQueries() {
  mockUseQuery.mockReturnValue({ data: undefined, loading: false });
  mockUseLazyQuery.mockReturnValue([vi.fn(), { data: undefined, loading: false }]);
  mockUseMutation.mockReturnValue(defaultMutation);
}

function setupWithServices() {
  mockUseQuery.mockImplementation((query: unknown) => {
    const q = String(query);
    if (q.includes('AvailableServices')) {
      return { data: { availableServices: [mockService] }, loading: false };
    }
    if (q.includes('ServiceCategoryBySlug')) {
      return { data: { serviceCategoryBySlug: null }, loading: false };
    }
    if (q.includes('ServiceCategories')) {
      return { data: { serviceCategories: [mockCategory] }, loading: false };
    }
    if (q.includes('ActiveCities')) {
      return { data: { activeCities: [] }, loading: false };
    }
    if (q.includes('RecurringDiscounts')) {
      return { data: { recurringDiscounts: [] }, loading: false };
    }
    if (q.includes('MyPaymentMethods')) {
      return { data: { myPaymentMethods: [] }, loading: false };
    }
    if (q.includes('MyAddresses')) {
      return { data: { myAddresses: [] }, loading: false };
    }
    if (q.includes('MyReferralStatus')) {
      return { data: { myReferralStatus: { availableDiscounts: 0 } }, loading: false };
    }
    return { data: undefined, loading: false };
  });
  mockUseLazyQuery.mockReturnValue([vi.fn(), { data: undefined, loading: false }]);
  mockUseMutation.mockReturnValue(defaultMutation);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/rezervare']}>
      <Routes>
        <Route path="/rezervare" element={<BookingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Navigate through all steps to reach the target step key by clicking "Continuă" repeatedly. */
async function navigateToStep(targetStep: string, user: ReturnType<typeof userEvent.setup>) {
  const stepOrder = ['service', 'details', 'schedule', 'address', 'worker', 'summary', 'payment'];
  const targetIdx = stepOrder.indexOf(targetStep);
  if (targetIdx <= 0) return;

  for (let i = 0; i < targetIdx; i++) {
    // The next button is always "Continuă" (there may be two — desktop + mobile sticky)
    const buttons = screen.queryAllByRole('button', { name: /Continuă/i });
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      // Small wait for state update
      await waitFor(() => {}, { timeout: 100 }).catch(() => {});
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
      requestEmailOtp: vi.fn(),
      loginWithEmailOtp: vi.fn(),
    });
  });

  it('renders without crash in loading state', () => {
    setupEmptyQueries();
    renderPage();
    expect(screen.getByText('Rezervare')).toBeInTheDocument();
  });

  it('renders step indicator labels on mount', () => {
    setupEmptyQueries();
    renderPage();
    // "Serviciu" appears in step indicator — may appear multiple times
    expect(screen.getAllByText('Serviciu').length).toBeGreaterThanOrEqual(1);
  });

  it('renders service step heading on initial render', () => {
    setupEmptyQueries();
    renderPage();
    expect(screen.getByText('Alege serviciul')).toBeInTheDocument();
    expect(screen.getByText('Selectează serviciul potrivit nevoilor tale.')).toBeInTheDocument();
  });

  it('renders service card with name when services data is loaded', async () => {
    setupWithServices();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Curatenie standard').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows trust badges in page header', () => {
    setupEmptyQueries();
    renderPage();
    expect(screen.getByText('Curățători verificați')).toBeInTheDocument();
    expect(screen.getByText('Plată securizată')).toBeInTheDocument();
    expect(screen.getByText('Garanție satisfacție')).toBeInTheDocument();
  });

  it('shows price disclaimer at bottom of service step', async () => {
    setupWithServices();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Prețul final depinde de suprafața/)).toBeInTheDocument();
    });
  });

  it('shows "Continuă" navigation button on service step', async () => {
    setupWithServices();
    renderPage();
    await waitFor(() => {
      // There is at least one "Continuă" button (desktop nav bar)
      expect(screen.getAllByRole('button', { name: /Continuă/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Pasul următor" hint text on service step', async () => {
    setupWithServices();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Pasul următor/i)).toBeInTheDocument();
      expect(screen.getByText(/Detalii proprietate/)).toBeInTheDocument();
    });
  });

  it('shows "Continuă" button enabled after service is auto-selected', async () => {
    setupWithServices();
    renderPage();
    // Service step auto-selects the first service — "Continuă" becomes enabled
    await waitFor(() => {
      const btn = screen.getAllByRole('button', { name: /Continuă/i })[0];
      // Button should be enabled (not disabled) since service is auto-selected
      expect(btn).not.toBeDisabled();
    });
  });

  it('shows service step active label in breadcrumb', async () => {
    setupWithServices();
    renderPage();
    // The header shows "Rezervare > Serviciu"
    await waitFor(() => {
      expect(screen.getByText('Rezervare')).toBeInTheDocument();
    });
    // Active step label "Serviciu" shown in header
    expect(screen.getAllByText('Serviciu').length).toBeGreaterThanOrEqual(1);
  });

  it('shows back button that navigates back when on later steps', async () => {
    setupWithServices();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getAllByText('Curatenie standard'));

    // Navigate to step 1 (details) — service is auto-selected so canProceed is true
    const contBtn = screen.getAllByRole('button', { name: /Continuă/i })[0];
    await user.click(contBtn);

    // Now on details step — back button should be available
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Înapoi/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders without crash when service list is empty', () => {
    mockUseQuery.mockReturnValue({ data: { availableServices: [] }, loading: false });
    mockUseLazyQuery.mockReturnValue([vi.fn(), { data: undefined, loading: false }]);
    mockUseMutation.mockReturnValue(defaultMutation);
    renderPage();
    expect(screen.getByText('Alege serviciul')).toBeInTheDocument();
  });

  it('shows step names in the progress indicator', () => {
    setupEmptyQueries();
    renderPage();
    // Step indicator contains these labels
    expect(screen.getAllByText('Serviciu').length).toBeGreaterThanOrEqual(1);
    // "Detalii" label appears in step indicator
    expect(screen.getAllByText('Detalii').length).toBeGreaterThanOrEqual(1);
  });
});
