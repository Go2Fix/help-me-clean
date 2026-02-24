import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JobDetailPage from '@/pages/worker/JobDetailPage';

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
  referenceCode: 'G2F-001',
  serviceName: 'Curatenie standard',
  serviceType: 'STANDARD_CLEANING',
  includedItems: ['Aspirat', 'Sters praf'],
  scheduledDate: '2025-01-15',
  scheduledStartTime: '10:00',
  estimatedDurationHours: 3,
  status: 'ASSIGNED',
  createdAt: '2025-01-10T08:00:00Z',
  address: {
    streetAddress: 'Str. Exemplu 10',
    city: 'Bucuresti',
    county: 'Ilfov',
    floor: '2',
    apartment: '5',
    entryCode: null,
    notes: null,
  },
  client: { id: 'c1', fullName: 'Maria Popescu', phone: '0722123456' },
  company: { id: 'co1', companyName: 'Clean Pro SRL', contactPhone: '0700000000' },
  propertyType: 'APARTMENT',
  numRooms: 3,
  numBathrooms: 1,
  areaSqm: 80,
  hasPets: false,
  specialInstructions: 'Cheile sunt la vecin.',
  extras: [],
  review: null,
  recurringGroupId: null,
  occurrenceNumber: null,
  startedAt: null,
  completedAt: null,
  ...overrides,
});

const defaultMutation = [vi.fn(), { loading: false }];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Worker JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(defaultMutation);
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/worker/comenzi/1']}>
        <Routes>
          <Route path="/worker/comenzi/:id" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    renderPage();
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows not found state when booking is missing', () => {
    mockUseQuery.mockReturnValue({ data: { booking: null }, loading: false });
    renderPage();
    expect(screen.getByText('Comanda nu a fost gasita')).toBeInTheDocument();
  });

  it('shows booking details', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText(/G2F-001/)).toBeInTheDocument();
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

  it('shows entry code when present', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: mockBooking({
          address: {
            streetAddress: 'Str. Exemplu 10',
            city: 'Bucuresti',
            county: 'Ilfov',
            floor: '2',
            apartment: '5',
            entryCode: '#4567',
            notes: null,
          },
        }),
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('#4567')).toBeInTheDocument();
    expect(screen.getByText('Cod intrare')).toBeInTheDocument();
  });

  it('shows property details in compact grid', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText(/Apartament.*3 cam.*1 bai/)).toBeInTheDocument();
    expect(screen.getByText(/80 mp/)).toBeInTheDocument();
  });

  it('shows special instructions', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Cheile sunt la vecin.')).toBeInTheDocument();
  });

  it('shows company name', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Clean Pro SRL')).toBeInTheDocument();
  });

  it('shows timeline steps', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Progresul comenzii')).toBeInTheDocument();
    // "Asignata" appears in both badge and timeline — use getAllByText
    expect(screen.getAllByText('Asignata').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Confirmata')).toBeInTheDocument();
    expect(screen.getByText('In lucru')).toBeInTheDocument();
    // "Finalizata" also in timeline
    expect(screen.getAllByText('Finalizata').length).toBeGreaterThanOrEqual(1);
  });

  it('shows no action button for ASSIGNED status', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'ASSIGNED' }) },
      loading: false,
    });
    renderPage();
    expect(screen.queryByText('Incepe curatenia')).not.toBeInTheDocument();
    expect(screen.queryByText('Finalizeaza curatenia')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Incepe curatenia')).not.toBeInTheDocument();
    expect(screen.queryByText('Finalizeaza curatenia')).not.toBeInTheDocument();
  });

  it('calls start mutation when "Incepe curatenia" clicked', async () => {
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

  it('shows read-only checklist on COMPLETED booking', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: mockBooking({
          status: 'COMPLETED',
          includedItems: ['Aspirat', 'Sters praf'],
        }),
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Ce trebuie sa faci')).toBeInTheDocument();
    expect(screen.getByText('Aspirat')).toBeInTheDocument();
    expect(screen.getByText('Sters praf')).toBeInTheDocument();
    // Should have no interactive buttons — no progress bar
    expect(screen.queryByText(/Progres:/)).not.toBeInTheDocument();
  });

  it('shows interactive checklist on IN_PROGRESS booking', async () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: mockBooking({
          status: 'IN_PROGRESS',
          includedItems: ['Aspirat', 'Sters praf'],
        }),
      },
      loading: false,
    });
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText(/Progres:/)).toBeInTheDocument();
    // Items should be clickable buttons
    await user.click(screen.getByText('Aspirat'));
    // After click, progress should update
    expect(screen.getByText(/1\/2 finalizate/)).toBeInTheDocument();
  });

  it('shows review when present', () => {
    mockUseQuery.mockReturnValue({
      data: {
        booking: mockBooking({
          status: 'COMPLETED',
          review: {
            id: 'r1',
            rating: 5,
            comment: 'Excelent!',
            createdAt: '2025-01-16T10:00:00Z',
          },
        }),
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText('Recenzie client')).toBeInTheDocument();
    expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    expect(screen.getByText(/Excelent!/)).toBeInTheDocument();
  });

  it('shows back link to comenzi', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Inapoi la comenzi')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    mockUseQuery.mockReturnValue({
      data: { booking: mockBooking({ status: 'CONFIRMED' }) },
      loading: false,
    });
    renderPage();
    // "Confirmata" appears in both badge and timeline
    expect(screen.getAllByText('Confirmata').length).toBeGreaterThanOrEqual(1);
  });

  it('shows chat button', () => {
    mockUseQuery.mockReturnValue({ data: { booking: mockBooking() }, loading: false });
    renderPage();
    expect(screen.getByText('Mesaj')).toBeInTheDocument();
  });
});
