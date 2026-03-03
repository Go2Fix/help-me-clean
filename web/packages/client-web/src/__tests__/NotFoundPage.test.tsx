import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '@/pages/NotFoundPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderNotFoundPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows 404 text', () => {
    renderNotFoundPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('shows "Pagina nu a fost găsită"', () => {
    renderNotFoundPage();
    expect(screen.getByText('Pagina nu a fost găsită')).toBeInTheDocument();
  });

  it('shows descriptive message', () => {
    renderNotFoundPage();
    expect(
      screen.getByText(/pagina pe care o cau/),
    ).toBeInTheDocument();
  });

  it('shows back button with "Înapoi la pagina principală"', () => {
    renderNotFoundPage();
    expect(
      screen.getByRole('button', { name: /napoi la pagina principal/ }),
    ).toBeInTheDocument();
  });

  it('navigates to home page when back button is clicked', async () => {
    const user = userEvent.setup();
    renderNotFoundPage();
    const button = screen.getByRole('button', {
      name: /napoi la pagina principal/,
    });
    await user.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders the 404 heading as h1', () => {
    renderNotFoundPage();
    const heading = screen.getByText('404');
    expect(heading.tagName).toBe('H1');
  });

  it('renders "Pagina nu a fost găsită" as h2', () => {
    renderNotFoundPage();
    const subheading = screen.getByText('Pagina nu a fost găsită');
    expect(subheading.tagName).toBe('H2');
  });
});
