import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from '@/context/AuthContext';
import { SERVICE_CATEGORIES } from '@/graphql/operations';
import HomePage from '@/pages/HomePage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refetchUser: vi.fn(),
    refreshToken: vi.fn(),
  })),
}));

vi.mock('@/context/PlatformContext', () => ({
  usePlatform: vi.fn(() => ({
    platformMode: 'live',
    isPreRelease: false,
    loading: false,
  })),
  PlatformProvider: ({ children }: { children: unknown }) => children,
}));

const mockUseAuth = vi.mocked(useAuth);

const mockCategories = [
  {
    id: '1',
    slug: 'curatenie',
    nameRo: 'Curățenie',
    nameEn: 'Cleaning',
    icon: '🧹',
    isActive: true,
  },
];

const successMock: MockedResponse[] = [
  {
    request: { query: SERVICE_CATEGORIES },
    result: {
      data: { serviceCategories: mockCategories },
    },
  },
];

const loadingMock: MockedResponse[] = [
  {
    request: { query: SERVICE_CATEGORIES },
    result: {
      data: { serviceCategories: mockCategories },
    },
    delay: 100000, // long delay to keep in loading state
  },
];

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderHomePage(mocks: MockedResponse[] = successMock) {
  return render(
    <HelmetProvider>
      <MockedProvider mocks={mocks}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </MockedProvider>
    </HelmetProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  it('shows hero title', () => {
    renderHomePage();
    expect(screen.getByText(/Casa ta/)).toBeInTheDocument();
  });

  it('shows hero subtitle text', () => {
    renderHomePage();
    expect(
      screen.getByText(/firma verificată/),
    ).toBeInTheDocument();
  });

  it('shows "Rezervă acum" button in hero', () => {
    renderHomePage();
    const buttons = screen.getAllByRole('button', { name: /Rezervă acum/ });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Descoperă serviciile" button', () => {
    renderHomePage();
    const buttons = screen.getAllByRole('button', { name: /Descoperă serviciile/ });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Gata în 3 pași" section', () => {
    renderHomePage();
    expect(screen.getByText('Gata în 3 pași')).toBeInTheDocument();
  });

  it('shows all three steps in how-it-works section', () => {
    renderHomePage();
    expect(screen.getByText('Alegi serviciul')).toBeInTheDocument();
    expect(screen.getByText('Firma confirmă')).toBeInTheDocument();
    expect(screen.getByText('Te bucuri de rezultat')).toBeInTheDocument();
  });

  it('shows "De ce Go2Fix?" section', () => {
    renderHomePage();
    expect(screen.getByText('De ce Go2Fix?')).toBeInTheDocument();
  });

  it('shows trust items', () => {
    renderHomePage();
    expect(screen.getAllByText('Firme verificate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Plăți sigure')).toBeInTheDocument();
    expect(screen.getByText('Prețuri transparente')).toBeInTheDocument();
    expect(screen.getByText('Suport rapid')).toBeInTheDocument();
  });

  it('shows categories section heading', () => {
    renderHomePage();
    expect(screen.getByText('Ce servicii oferim?')).toBeInTheDocument();
  });

  it('shows active category from query after loading', async () => {
    renderHomePage();
    expect(
      await screen.findByText('Curățenie'),
    ).toBeInTheDocument();
  });

  it('shows coming-soon placeholder categories', async () => {
    renderHomePage();
    await screen.findByText('Curățenie');
    expect(screen.getByText('Dezinfecție')).toBeInTheDocument();
    expect(screen.getByText('Instalații sanitare')).toBeInTheDocument();
    expect(screen.getByText('Electrician')).toBeInTheDocument();
  });

  it('shows "În curând" badge on coming-soon categories', async () => {
    renderHomePage();
    await screen.findByText('Curățenie');
    const badges = screen.getAllByText('În curând');
    expect(badges.length).toBe(3);
  });

  it('shows skeleton cards while categories are loading', () => {
    renderHomePage(loadingMock);
    expect(screen.getByTestId('categories-skeleton')).toBeInTheDocument();
  });

  it('shows "Rezervă acum" button in how-it-works section', () => {
    renderHomePage();
    const buttons = screen.getAllByRole('button', { name: /Rezervă acum/ });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows stats section', () => {
    renderHomePage();
    expect(screen.getByText('Rezervări efectuate')).toBeInTheDocument();
    expect(screen.getByText('Firme partenere')).toBeInTheDocument();
  });

  it('shows testimonials section', () => {
    renderHomePage();
    expect(screen.getByText('Ce spun clienții noștri')).toBeInTheDocument();
  });
});
