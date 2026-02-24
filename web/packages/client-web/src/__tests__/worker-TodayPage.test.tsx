import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodayPage from '@/pages/worker/TodayPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Worker TodayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

  it('shows loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows page title', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    expect(screen.getByText('Comenzile de azi')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', () => {
    mockUseQuery.mockReturnValue({ data: { todaysJobs: [] }, loading: false });
    renderPage();
    expect(screen.getByText('Nicio comanda programata pentru azi.')).toBeInTheDocument();
  });

  it('shows job count in subtitle', () => {
    mockUseQuery.mockReturnValue({
      data: {
        todaysJobs: [
          {
            id: '1',
            referenceCode: 'G2F-001',
            serviceName: 'Curatenie standard',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '10:00',
            estimatedDurationHours: 3,
            status: 'ASSIGNED',
            address: { streetAddress: 'Str. Test 1', city: 'Bucuresti' },
            client: { fullName: 'Maria Popescu' },
          },
        ],
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText(/1 comanda programata/)).toBeInTheDocument();
  });

  it('shows job cards with service name and client', () => {
    mockUseQuery.mockReturnValue({
      data: {
        todaysJobs: [
          {
            id: '1',
            referenceCode: 'G2F-001',
            serviceName: 'Curatenie standard',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '10:00',
            estimatedDurationHours: 3,
            status: 'ASSIGNED',
            address: { streetAddress: 'Str. Test 1', city: 'Bucuresti' },
            client: { fullName: 'Maria Popescu' },
          },
        ],
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText('Maria Popescu')).toBeInTheDocument();
    expect(screen.getByText('Asignata')).toBeInTheDocument();
  });

  it('shows multiple jobs', () => {
    mockUseQuery.mockReturnValue({
      data: {
        todaysJobs: [
          {
            id: '1',
            referenceCode: 'G2F-001',
            serviceName: 'Curatenie standard',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '10:00',
            estimatedDurationHours: 3,
            status: 'ASSIGNED',
            address: { streetAddress: 'Str. Test 1', city: 'Bucuresti' },
            client: { fullName: 'Maria Popescu' },
          },
          {
            id: '2',
            referenceCode: 'G2F-002',
            serviceName: 'Curatenie profunda',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '14:00',
            estimatedDurationHours: 4,
            status: 'CONFIRMED',
            address: { streetAddress: 'Str. Alta 5', city: 'Cluj' },
            client: { fullName: 'Ion Ionescu' },
          },
        ],
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText('Curatenie profunda')).toBeInTheDocument();
    expect(screen.getByText(/2 comenzi programate/)).toBeInTheDocument();
  });
});
