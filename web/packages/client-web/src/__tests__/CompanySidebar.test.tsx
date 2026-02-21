import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CompanyLayout from '@/components/layout/CompanyLayout';
import { useAuth } from '@/context/AuthContext';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/components/company/CompanyStatusGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CompanyLayout sidebar', () => {
  const defaultAuth = {
    user: {
      id: '1',
      email: 'admin@clean.ro',
      fullName: 'Ion Popescu',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    refetchUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(defaultAuth);
  });

  const renderLayout = () =>
    render(
      <MemoryRouter initialEntries={['/firma']}>
        <Routes>
          <Route path="/firma" element={<CompanyLayout />}>
            <Route index element={<div>Company Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it('shows "Go2Fix" text', () => {
    renderLayout();
    expect(screen.getAllByText('Go2Fix').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Company Dashboard" subtitle', () => {
    renderLayout();
    expect(screen.getAllByText('Company Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('shows nav links: Dashboard, Comenzi, Mesaje, Echipa mea, Setari', () => {
    renderLayout();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Comenzi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mesaje').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Echipa mea').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Setari').length).toBeGreaterThanOrEqual(1);
  });

  it('shows user name when authenticated', () => {
    renderLayout();
    expect(screen.getAllByText('Ion Popescu').length).toBeGreaterThanOrEqual(1);
  });

  it('shows user email when authenticated', () => {
    renderLayout();
    expect(screen.getAllByText('admin@clean.ro').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Deconectare button', () => {
    renderLayout();
    expect(screen.getAllByText('Deconectare').length).toBeGreaterThanOrEqual(1);
  });

  it('calls logout on Deconectare click', async () => {
    const user = userEvent.setup();
    renderLayout();
    const logoutButtons = screen.getAllByText('Deconectare');
    await user.click(logoutButtons[0]);
    expect(defaultAuth.logout).toHaveBeenCalledTimes(1);
  });
});
