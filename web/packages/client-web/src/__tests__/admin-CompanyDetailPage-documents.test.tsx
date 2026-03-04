import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import CompanyDetailPage from '@/pages/admin/CompanyDetailPage';
import {
  COMPANY,
  COMPANY_FINANCIAL_SUMMARY,
  ALL_BOOKINGS,
  PENDING_COMPANY_APPLICATIONS,
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
    useMutation: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'comp-1' }),
    useNavigate: () => mockNavigate,
  };
});

const mockCompanyWithDocs = {
  company: {
    id: 'comp-1',
    companyName: 'CleanCo SRL',
    cui: 'RO12345',
    companyType: 'SRL',
    legalRepresentative: 'Ion Popescu',
    contactEmail: 'contact@cleanco.ro',
    contactPhone: '0712345678',
    address: 'Str. Exemplu 1',
    city: 'Bucuresti',
    county: 'Bucuresti',
    description: 'O firma de curatenie',
    logoUrl: null,
    status: 'APPROVED',
    rejectionReason: null,
    ratingAvg: 4.5,
    totalJobsCompleted: 50,
    createdAt: '2025-01-01T00:00:00Z',
    documents: [
      {
        id: 'doc-1',
        documentType: 'certificat_constatator',
        fileUrl: '/uploads/companies/comp-1/cert.pdf',
        fileName: 'cert.pdf',
        status: 'PENDING',
        uploadedAt: '2025-06-01T00:00:00Z',
        reviewedAt: null,
        rejectionReason: null,
      },
      {
        id: 'doc-2',
        documentType: 'asigurare_raspundere_civila',
        fileUrl: '/uploads/companies/comp-1/insurance.pdf',
        fileName: 'insurance.pdf',
        status: 'APPROVED',
        uploadedAt: '2025-06-01T00:00:00Z',
        reviewedAt: '2025-06-02T00:00:00Z',
        rejectionReason: null,
      },
    ],
    workers: [
      {
        id: 'cl-1',
        fullName: 'Maria Ionescu',
        email: 'maria@test.com',
        phone: '0722111222',
        status: 'PENDING_REVIEW',
        user: {
          id: 'u-1',
          email: 'maria@test.com',
          fullName: 'Maria Ionescu',
          avatarUrl: null,
        },
        personalityAssessment: {
          id: 'pa-1',
          workerId: 'cl-1',
          integrityAvg: 16.5,
          workQualityAvg: 17.0,
          hasConcerns: false,
          flaggedFacets: [],
          facetScores: [
            { facetCode: 'A1', facetName: 'Onestitate', score: 17, maxScore: 20, isFlagged: false },
            { facetCode: 'A2', facetName: 'Responsabilitate', score: 16, maxScore: 20, isFlagged: false },
          ],
          completedAt: '2025-06-01T00:00:00Z',
        },
        documents: [
          {
            id: 'cdoc-1',
            documentType: 'cazier_judiciar',
            fileUrl: '/uploads/workers/cl-1/cazier.pdf',
            fileName: 'cazier.pdf',
            status: 'APPROVED',
            uploadedAt: '2025-06-01T00:00:00Z',
            reviewedAt: '2025-06-02T00:00:00Z',
            rejectionReason: null,
          },
          {
            id: 'cdoc-2',
            documentType: 'contract_munca',
            fileUrl: '/uploads/workers/cl-1/contract.pdf',
            fileName: 'contract.pdf',
            status: 'APPROVED',
            uploadedAt: '2025-06-01T00:00:00Z',
            reviewedAt: '2025-06-02T00:00:00Z',
            rejectionReason: null,
          },
        ],
      },
    ],
  },
};

function setupMocks(companyData = mockCompanyWithDocs) {
  const mockMutationFn = vi.fn();
  vi.mocked(useMutation).mockReturnValue([mockMutationFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);

  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    if (query === COMPANY) return { data: companyData, loading: false } as ReturnType<typeof useQuery>;
    if (query === COMPANY_FINANCIAL_SUMMARY) return { data: null, loading: false } as ReturnType<typeof useQuery>;
    if (query === ALL_BOOKINGS) return { data: null, loading: false } as ReturnType<typeof useQuery>;
    if (query === PENDING_COMPANY_APPLICATIONS) return { data: null, loading: false } as ReturnType<typeof useQuery>;
    return { data: null, loading: false } as ReturnType<typeof useQuery>;
  });

  return { mockMutationFn };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CompanyDetailPage />
    </MemoryRouter>,
  );
}

describe('CompanyDetailPage - Documente tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Documente tab in tab bar', () => {
    setupMocks();
    renderPage();

    expect(screen.getByText('Detalii')).toBeInTheDocument();
    expect(screen.getByText('Financiar')).toBeInTheDocument();
    expect(screen.getByText('Comenzi')).toBeInTheDocument();
    expect(screen.getByText('Documente')).toBeInTheDocument();
  });

  it('shows company documents when Documente tab is clicked', () => {
    setupMocks();
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'documente' } });

    // Check that documents are shown (by fileName)
    expect(screen.getByText('cert.pdf')).toBeInTheDocument();
    expect(screen.getByText('insurance.pdf')).toBeInTheDocument();
  });

  it('shows company document cards', () => {
    setupMocks();
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'documente' } });

    expect(screen.getByText('cert.pdf')).toBeInTheDocument();
    expect(screen.getByText('insurance.pdf')).toBeInTheDocument();
    expect(screen.getByText('Certificat Constatator')).toBeInTheDocument();
    expect(screen.getByText('Asigurare Răspundere Civilă')).toBeInTheDocument();
  });

  it('shows "Echipa si documente" section', () => {
    setupMocks();
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'echipa' } });

    // Check that worker information is shown
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
  });

  it('shows worker name and status', () => {
    setupMocks();
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'echipa' } });

    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
    // Worker status PENDING_REVIEW maps to "În așteptare" label
    const allInAsteptare = screen.getAllByText('În așteptare');
    expect(allInAsteptare.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Activeaza" button when all worker docs are approved and worker is PENDING_REVIEW', () => {
    setupMocks();
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'echipa' } });

    expect(screen.getByText('Activează')).toBeInTheDocument();
  });

  it('does not show Activează button when worker status is ACTIVE', () => {
    const dataWithActiveWorker = {
      company: {
        ...mockCompanyWithDocs.company,
        workers: [
          {
            ...mockCompanyWithDocs.company.workers[0],
            status: 'ACTIVE',
          },
        ],
      },
    };
    setupMocks(dataWithActiveWorker);
    renderPage();

    const select = screen.getByDisplayValue('Detalii');
    fireEvent.change(select, { target: { value: 'echipa' } });

    expect(screen.queryByText('Activează')).not.toBeInTheDocument();
  });
});
