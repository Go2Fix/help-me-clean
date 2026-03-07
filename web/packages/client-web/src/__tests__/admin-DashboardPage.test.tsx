import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import DashboardPage from '@/pages/admin/DashboardPage';
import {
  PLATFORM_STATS,
  BOOKINGS_BY_STATUS,
  REVENUE_BY_MONTH,
  PENDING_COMPANY_APPLICATIONS,
  PENDING_COMPANY_DOCUMENTS,
  PENDING_WORKER_DOCUMENTS,
  PENDING_REVIEW_COUNT,
  SUBSCRIPTION_STATS,
} from '@/graphql/operations';

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockStats = {
  platformStats: {
    totalClients: 42,
    totalCompanies: 8,
    totalWorkers: 15,
    totalBookings: 120,
    totalRevenue: 15000,
    platformCommissionTotal: 3750,
    averageRating: 4.5,
    bookingsThisMonth: 23,
    revenueThisMonth: 3200,
    newClientsThisMonth: 7,
    newCompaniesThisMonth: 2,
    bookingsLastMonth: 18,
    revenueLastMonth: 2800,
    newClientsLastMonth: 5,
    newCompaniesLastMonth: 1,
  },
};

const mockPendingCompanyDocs = [
  { id: 'd1', documentType: 'cert', fileUrl: '/cert.pdf', fileName: 'cert.pdf', status: 'PENDING', uploadedAt: '2025-01-01', company: { id: 'c1', companyName: 'Test SRL' } },
  { id: 'd2', documentType: 'ins', fileUrl: '/ins.pdf', fileName: 'ins.pdf', status: 'PENDING', uploadedAt: '2025-01-01', company: { id: 'c1', companyName: 'Test SRL' } },
];

const mockPendingWorkerDocs = [
  { id: 'cd1', documentType: 'cazier', fileUrl: '/c.pdf', fileName: 'c.pdf', status: 'PENDING', uploadedAt: '2025-01-01', worker: { id: 'w1', fullName: 'Ion Pop', company: { id: 'c1', companyName: 'Test SRL' } } },
];

function buildMockUseQuery(overrides: Record<string, unknown> = {}) {
  return (query: unknown): ReturnType<typeof useQuery> => {
    if (query === PLATFORM_STATS) return { data: mockStats, loading: false } as ReturnType<typeof useQuery>;
    if (query === BOOKINGS_BY_STATUS) return { data: { bookingsByStatus: [] }, loading: false } as ReturnType<typeof useQuery>;
    if (query === REVENUE_BY_MONTH) return { data: { revenueByMonth: [] }, loading: false } as ReturnType<typeof useQuery>;
    if (query === PENDING_COMPANY_APPLICATIONS) return { data: { pendingCompanyApplications: overrides.apps ?? [] }, loading: false } as ReturnType<typeof useQuery>;
    if (query === PENDING_COMPANY_DOCUMENTS) return { data: { pendingCompanyDocuments: overrides.companyDocs ?? mockPendingCompanyDocs }, loading: false } as ReturnType<typeof useQuery>;
    if (query === PENDING_WORKER_DOCUMENTS) return { data: { pendingWorkerDocuments: overrides.workerDocs ?? mockPendingWorkerDocs }, loading: false } as ReturnType<typeof useQuery>;
    if (query === PENDING_REVIEW_COUNT) return { data: { pendingReviewCount: { applications: 0, companyDocuments: 2, workerDocuments: 1, categoryRequests: 0, total: 3 } }, loading: false } as ReturnType<typeof useQuery>;
    if (query === SUBSCRIPTION_STATS) return { data: { subscriptionStats: { activeCount: 0, monthlyRecurringRevenue: 0 } }, loading: false } as ReturnType<typeof useQuery>;
    return { data: null, loading: false } as ReturnType<typeof useQuery>;
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('Admin DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation(buildMockUseQuery());
  });

  it('shows "Dashboard" title', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows stat cards with values', () => {
    renderDashboard();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Clienti')).toBeInTheDocument();
    expect(screen.getAllByText('Companii').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Venit pe luni" chart section title', () => {
    renderDashboard();
    expect(screen.getByText('Venit pe luni')).toBeInTheDocument();
  });

  it('shows "Rezervări după status" section title', () => {
    renderDashboard();
    expect(screen.getByText('Rezervări după status')).toBeInTheDocument();
  });

  it('shows "Necesită atenție" section header', () => {
    renderDashboard();
    expect(screen.getByText('Necesită atenție')).toBeInTheDocument();
  });

  it('shows pending company documents row when there are docs', () => {
    renderDashboard();
    expect(screen.getByText('Documente companii')).toBeInTheDocument();
  });

  it('shows pending worker documents row when there are docs', () => {
    renderDashboard();
    expect(screen.getByText('Documente angajați')).toBeInTheDocument();
  });

  it('shows "Totul este la zi" when no pending items', () => {
    vi.mocked(useQuery).mockImplementation(
      buildMockUseQuery({ companyDocs: [], workerDocs: [], apps: [] }),
    );
    // Override PENDING_REVIEW_COUNT to return zero totals
    vi.mocked(useQuery).mockImplementation((query: unknown): ReturnType<typeof useQuery> => {
      if (query === PLATFORM_STATS) return { data: mockStats, loading: false } as ReturnType<typeof useQuery>;
      if (query === BOOKINGS_BY_STATUS) return { data: { bookingsByStatus: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === REVENUE_BY_MONTH) return { data: { revenueByMonth: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_APPLICATIONS) return { data: { pendingCompanyApplications: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_DOCUMENTS) return { data: { pendingCompanyDocuments: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_WORKER_DOCUMENTS) return { data: { pendingWorkerDocuments: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_REVIEW_COUNT) return { data: { pendingReviewCount: { applications: 0, companyDocuments: 0, workerDocuments: 0, categoryRequests: 0, total: 0 } }, loading: false } as ReturnType<typeof useQuery>;
      if (query === SUBSCRIPTION_STATS) return { data: { subscriptionStats: { activeCount: 0, monthlyRecurringRevenue: 0 } }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderDashboard();
    expect(screen.getByText('Totul este la zi')).toBeInTheDocument();
  });

  it('shows pending company applications row when there are apps', () => {
    vi.mocked(useQuery).mockImplementation(
      buildMockUseQuery({
        apps: [{ id: 'a1', companyName: 'Test SRL', cui: 'RO123', city: 'Bucuresti', county: 'Bucuresti', createdAt: '2025-01-01T00:00:00Z', documents: [] }],
      }),
    );
    renderDashboard();
    expect(screen.getByText('Aplicații companii')).toBeInTheDocument();
  });
});
