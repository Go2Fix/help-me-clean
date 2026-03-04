import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import PaymentMethodsPage from '@/pages/client/PaymentMethodsPage';
import { MY_PAYMENT_METHODS } from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: () => <div data-testid="card-element" />,
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStripe: () => null,
  useElements: () => null,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleCard = {
  id: 'pm_1',
  cardLastFour: '4242',
  cardBrand: 'visa',
  cardExpMonth: 12,
  cardExpYear: 2026,
  isDefault: true,
};

const sampleCard2 = {
  id: 'pm_2',
  cardLastFour: '5555',
  cardBrand: 'mastercard',
  cardExpMonth: 3,
  cardExpYear: 2027,
  isDefault: false,
};

function mockQueries(overrides?: { methods?: unknown[]; loading?: boolean }) {
  const isLoading = overrides?.loading ?? false;
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_PAYMENT_METHODS) {
      return {
        data: isLoading
          ? undefined
          : { myPaymentMethods: overrides?.methods ?? [] },
        loading: isLoading,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false, refetch: vi.fn() } as unknown as ReturnType<typeof useQuery>;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentMethodsPage />
    </MemoryRouter>,
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentMethodsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('shows loading spinner when loading', () => {
    mockQueries({ loading: true });
    renderPage();
    expect(screen.getByText('Se încarcă metodele de plată...')).toBeInTheDocument();
  });

  it('renders saved cards list with brand and last four digits', () => {
    mockQueries({ methods: [sampleCard, sampleCard2] });
    renderPage();
    expect(screen.getByText('Visa')).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText(/5555/)).toBeInTheDocument();
  });

  it('shows empty state when no cards are saved', () => {
    mockQueries({ methods: [] });
    renderPage();
    expect(screen.getByText('Nu ai niciun card salvat')).toBeInTheDocument();
  });

  it('renders "Adauga card" button', () => {
    mockQueries({ methods: [] });
    renderPage();
    const buttons = screen.getAllByText('Adaugă card');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows delete confirmation overlay on delete button click', async () => {
    const user = userEvent.setup();
    mockQueries({ methods: [sampleCard] });
    renderPage();
    // Click the delete button (Trash icon button with title "Sterge")
    const deleteButton = screen.getByTitle('Sterge');
    await user.click(deleteButton);
    expect(screen.getByText('Ștergi acest card?')).toBeInTheDocument();
    expect(screen.getByText('Anulează')).toBeInTheDocument();
  });
});
