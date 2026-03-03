import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

vi.mock('@/components/notifications/NotificationBell', () => ({
  default: () => null,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const defaultAuth = {
  user: null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
  refetchUser: vi.fn(),
};

function renderLayout(initialRoute = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Admin Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ ...defaultAuth });
  });

  it('shows "Go2Fix" text', () => {
    renderLayout();
    expect(screen.getAllByText('Go2Fix').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Admin Panel" subtitle', () => {
    renderLayout();
    expect(screen.getAllByText('Admin Panel').length).toBeGreaterThanOrEqual(1);
  });

  it('shows all nav links', () => {
    renderLayout();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Companii').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Comenzi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Utilizatori').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Setari').length).toBeGreaterThanOrEqual(1);
  });

  it('shows user name and email when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'admin@go2fix.ro',
        fullName: 'Admin User',
        role: 'GLOBAL_ADMIN',
        status: 'ACTIVE',
      },
    });
    renderLayout();
    expect(screen.getAllByText('Admin User').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('admin@go2fix.ro').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Deconectare button', () => {
    renderLayout();
    expect(screen.getAllByText('Deconectare').length).toBeGreaterThanOrEqual(1);
  });

  it('calls logout and navigates on Deconectare click', async () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ ...defaultAuth, logout: mockLogout });
    const user = userEvent.setup();
    renderLayout();
    const logoutButtons = screen.getAllByText('Deconectare');
    await user.click(logoutButtons[0]);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/autentificare');
  });

  it('shows collapse toggle button', () => {
    renderLayout();
    expect(screen.getAllByText('Restrange').length).toBeGreaterThanOrEqual(1);
  });
});
