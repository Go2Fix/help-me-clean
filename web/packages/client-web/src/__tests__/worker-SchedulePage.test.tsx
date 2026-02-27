import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import SchedulePage from '@/pages/worker/SchedulePage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual<typeof import('@apollo/client')>('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
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

// ─── Helpers ────────────────────────────────────────────────────────────────────

const emptyMutationResult = [vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>;

function setupMocks(overrides?: {
  jobsLoading?: boolean;
  jobs?: unknown[];
}) {
  // useQuery called 4 times: bookings, availability, overrides (week), overrides (30d)
  let queryCallCount = 0;
  vi.mocked(useQuery).mockImplementation(() => {
    const idx = queryCallCount % 4;
    queryCallCount++;

    if (idx === 0) {
      return {
        data: overrides?.jobs !== undefined
          ? { myWorkerBookingsByDateRange: overrides.jobs }
          : undefined,
        loading: overrides?.jobsLoading ?? false,
        refetch: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: undefined, loading: false, refetch: vi.fn() } as any;
  });

  vi.mocked(useMutation).mockReturnValue(emptyMutationResult);
}

// Returns current week's Monday in YYYY-MM-DD
function getThisMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Worker SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    );

  it('shows loading skeleton when loading', () => {
    setupMocks({ jobsLoading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows page title and subtitle', () => {
    setupMocks();
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Program');
    expect(screen.getByText('Programul tau saptamanal si disponibilitatea')).toBeInTheDocument();
  });

  it('shows tab buttons and week navigation', () => {
    setupMocks({ jobs: [] });
    renderPage();
    expect(screen.getByText('Disponibilitate')).toBeInTheDocument();
    expect(screen.getByLabelText('Saptamana anterioara')).toBeInTheDocument();
    expect(screen.getByLabelText('Saptamana urmatoare')).toBeInTheDocument();
  });

  it('shows job cards with details', () => {
    setupMocks({
      jobs: [
        {
          id: '1',
          referenceCode: 'G2F-001',
          serviceName: 'Curatenie standard',
          scheduledDate: getThisMondayISO(),
          scheduledStartTime: '09:00',
          estimatedDurationHours: 2,
          status: 'ASSIGNED',
          address: { streetAddress: 'Bd. Unirii 10', city: 'Bucuresti' },
          client: { fullName: 'Elena Dumitrescu', phone: '0712345678' },
        },
      ],
    });
    renderPage();
    // Desktop + mobile may both render the job — use getAllByText
    expect(screen.getAllByText('Curatenie standard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elena Dumitrescu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Asignata').length).toBeGreaterThan(0);
  });

  it('shows status badge for in-progress jobs', () => {
    setupMocks({
      jobs: [
        {
          id: '1',
          referenceCode: 'G2F-001',
          serviceName: 'Curatenie 1',
          scheduledDate: getThisMondayISO(),
          scheduledStartTime: '09:00',
          estimatedDurationHours: 2,
          status: 'IN_PROGRESS',
          address: { streetAddress: 'Str. A', city: 'Cluj' },
          client: { fullName: 'Test', phone: '0700000000' },
        },
      ],
    });
    renderPage();
    expect(screen.getAllByText('In lucru').length).toBeGreaterThan(0);
  });
});
