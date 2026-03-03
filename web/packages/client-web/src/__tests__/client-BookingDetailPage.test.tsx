import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BookingDetailPage from '@/pages/client/BookingDetailPage';
import { makeBooking } from './mocks/factories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseLazyQuery = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'booking-1' }),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', fullName: 'Maria Popescu', phone: '0722123456' },
    loading: false,
    isAuthenticated: true,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refetchUser: vi.fn(),
    refreshToken: vi.fn(),
  }),
}));

vi.mock('@/context/PlatformContext', () => ({
  usePlatform: () => ({
    platformMode: 'live',
    isPreRelease: false,
    loading: false,
    supportPhone: '+40722000000',
    buildWhatsAppUrl: () => 'https://wa.me/40722000000',
  }),
}));

vi.mock('@/components/booking/RescheduleModal', () => ({
  default: () => null,
}));

vi.mock('@/context/StripeContext', () => ({
  StripeElementsWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/payment/StripePaymentForm', () => ({
  default: () => <div data-testid="stripe-payment-form" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultMutation = [vi.fn(), { loading: false }];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/cont/comenzi/booking-1']}>
      <Routes>
        <Route path="/cont/comenzi/:id" element={<BookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Client BookingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(defaultMutation);
    // Default: lazy query (dispute) returns no data
    mockUseLazyQuery.mockReturnValue([vi.fn(), { data: undefined, loading: false, error: undefined }]);
    // Default: policy query returns minimal data
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: vi.fn() });
  });

  it('shows loading skeleton when query is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined, refetch: vi.fn() });
    renderPage();
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows not found message when booking is null', () => {
    mockUseQuery.mockReturnValue({ data: { booking: null }, loading: false, error: undefined, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Comanda nu a fost găsită.')).toBeInTheDocument();
  });

  it('shows back link to comenzi', () => {
    mockUseQuery.mockReturnValue({ data: { booking: makeBooking() }, loading: false, error: undefined, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Înapoi la comenzi')).toBeInTheDocument();
  });

  it('shows service name and reference code', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking() },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText(/G2F-2026-0001/)).toBeInTheDocument();
  });

  it('shows CONFIRMED status badge', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking({ status: 'CONFIRMED' }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    // ClientBadge renders "Confirmata" for CONFIRMED status
    expect(screen.getAllByText('Confirmata').length).toBeGreaterThanOrEqual(1);
  });

  it('shows ASSIGNED status badge text', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking({ status: 'ASSIGNED' }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    // ClientBadge renders "Alocata" for ASSIGNED status
    expect(screen.getAllByText('Alocata').length).toBeGreaterThanOrEqual(1);
  });

  it('shows street address in address section', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: makeBooking({
          address: {
            streetAddress: 'Str. Florilor 10',
            city: 'Bucuresti',
            county: 'Ilfov',
            floor: '2',
            apartment: '5',
            entryCode: null,
            notes: null,
          },
        }),
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/Str. Florilor 10/)).toBeInTheDocument();
  });

  it('shows cancel button when status is CONFIRMED', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking({ status: 'CONFIRMED' }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Anuleaza comanda')).toBeInTheDocument();
  });

  it('shows cancel button when status is ASSIGNED', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking({ status: 'ASSIGNED' }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Anuleaza comanda')).toBeInTheDocument();
  });

  it('hides cancel button when status is COMPLETED', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: makeBooking({
          status: 'COMPLETED',
          paymentStatus: 'paid',
          completedAt: '2026-04-10T14:00:00Z',
        }),
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.queryByText('Anuleaza comanda')).not.toBeInTheDocument();
  });

  it('shows review form for COMPLETED booking with paid status and no review', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: makeBooking({
          status: 'COMPLETED',
          paymentStatus: 'paid',
          completedAt: '2026-04-10T14:00:00Z',
          review: null,
        }),
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Lasa o recenzie')).toBeInTheDocument();
    expect(screen.getByText('Trimite recenzia')).toBeInTheDocument();
  });

  it('shows submitted review when booking has review', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: makeBooking({
          status: 'COMPLETED',
          paymentStatus: 'paid',
          completedAt: '2026-04-10T14:00:00Z',
          review: {
            id: 'review-1',
            rating: 5,
            ratingPunctuality: 5,
            ratingQuality: 5,
            ratingCommunication: 5,
            ratingValue: 5,
            comment: 'Serviciu excelent!',
            status: 'PUBLISHED',
            photos: [],
            createdAt: '2026-04-11T10:00:00Z',
          },
        }),
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Recenzia ta')).toBeInTheDocument();
    expect(screen.getByText('Serviciu excelent!')).toBeInTheDocument();
  });

  it('hides review section for non-COMPLETED bookings', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking({ status: 'CONFIRMED', paymentStatus: null }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.queryByText('Lasa o recenzie')).not.toBeInTheDocument();
    expect(screen.queryByText('Recenzia ta')).not.toBeInTheDocument();
  });

  it('shows timeline step "Progresul comenzii"', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: makeBooking() },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Progresul comenzii')).toBeInTheDocument();
    expect(screen.getByText('Comanda plasata')).toBeInTheDocument();
    expect(screen.getByText('Plătită & Confirmată')).toBeInTheDocument();
  });
});
