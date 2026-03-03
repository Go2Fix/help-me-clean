import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import PromoCodesPage from '@/pages/admin/PromoCodesPage';
import { makePromoCode } from './mocks/factories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

const mockMutate = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(() => [mockMutate, { loading: false }]),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <PromoCodesPage />
    </MemoryRouter>,
  );
}

function mockLoading() {
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    loading: true,
    refetch: vi.fn(),
  } as ReturnType<typeof useQuery>);
}

function mockEmpty() {
  vi.mocked(useQuery).mockReturnValue({
    data: { listPromoCodes: { edges: [], totalCount: 0 } },
    loading: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useQuery>);
}

function mockWithData(codes = [makePromoCode()]) {
  vi.mocked(useQuery).mockReturnValue({
    data: { listPromoCodes: { edges: codes, totalCount: codes.length } },
    loading: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useQuery>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin PromoCodesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([mockMutate, { loading: false }] as ReturnType<typeof useMutation>);
  });

  it('shows loading text when data is loading', () => {
    mockLoading();
    renderPage();
    expect(screen.getByText('Se încarcă...')).toBeInTheDocument();
  });

  it('shows page title', () => {
    mockEmpty();
    renderPage();
    expect(screen.getByText('Coduri promoționale')).toBeInTheDocument();
  });

  it('shows empty state when no promo codes exist', () => {
    mockEmpty();
    renderPage();
    expect(screen.getByText('Niciun cod promoțional creat încă')).toBeInTheDocument();
  });

  it('shows "Cod nou" button', () => {
    mockEmpty();
    renderPage();
    expect(screen.getByText('Cod nou')).toBeInTheDocument();
  });

  it('renders promo code in table', () => {
    mockWithData([makePromoCode({ code: 'SPRING25' })]);
    renderPage();
    expect(screen.getByText('SPRING25')).toBeInTheDocument();
  });

  it('renders discount value in table', () => {
    mockWithData([makePromoCode({ discountType: 'percent', discountValue: 25 })]);
    renderPage();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders active badge for active promo code', () => {
    mockWithData([makePromoCode({ isActive: true })]);
    renderPage();
    expect(screen.getByText('Activ')).toBeInTheDocument();
  });

  it('renders inactive badge for inactive promo code', () => {
    mockWithData([makePromoCode({ isActive: false })]);
    renderPage();
    expect(screen.getByText('Inactiv')).toBeInTheDocument();
  });

  it('opens create modal when "Cod nou" button is clicked', async () => {
    mockEmpty();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Cod nou'));
    expect(screen.getByText('Cod promoțional nou')).toBeInTheDocument();
  });

  it('shows required form fields in create modal', async () => {
    mockEmpty();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Cod nou'));
    // Code field label
    expect(screen.getByText('Cod *')).toBeInTheDocument();
    // Discount type select
    expect(screen.getByText('Tip reducere')).toBeInTheDocument();
    // Value field label
    expect(screen.getByText('Valoare *')).toBeInTheDocument();
    // Create button
    expect(screen.getByText('Creează cod')).toBeInTheDocument();
  });

  it('calls update mutation when toggle button is clicked', async () => {
    mockWithData([makePromoCode({ id: 'promo-1', isActive: true })]);
    const user = userEvent.setup();
    renderPage();
    // Toggle button has title "Dezactivează" for active codes
    const toggleBtn = screen.getByTitle('Dezactivează');
    await user.click(toggleBtn);
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            id: 'promo-1',
            input: expect.objectContaining({ isActive: false }),
          }),
        }),
      );
    });
  });
});
