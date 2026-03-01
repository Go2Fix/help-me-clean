import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import CompaniesPage from '@/pages/admin/CompaniesPage';
import { PENDING_COMPANY_APPLICATIONS, COMPANIES } from '@/graphql/operations';

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

function renderCompaniesPage() {
  return render(
    <MemoryRouter>
      <CompaniesPage />
    </MemoryRouter>,
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PENDING_COMPANY_APPLICATIONS)
        return { data: { pendingCompanyApplications: [] }, loading: false } as ReturnType<typeof useQuery>;
      if (query === COMPANIES)
        return { data: { companies: { edges: [], totalCount: 0 } }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('shows "Companii" title', () => {
    renderCompaniesPage();
    expect(screen.getByText('Companii')).toBeInTheDocument();
  });

  it('shows filter tabs', () => {
    renderCompaniesPage();
    expect(screen.getByText('In asteptare')).toBeInTheDocument();
    expect(screen.getByText('Aprobate')).toBeInTheDocument();
    expect(screen.getByText('Toate')).toBeInTheDocument();
  });

  it('shows empty state for pending tab', () => {
    renderCompaniesPage();
    expect(screen.getByText('Nu exista aplicatii in asteptare.')).toBeInTheDocument();
  });

  it('shows empty state when no companies on all tab', () => {
    renderCompaniesPage();
    const select = screen.getByDisplayValue('In asteptare');
    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByText('Nu exista companii.')).toBeInTheDocument();
  });

  it('tab switching works', () => {
    renderCompaniesPage();
    const select = screen.getByDisplayValue('In asteptare');
    fireEvent.change(select, { target: { value: 'approved' } });
    expect(screen.getByText('Nu exista companii aprobate.')).toBeInTheDocument();
  });

  it('shows "Respinge aplicatia" modal title when reject button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PENDING_COMPANY_APPLICATIONS)
        return {
          data: {
            pendingCompanyApplications: [
              {
                id: '1',
                companyName: 'Test SRL',
                cui: 'RO12345',
                companyType: 'SRL',
                legalRepresentative: 'Ion Popescu',
                contactEmail: 'test@test.com',
                contactPhone: '0721000000',
                address: 'Str. Test 1',
                city: 'Bucuresti',
                county: 'Bucuresti',
                description: 'Test company',
                status: 'PENDING_REVIEW',
                createdAt: '2024-01-01T00:00:00Z',
                documents: [],
              },
            ],
          },
          loading: false,
        } as ReturnType<typeof useQuery>;
      if (query === COMPANIES)
        return { data: { companies: { edges: [], totalCount: 0 } }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });

    renderCompaniesPage();
    const rejectButtons = screen.getAllByText('Respinge');
    await user.click(rejectButtons[0]);
    expect(screen.getByText('Respinge aplicatia')).toBeInTheDocument();
  });
});
