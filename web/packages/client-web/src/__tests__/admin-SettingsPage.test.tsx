import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import SettingsPage from '@/pages/admin/SettingsPage';
import {
  PLATFORM_SETTINGS,
  ALL_SERVICES,
  ALL_EXTRAS,
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

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

const mockSettings = [
  { key: 'platform_commission_pct', value: '15', description: 'Procentul comisionului platformei' },
  { key: 'support_email', value: 'support@go2fix.ro', description: 'Adresa email pentru suport' },
  { key: 'support_phone', value: '0800123456', description: 'Numarul de telefon suport' },
  { key: 'min_booking_hours', value: '2', description: 'Numarul minim de ore' },
  { key: 'max_booking_hours', value: '12', description: 'Numarul maxim de ore' },
  { key: 'default_hourly_rate', value: '50', description: 'Tariful orar implicit' },
  { key: 'privacy_policy_url', value: 'https://go2fix.ro/privacy', description: '' },
  { key: 'terms_url', value: 'https://go2fix.ro/terms', description: '' },
  { key: 'cancellation_policy_url', value: '', description: '' },
  { key: 'refund_policy_url', value: '', description: '' },
];

const mockServices = [
  { id: 's1', serviceType: 'STANDARD', nameRo: 'Curatenie standard', nameEn: 'Standard cleaning', basePricePerHour: 50, minHours: 2, hoursPerRoom: 0.5, hoursPerBathroom: 0.5, hoursPer100Sqm: 1.0, houseMultiplier: 1.3, petDurationMinutes: 20, isActive: true, includedItems: ['Aspirat', 'Spalat podele'] },
  { id: 's2', serviceType: 'DEEP', nameRo: 'Curatenie generala', nameEn: 'Deep cleaning', basePricePerHour: 70, minHours: 3, hoursPerRoom: 0.75, hoursPerBathroom: 0.75, hoursPer100Sqm: 1.5, houseMultiplier: 1.4, petDurationMinutes: 25, isActive: true, includedItems: [] },
];

const mockExtras = [
  { id: 'e1', nameRo: 'Curatare geamuri', nameEn: 'Window cleaning', price: 30, isActive: true },
  { id: 'e2', nameRo: 'Calcat rufe', nameEn: 'Ironing', price: 25, isActive: false },
];

describe('Admin SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PLATFORM_SETTINGS)
        return { data: { platformSettings: mockSettings }, loading: false } as ReturnType<typeof useQuery>;
      if (query === ALL_SERVICES)
        return { data: { allServices: mockServices }, loading: false } as ReturnType<typeof useQuery>;
      if (query === ALL_EXTRAS)
        return { data: { allExtras: mockExtras }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('shows "Setari Platforma" title', () => {
    renderSettingsPage();
    expect(screen.getByText('Setari Platforma')).toBeInTheDocument();
  });

  it('shows 3 tab buttons', () => {
    renderSettingsPage();
    expect(screen.getByText('Setari Generale')).toBeInTheDocument();
    expect(screen.getByText('Servicii')).toBeInTheDocument();
    expect(screen.getByText('Extra-uri')).toBeInTheDocument();
  });

  it('shows loading skeletons when general tab is loading', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === PLATFORM_SETTINGS)
        return { data: undefined, loading: true } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderSettingsPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows settings values from API on General tab', () => {
    renderSettingsPage();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('support@go2fix.ro')).toBeInTheDocument();
    expect(screen.getByText('Comision platforma (%)')).toBeInTheDocument();
    expect(screen.getByText('Email suport')).toBeInTheDocument();
  });

  it('shows setting group headers on General tab', () => {
    renderSettingsPage();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Politici')).toBeInTheDocument();
  });

  it('shows "Adauga serviciu" button when Services tab is active', async () => {
    const user = userEvent.setup();
    renderSettingsPage();
    await user.click(screen.getByText('Servicii'));
    expect(screen.getByText('Adauga serviciu')).toBeInTheDocument();
  });

  it('shows services table when Services tab is active', async () => {
    const user = userEvent.setup();
    renderSettingsPage();
    await user.click(screen.getByText('Servicii'));
    expect(screen.getByText('Curatenie standard')).toBeInTheDocument();
    expect(screen.getByText('Curatenie generala')).toBeInTheDocument();
    expect(screen.getByText('2 servicii definite')).toBeInTheDocument();
  });

  it('shows extras table when Extra-uri tab is active', async () => {
    const user = userEvent.setup();
    renderSettingsPage();
    await user.click(screen.getByText('Extra-uri'));
    expect(screen.getByText('Curatare geamuri')).toBeInTheDocument();
    expect(screen.getByText('Calcat rufe')).toBeInTheDocument();
    expect(screen.getByText('2 extra-uri definite')).toBeInTheDocument();
  });

  it('shows "Adauga extra" button when Extra-uri tab is active', async () => {
    const user = userEvent.setup();
    renderSettingsPage();
    await user.click(screen.getByText('Extra-uri'));
    expect(screen.getByText('Adauga extra')).toBeInTheDocument();
  });
});
