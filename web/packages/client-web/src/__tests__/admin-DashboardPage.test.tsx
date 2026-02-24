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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
  },
};

const mockPendingCompanyDocs = [
  { id: 'd1', documentType: 'cert', fileUrl: '/cert.pdf', fileName: 'cert.pdf', status: 'PENDING', uploadedAt: '2025-01-01' },
  { id: 'd2', documentType: 'ins', fileUrl: '/ins.pdf', fileName: 'ins.pdf', status: 'PENDING', uploadedAt: '2025-01-01' },
];

const mockPendingWorkerDocs = [
  { id: 'cd1', documentType: 'cazier', fileUrl: '/c.pdf', fileName: 'c.pdf', status: 'PENDING', uploadedAt: '2025-01-01' },
];

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
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PLATFORM_STATS) return { data: mockStats, loading: false } as ReturnType<typeof useQuery>;
      if (query === BOOKINGS_BY_STATUS)
        return { data: { bookingsByStatus: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === REVENUE_BY_MONTH)
        return { data: { revenueByMonth: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_APPLICATIONS)
        return { data: { pendingCompanyApplications: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_DOCUMENTS)
        return { data: { pendingCompanyDocuments: mockPendingCompanyDocs }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_WORKER_DOCUMENTS)
        return { data: { pendingWorkerDocuments: mockPendingWorkerDocs }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
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
    // "Companii" appears both as a stat label and a nav link
    expect(screen.getAllByText('Companii').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Venit pe luni" chart section title', () => {
    renderDashboard();
    expect(screen.getByText('Venit pe luni')).toBeInTheDocument();
  });

  it('shows "Rezervari dupa status" section title', () => {
    renderDashboard();
    expect(screen.getByText('Rezervari dupa status')).toBeInTheDocument();
  });

  it('shows "Aplicatii in asteptare" section when there are pending apps', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PLATFORM_STATS) return { data: mockStats, loading: false } as ReturnType<typeof useQuery>;
      if (query === BOOKINGS_BY_STATUS)
        return { data: { bookingsByStatus: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === REVENUE_BY_MONTH)
        return { data: { revenueByMonth: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_APPLICATIONS)
        return {
          data: {
            pendingCompanyApplications: [
              { id: 'a1', companyName: 'Test SRL', cui: 'RO123', city: 'Bucuresti', county: 'Bucuresti', createdAt: '2025-01-01T00:00:00Z' },
            ],
          },
          loading: false,
        } as ReturnType<typeof useQuery>;
      if (query === PENDING_COMPANY_DOCUMENTS)
        return { data: { pendingCompanyDocuments: mockPendingCompanyDocs }, loading: false } as ReturnType<typeof useQuery>;
      if (query === PENDING_WORKER_DOCUMENTS)
        return { data: { pendingWorkerDocuments: mockPendingWorkerDocs }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderDashboard();
    expect(screen.getByText('Aplicatii in asteptare')).toBeInTheDocument();
  });

  it('shows pending company documents count', () => {
    renderDashboard();
    expect(screen.getByText('2 documente companie')).toBeInTheDocument();
  });

  it('shows pending worker documents count', () => {
    renderDashboard();
    expect(screen.getByText('1 documente lucratori')).toBeInTheDocument();
  });
});
