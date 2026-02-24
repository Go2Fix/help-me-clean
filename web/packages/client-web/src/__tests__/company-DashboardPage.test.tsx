import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import DashboardPage from '@/pages/company/DashboardPage';
import {
  MY_COMPANY,
  MY_COMPANY_FINANCIAL_SUMMARY,
  COMPANY_REVENUE_BY_DATE_RANGE,
  COMPANY_BOOKINGS,
} from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultCompany = {
  id: '1',
  companyName: 'CleanPro SRL',
  totalJobsCompleted: 42,
  ratingAvg: 4.8,
  maxServiceRadiusKm: 25,
};

const defaultFinancial = {
  completedBookings: 42,
  totalRevenue: '12500.00',
  totalCommission: '2500.00',
  netPayout: '10000.00',
};

const defaultRevenuePoints = [
  { date: '2025-03-01', bookingCount: 3, revenue: 450.0, commission: 90.0 },
];

const defaultBookings = {
  edges: [
    {
      id: 'b1',
      referenceCode: 'ABC123',
      serviceType: 'STANDARD',
      serviceName: 'Curatenie generala',
      scheduledDate: '2025-03-15',
      scheduledStartTime: '10:00',
      estimatedTotal: '150',
      status: 'CONFIRMED',
      createdAt: '2025-03-15',
      client: { id: 'c1', fullName: 'Maria Ionescu', phone: '0700000000' },
      worker: null,
      address: { streetAddress: 'Str. Test 1', city: 'Bucuresti', county: 'Bucuresti' },
    },
  ],
  pageInfo: { hasNextPage: false, endCursor: null },
  totalCount: 1,
};

function mockAllQueries(overrides?: {
  companyData?: unknown;
  companyLoading?: boolean;
  financialData?: unknown;
  financialLoading?: boolean;
  revenueData?: unknown;
  revenueLoading?: boolean;
  bookingsData?: unknown;
  bookingsLoading?: boolean;
}) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_COMPANY) {
      return {
        data: overrides?.companyData !== undefined ? overrides.companyData : { myCompany: defaultCompany },
        loading: overrides?.companyLoading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    if (query === MY_COMPANY_FINANCIAL_SUMMARY) {
      return {
        data: overrides?.financialData !== undefined ? overrides.financialData : { myCompanyFinancialSummary: defaultFinancial },
        loading: overrides?.financialLoading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    if (query === COMPANY_REVENUE_BY_DATE_RANGE) {
      return {
        data: overrides?.revenueData !== undefined ? overrides.revenueData : { companyRevenueByDateRange: defaultRevenuePoints },
        loading: overrides?.revenueLoading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    if (query === COMPANY_BOOKINGS) {
      return {
        data: overrides?.bookingsData !== undefined ? overrides.bookingsData : { companyBookings: defaultBookings },
        loading: overrides?.bookingsLoading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false } as ReturnType<typeof useQuery>;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Company DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

  it('shows welcome message with company name', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText(/bun venit.*cleanpro srl/i)).toBeInTheDocument();
  });

  it('shows all 6 KPI cards', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText('Comenzi finalizate')).toBeInTheDocument();
    expect(screen.getByText('Venit total')).toBeInTheDocument();
    expect(screen.getByText('Venit net')).toBeInTheDocument();
    expect(screen.getByText('Comision platforma')).toBeInTheDocument();
    expect(screen.getByText('Rating mediu')).toBeInTheDocument();
    expect(screen.getByText('Raza serviciu')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    mockAllQueries({ companyLoading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows default values when no company data', () => {
    mockAllQueries({ companyData: { myCompany: null }, financialData: { myCompanyFinancialSummary: null } });
    renderPage();
    expect(screen.getByText('Bun venit!')).toBeInTheDocument();
  });

  it('shows company stats values', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText(/25 km/)).toBeInTheDocument();
  });

  it('shows financial summary values', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText('12500.00 RON')).toBeInTheDocument();
    expect(screen.getByText('10000.00 RON')).toBeInTheDocument();
    expect(screen.getByText('2500.00 RON')).toBeInTheDocument();
  });

  it('shows revenue chart section', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText('Venituri ultimele 30 zile')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows recent bookings section', () => {
    mockAllQueries();
    renderPage();
    expect(screen.getByText('Comenzi recente')).toBeInTheDocument();
    expect(screen.getByText('#ABC123')).toBeInTheDocument();
  });

  it('shows empty revenue chart message when no data', () => {
    mockAllQueries({ revenueData: { companyRevenueByDateRange: [] } });
    renderPage();
    expect(screen.getByText('Nu exista date de venit pentru aceasta perioada.')).toBeInTheDocument();
  });

  it('shows empty bookings message when no recent orders', () => {
    mockAllQueries({ bookingsData: { companyBookings: { edges: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 } } });
    renderPage();
    expect(screen.getByText('Nicio comanda')).toBeInTheDocument();
  });
});
