import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import BookingDetailPage from '@/pages/admin/BookingDetailPage';
import { ADMIN_BOOKING_DETAIL, ALL_WORKERS } from '@/graphql/operations';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

const mockMutate = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(() => [mockMutate, { loading: false }]),
    useLazyQuery: vi.fn(() => [vi.fn(), { data: null, loading: false }]),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const baseBooking = {
  id: 'b1',
  referenceCode: 'REF-101',
  serviceType: 'STANDARD',
  serviceName: 'Curatenie standard',
  scheduledDate: '2024-06-15',
  scheduledStartTime: '09:00',
  estimatedDurationHours: 3,
  propertyType: 'Apartament',
  numRooms: 2,
  numBathrooms: 1,
  areaSqm: 60,
  hasPets: false,
  specialInstructions: null,
  hourlyRate: 50,
  estimatedTotal: 150,
  finalTotal: null,
  platformCommissionPct: 15,
  status: 'CONFIRMED',
  paymentStatus: 'PENDING',
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2024-06-10T08:00:00Z',
  client: { id: 'c1', fullName: 'Maria Ionescu', email: 'maria@test.com', phone: '0722000000' },
  company: { id: 'co1', companyName: 'Clean SRL', contactEmail: 'contact@clean.ro' },
  worker: null,
  address: {
    streetAddress: 'Str. Florilor 10',
    city: 'Bucuresti',
    county: 'Ilfov',
    postalCode: '012345',
    floor: '3',
    apartment: '15',
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/comenzi/b1']}>
      <Routes>
        <Route path="/admin/comenzi/:id" element={<BookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockBooking(overrides: Record<string, unknown> = {}) {
  vi.mocked(useQuery).mockImplementation(((query: unknown) => {
    if (query === ADMIN_BOOKING_DETAIL) {
      return {
        data: { booking: { ...baseBooking, ...overrides } },
        loading: false,
      };
    }
    if (query === ALL_WORKERS) {
      return {
        data: {
          allWorkers: [
            {
              id: 'cl1',
              fullName: 'Ion Popescu',
              email: 'ion@test.com',
              phone: '0733111222',
              status: 'ACTIVE',
              ratingAvg: 4.5,
              totalJobsCompleted: 12,
              company: { id: 'co1', companyName: 'Clean SRL' },
            },
          ],
        },
        loading: false,
      };
    }
    return { data: undefined, loading: false };
  }) as typeof useQuery);
}

describe('BookingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([mockMutate, { loading: false }] as ReturnType<typeof useMutation>);
  });

  it('shows booking reference code', () => {
    mockBooking();
    renderPage();
    expect(screen.getByText('REF-101')).toBeInTheDocument();
  });

  it('shows CONFIRMED status badge', () => {
    mockBooking();
    renderPage();
    expect(screen.getByText('Confirmat')).toBeInTheDocument();
  });

  it('shows ASSIGNED status badge', () => {
    mockBooking({ status: 'ASSIGNED' });
    renderPage();
    expect(screen.getByText('Asignat')).toBeInTheDocument();
  });

  it('shows "Asigneaza lucrator" button for ASSIGNED booking without worker', () => {
    mockBooking({ status: 'ASSIGNED', worker: null });
    renderPage();
    expect(screen.getByText('Asigneaza lucrator')).toBeInTheDocument();
  });

  it('does not show "Asigneaza lucrator" button when worker is assigned', () => {
    mockBooking({
      status: 'ASSIGNED',
      worker: { id: 'cl1', fullName: 'Ion Popescu', phone: '0733111222' },
    });
    renderPage();
    expect(screen.queryByText('Asigneaza lucrator')).not.toBeInTheDocument();
    expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
  });

  it('does not show "Asigneaza lucrator" button for COMPLETED bookings', () => {
    mockBooking({ status: 'COMPLETED', worker: null });
    renderPage();
    expect(screen.queryByText('Asigneaza lucrator')).not.toBeInTheDocument();
  });

  it('shows "Înapoi la comenzi" on not-found page navigating to /admin/comenzi', () => {
    vi.mocked(useQuery).mockImplementation((() => ({
      data: { booking: null },
      loading: false,
    })) as typeof useQuery);
    renderPage();
    expect(screen.getByText('Înapoi la comenzi')).toBeInTheDocument();
  });

  it('shows client info', () => {
    mockBooking();
    renderPage();
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  });

  it('shows company info', () => {
    mockBooking();
    renderPage();
    expect(screen.getByText('Clean SRL')).toBeInTheDocument();
  });

  it('shows "Plătită & Confirmată" step in timeline', () => {
    mockBooking();
    renderPage();
    expect(screen.getByText('Plătită & Confirmată')).toBeInTheDocument();
  });

  it('shows not found fallback', () => {
    vi.mocked(useQuery).mockImplementation((() => ({
      data: { booking: null },
      loading: false,
    })) as typeof useQuery);
    renderPage();
    expect(screen.getByText('Comanda nu a fost găsită.')).toBeInTheDocument();
  });

  it('handles CANCELLED_BY_CLIENT status label', () => {
    mockBooking({ status: 'CANCELLED_BY_CLIENT', cancelledAt: '2024-06-12T10:00:00Z' });
    renderPage();
    expect(screen.getAllByText('Anulat de client').length).toBeGreaterThanOrEqual(1);
  });

  it('handles CANCELLED_BY_ADMIN status label', () => {
    mockBooking({ status: 'CANCELLED_BY_ADMIN', cancelledAt: '2024-06-12T10:00:00Z' });
    renderPage();
    expect(screen.getAllByText('Anulat de admin').length).toBeGreaterThanOrEqual(1);
  });
});
