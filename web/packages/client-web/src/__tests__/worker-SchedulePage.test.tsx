import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from '@/pages/worker/SchedulePage';

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
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows page title and subtitle', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    expect(screen.getByText('Program')).toBeInTheDocument();
    expect(screen.getByText('Toate comenzile tale viitoare')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', () => {
    mockUseQuery.mockReturnValue({ data: { myAssignedJobs: [] }, loading: false });
    renderPage();
    expect(screen.getByText('Nu ai comenzi programate.')).toBeInTheDocument();
  });

  it('shows job cards with details', () => {
    mockUseQuery.mockReturnValue({
      data: {
        myAssignedJobs: [
          {
            id: '1',
            referenceCode: 'G2F-001',
            serviceName: 'Curatenie standard',
            scheduledDate: '2025-01-20',
            scheduledStartTime: '09:00',
            estimatedDurationHours: 2,
            status: 'ASSIGNED',
            address: { streetAddress: 'Bd. Unirii 10', city: 'Bucuresti' },
            client: { fullName: 'Elena Dumitrescu' },
          },
        ],
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText('Elena Dumitrescu')).toBeInTheDocument();
    expect(screen.getByText('Asignata')).toBeInTheDocument();
  });

  it('shows status badge for different statuses', () => {
    mockUseQuery.mockReturnValue({
      data: {
        myAssignedJobs: [
          {
            id: '1',
            referenceCode: 'G2F-001',
            serviceName: 'Curatenie 1',
            scheduledDate: '2025-01-20',
            scheduledStartTime: '09:00',
            estimatedDurationHours: 2,
            status: 'IN_PROGRESS',
            address: { streetAddress: 'Str. A', city: 'Cluj' },
            client: { fullName: 'Test' },
          },
        ],
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('In lucru')).toBeInTheDocument();
  });
});
