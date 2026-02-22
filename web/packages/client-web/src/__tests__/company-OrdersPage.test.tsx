import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import OrdersPage from '@/pages/company/OrdersPage';
import { SEARCH_COMPANY_BOOKINGS } from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockQuery(overrides?: { data?: unknown; loading?: boolean }) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === SEARCH_COMPANY_BOOKINGS) {
      return {
        data: overrides?.data !== undefined
          ? overrides.data
          : { searchCompanyBookings: { edges: [], totalCount: 0 } },
        loading: overrides?.loading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false } as ReturnType<typeof useQuery>;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );

  it('shows page title "Comenzi"', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Comenzi', { selector: 'h1' })).toBeInTheDocument();
  });

  it('shows filter tabs', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Toate')).toBeInTheDocument();
    expect(screen.getByText('Confirmate')).toBeInTheDocument();
    expect(screen.getByText('In desfasurare')).toBeInTheDocument();
    expect(screen.getByText('Finalizate')).toBeInTheDocument();
    expect(screen.getByText('Anulate')).toBeInTheDocument();
  });

  it('shows search input', () => {
    mockQuery();
    renderPage();
    expect(screen.getByPlaceholderText('Cauta dupa cod referinta...')).toBeInTheDocument();
  });

  it('shows empty state message when no bookings', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Nicio comanda')).toBeInTheDocument();
    expect(screen.getByText(/nu exista comenzi pentru filtrul selectat/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockQuery({ loading: true });
    renderPage();
    expect(screen.getByText('Se incarca comenzile...')).toBeInTheDocument();
  });

  it('shows booking rows with reference code, status, and price', () => {
    mockQuery({
      data: {
        searchCompanyBookings: {
          edges: [
            {
              id: 'b1',
              referenceCode: 'ABC123',
              scheduledDate: '2025-03-15',
              estimatedTotal: '150',
              status: 'CONFIRMED',
              recurringGroupId: null,
            },
          ],
          totalCount: 1,
        },
      },
    });
    renderPage();
    expect(screen.getByText('#ABC123')).toBeInTheDocument();
    expect(screen.getByText('150 lei')).toBeInTheDocument();
    // "Confirmata" appears as the CONFIRMED status badge
    expect(screen.getByText('Confirmata')).toBeInTheDocument();
  });

  it('shows total count badge', () => {
    mockQuery({
      data: {
        searchCompanyBookings: {
          edges: [
            {
              id: 'b1',
              referenceCode: 'ABC123',
              scheduledDate: '2025-03-15',
              estimatedTotal: '150',
              status: 'CONFIRMED',
              recurringGroupId: null,
            },
          ],
          totalCount: 1,
        },
      },
    });
    renderPage();
    // Count shown in Badge inside card header
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
