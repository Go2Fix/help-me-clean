import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import BookingsPage from '@/pages/admin/BookingsPage';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
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

function renderBookingsPage() {
  return render(
    <MemoryRouter>
      <BookingsPage />
    </MemoryRouter>,
  );
}

const sampleBooking = {
  id: '1',
  referenceCode: 'REF-001',
  serviceType: 'STANDARD',
  serviceName: 'Curatenie standard',
  scheduledDate: '2024-06-01',
  scheduledStartTime: '10:00',
  estimatedTotal: 250,
  status: 'CONFIRMED',
  paymentStatus: 'PENDING',
  createdAt: '2024-05-28T10:00:00Z',
  client: { id: 'c1', fullName: 'Maria Ionescu', email: 'maria@test.com' },
  company: { id: 'co1', companyName: 'Clean SRL' },
};

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: { searchBookings: { edges: [], totalCount: 0 } },
      loading: false,
    } as ReturnType<typeof useQuery>);
  });

  it('shows "Comenzi" title', () => {
    renderBookingsPage();
    expect(screen.getByText('Comenzi')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading is true', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: true,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows bookings list with reference code, service name, and status badge', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchBookings: {
          edges: [sampleBooking],
          totalCount: 1,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    expect(screen.getByText('REF-001')).toBeInTheDocument();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    // "Confirmat" appears as the CONFIRMED status badge
    expect(screen.getByText('Confirmat')).toBeInTheDocument();
  });

  it('shows "Nu exista comenzi." empty state when edges is empty', () => {
    renderBookingsPage();
    expect(screen.getByText('Nu exista comenzi.')).toBeInTheDocument();
  });

  it('shows pagination controls when totalCount > 20', () => {
    const edges = Array.from({ length: 20 }, (_, i) => ({
      ...sampleBooking,
      id: `b-${i}`,
      referenceCode: `REF-${String(i).padStart(3, '0')}`,
    }));
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchBookings: {
          edges,
          totalCount: 25,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Urmator')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows search input with placeholder', () => {
    renderBookingsPage();
    expect(screen.getByPlaceholderText('Cauta dupa cod referinta, client, companie...')).toBeInTheDocument();
  });

  it('shows status filter options in select dropdown', () => {
    renderBookingsPage();
    expect(screen.getByText('Toate statusurile')).toBeInTheDocument();
    expect(screen.getByText('Confirmate')).toBeInTheDocument();
    expect(screen.getByText('In desfasurare')).toBeInTheDocument();
    expect(screen.getByText('Finalizate')).toBeInTheDocument();
    expect(screen.getByText('Anulate')).toBeInTheDocument();
  });

  it('shows pagination info when there are many bookings', () => {
    const edges = Array.from({ length: 20 }, (_, i) => ({
      ...sampleBooking,
      id: `b-${i}`,
      referenceCode: `REF-${String(i).padStart(3, '0')}`,
    }));
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchBookings: {
          edges,
          totalCount: 25,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    expect(screen.getByText('1-20 din 25 comenzi')).toBeInTheDocument();
  });

  it('navigates to /admin/comenzi/:id on booking click', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchBookings: {
          edges: [{ ...sampleBooking, id: 'b-123', referenceCode: 'REF-NAV' }],
          totalCount: 1,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    await user.click(screen.getByText('REF-NAV'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/comenzi/b-123');
  });

  it('shows ASSIGNED status badge as "Asignat"', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        searchBookings: {
          edges: [{ ...sampleBooking, status: 'ASSIGNED' }],
          totalCount: 1,
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);
    renderBookingsPage();
    expect(screen.getByText('Asignat')).toBeInTheDocument();
  });

  it('status filter can be changed via select', () => {
    renderBookingsPage();
    const select = screen.getByDisplayValue('Toate statusurile');
    fireEvent.change(select, { target: { value: 'CONFIRMED' } });
    expect(select).toHaveValue('CONFIRMED');
  });
});
