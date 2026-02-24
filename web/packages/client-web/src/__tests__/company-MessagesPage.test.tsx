import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import CompanyMessagesPage from '@/pages/company/MessagesPage';
import { COMPANY_CHAT_ROOMS } from '@/graphql/operations';

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
    useSubscription: vi.fn(),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'admin-1', fullName: 'Ion Admin', email: 'admin@firma.ro', role: 'COMPANY_ADMIN', status: 'ACTIVE' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    refetchUser: vi.fn(),
  })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

const mockRooms = [
  {
    id: 'room-1',
    roomType: 'booking',
    createdAt: '2025-01-01T10:00:00Z',
    participants: [
      { user: { id: 'user-1', fullName: 'Client Unu', avatarUrl: null }, joinedAt: '2025-01-01T10:00:00Z' },
      { user: { id: 'user-2', fullName: 'Worker Doi', avatarUrl: null }, joinedAt: '2025-01-01T10:00:00Z' },
    ],
    lastMessage: {
      id: 'msg-1',
      content: 'Bine ati venit!',
      messageType: 'system',
      isRead: true,
      createdAt: '2025-01-01T10:00:00Z',
      sender: { id: 'user-2', fullName: 'Worker Doi' },
    },
  },
  {
    id: 'room-2',
    roomType: 'admin_support',
    createdAt: '2025-01-02T10:00:00Z',
    participants: [
      { user: { id: 'user-3', fullName: 'Alt Client', avatarUrl: null }, joinedAt: '2025-01-02T10:00:00Z' },
      { user: { id: 'admin-1', fullName: 'Ion Admin', avatarUrl: null }, joinedAt: '2025-01-02T10:00:00Z' },
    ],
    lastMessage: {
      id: 'msg-2',
      content: 'Am o intrebare',
      messageType: 'text',
      isRead: false,
      createdAt: '2025-01-02T11:00:00Z',
      sender: { id: 'user-3', fullName: 'Alt Client' },
    },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <CompanyMessagesPage />
    </MemoryRouter>,
  );
}

describe('Company MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useSubscription).mockReturnValue({ data: null, loading: false } as ReturnType<typeof useSubscription>);
  });

  it('shows page title and subtitle', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Mesaje')).toBeInTheDocument();
    expect(screen.getByText('Conversatiile echipei tale')).toBeInTheDocument();
  });

  it('shows loading spinner while rooms load', () => {
    vi.mocked(useQuery).mockImplementation(() => {
      return { data: null, loading: true } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no rooms', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Nicio conversatie')).toBeInTheDocument();
  });

  it('shows room list with participant names', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Client Unu, Worker Doi')).toBeInTheDocument();
    expect(screen.getByText('Alt Client')).toBeInTheDocument();
  });

  it('shows last message content for text messages', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Am o intrebare')).toBeInTheDocument();
  });

  it('shows placeholder when no room selected', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Selecteaza o conversatie')).toBeInTheDocument();
  });

  it('shows "Mesaj nou" button', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === COMPANY_CHAT_ROOMS) return { data: { companyChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Mesaj nou')).toBeInTheDocument();
  });
});
