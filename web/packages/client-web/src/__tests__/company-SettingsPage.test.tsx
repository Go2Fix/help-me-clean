import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import SettingsPage from '@/pages/company/SettingsPage';
import { MY_COMPANY } from '@/graphql/operations';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultCompany = {
  id: '1',
  companyName: 'CleanPro SRL',
  cui: 'RO12345678',
  companyType: 'SRL',
  legalRepresentative: 'Ion Popescu',
  contactEmail: 'contact@cleanpro.ro',
  contactPhone: '+40726433942',
  address: 'Str. Principala 1',
  city: 'Bucuresti',
  county: 'Bucuresti',
  description: 'Firma de curatenie',
  logoUrl: null,
  status: 'APPROVED',
  rejectionReason: null,
  maxServiceRadiusKm: 25,
  ratingAvg: 4.5,
  totalJobsCompleted: 30,
  documents: [
    {
      id: 'doc1',
      documentType: 'cui_document',
      fileName: 'certificat_cui.pdf',
      fileUrl: 'https://example.com/cert.pdf',
      status: 'APPROVED',
      uploadedAt: '2025-01-15T10:00:00Z',
      reviewedAt: '2025-01-16T10:00:00Z',
      rejectionReason: null,
    },
  ],
  createdAt: '2025-01-01',
};

function mockQuery(overrides?: { data?: unknown; loading?: boolean }) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === MY_COMPANY) {
      return {
        data: overrides?.data !== undefined ? overrides.data : { myCompany: defaultCompany },
        loading: overrides?.loading ?? false,
      } as ReturnType<typeof useQuery>;
    }
    return { data: null, loading: false } as ReturnType<typeof useQuery>;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

  it('shows page title "Setari"', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Setari')).toBeInTheDocument();
  });

  it('shows company name when loaded', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('CleanPro SRL')).toBeInTheDocument();
  });

  it('shows company CUI when loaded', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText(/CUI: RO12345678/)).toBeInTheDocument();
  });

  it('shows company type when loaded', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Tip firma')).toBeInTheDocument();
    expect(screen.getByText('SRL')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    mockQuery({ loading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows company status badge as Aprobata for APPROVED status', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Aprobata')).toBeInTheDocument();
  });

  it('shows editable profile form with contactEmail field', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Editeaza profilul firmei')).toBeInTheDocument();
    expect(screen.getByText('Email contact')).toBeInTheDocument();
  });

  it('shows documents section', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Documente firma')).toBeInTheDocument();
    expect(screen.getByText('certificat_cui.pdf')).toBeInTheDocument();
  });

  it('shows upload zones when no documents exist', () => {
    mockQuery({ data: { myCompany: { ...defaultCompany, documents: [] } } });
    renderPage();
    expect(screen.getByText(/Incarca Certificat Constatator/)).toBeInTheDocument();
  });

  it('shows coverage zone section', () => {
    mockQuery();
    renderPage();
    expect(screen.getByText('Zone de acoperire')).toBeInTheDocument();
  });
});
