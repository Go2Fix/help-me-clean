import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JobDetailPage from '@/pages/cleaner/JobDetailPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockBooking = (overrides = {}) => ({
  id: '1',
  referenceCode: 'HMC-001',
  serviceName: 'Curatenie standard',
  scheduledDate: '2025-01-15',
  scheduledStartTime: '10:00',
  estimatedDurationHours: 3,
  status: 'ASSIGNED',
  address: {
    streetAddress: 'Str. Exemplu 10',
    city: 'Bucuresti',
    county: 'Ilfov',
    floor: '2',
    apartment: '5',
  },
  client: { fullName: 'Maria Popescu', phone: '0722123456' },
  propertyType: 'Apartament',
  numRooms: 3,
  numBathrooms: 1,
  areaSqm: 80,
  hasPets: false,
  specialInstructions: 'Cheile sunt la vecin.',
  ...overrides,
});

const defaultMutation = [vi.fn(), { loading: false }];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Cleaner JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(defaultMutation);
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/worker/job/1']}>
        <Routes>
          <Route path="/worker/job/:id" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows loading spinner when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows booking details', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText(/HMC-001/)).toBeInTheDocument();
    expect(screen.getByText('Maria Popescu')).toBeInTheDocument();
    expect(screen.getByText('0722123456')).toBeInTheDocument();
  });

  it('shows address details', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Str. Exemplu 10')).toBeInTheDocument();
    expect(screen.getByText(/Bucuresti.*Ilfov/)).toBeInTheDocument();
    expect(screen.getByText(/Etaj 2/)).toBeInTheDocument();
    expect(screen.getByText(/Ap\. 5/)).toBeInTheDocument();
  });

  it('shows property details', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Camere')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('mp')).toBeInTheDocument();
  });

  it('shows special instructions', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Cheile sunt la vecin.')).toBeInTheDocument();
  });

  it('shows no action button for ASSIGNED status (auto-confirmed by payment)', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'ASSIGNED' }) },
      loading: false,
    });
    renderPage();
    expect(screen.queryByText('Confirma comanda')).not.toBeInTheDocument();
  });

  it('shows "Incepe curatenia" button for CONFIRMED status', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'CONFIRMED' }) },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Incepe curatenia')).toBeInTheDocument();
  });

  it('shows "Finalizeaza curatenia" button for IN_PROGRESS status', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'IN_PROGRESS' }) },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Finalizeaza curatenia')).toBeInTheDocument();
  });

  it('shows no action button for COMPLETED status', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'COMPLETED' }) },
      loading: false,
    });
    renderPage();
    expect(screen.queryByText('Confirma comanda')).not.toBeInTheDocument();
    expect(screen.queryByText('Incepe curatenia')).not.toBeInTheDocument();
    expect(screen.queryByText('Finalizeaza curatenia')).not.toBeInTheDocument();
  });

  it('calls start mutation when "Incepe curatenia" button clicked', async () => {
    const mockStart = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([mockStart, { loading: false }]);
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'CONFIRMED' }) },
      loading: false,
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Incepe curatenia'));
    expect(mockStart).toHaveBeenCalledWith({ variables: { id: '1' } });
  });

  it('shows back link', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Inapoi')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'ASSIGNED' }) },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Asignata')).toBeInTheDocument();
  });
});
