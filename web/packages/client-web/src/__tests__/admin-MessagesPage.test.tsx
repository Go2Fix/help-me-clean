import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import AdminMessagesPage from '@/pages/admin/MessagesPage';
import { ALL_CHAT_ROOMS, CHAT_ROOM_DETAIL } from '@/graphql/operations';

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
    user: { id: 'admin-1', fullName: 'Admin', email: 'admin@test.dev', role: 'GLOBAL_ADMIN', status: 'ACTIVE' },
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
      { user: { id: 'user-1', fullName: 'Ion Popescu', avatarUrl: null }, joinedAt: '2025-01-01T10:00:00Z' },
      { user: { id: 'user-2', fullName: 'Maria Curatenie', avatarUrl: null }, joinedAt: '2025-01-01T10:00:00Z' },
    ],
    lastMessage: {
      id: 'msg-1',
      content: 'Bun venit!',
      messageType: 'system',
      isRead: true,
      createdAt: '2025-01-01T10:00:00Z',
      sender: { id: 'user-2', fullName: 'Maria Curatenie' },
    },
  },
  {
    id: 'room-2',
    roomType: 'booking',
    createdAt: '2025-01-02T10:00:00Z',
    participants: [
      { user: { id: 'user-3', fullName: 'Ana Client', avatarUrl: null }, joinedAt: '2025-01-02T10:00:00Z' },
      { user: { id: 'user-4', fullName: 'George Worker', avatarUrl: null }, joinedAt: '2025-01-02T10:00:00Z' },
    ],
    lastMessage: {
      id: 'msg-2',
      content: 'La ce ora ajungeti?',
      messageType: 'text',
      isRead: false,
      createdAt: '2025-01-02T11:00:00Z',
      sender: { id: 'user-3', fullName: 'Ana Client' },
    },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMessagesPage />
    </MemoryRouter>,
  );
}

describe('Admin MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue([vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useSubscription).mockReturnValue({ data: null, loading: false } as ReturnType<typeof useSubscription>);
  });

  it('shows page title and subtitle', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Mesaje')).toBeInTheDocument();
    expect(screen.getByText('Toate conversatiile de pe platforma')).toBeInTheDocument();
  });

  it('shows loading spinner while rooms load', () => {
    vi.mocked(useQuery).mockImplementation(() => {
      return { data: null, loading: true } as ReturnType<typeof useQuery>;
    });
    renderPage();
    // Loader2 renders an svg with animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no rooms', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Nicio conversatie pe platforma')).toBeInTheDocument();
  });

  it('shows room list with participant names', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Ion Popescu, Maria Curatenie')).toBeInTheDocument();
    expect(screen.getByText('Ana Client, George Worker')).toBeInTheDocument();
  });

  it('shows last message preview for system messages as "Mesaj de sistem"', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Mesaj de sistem')).toBeInTheDocument();
  });

  it('shows last message content for text messages', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('La ce ora ajungeti?')).toBeInTheDocument();
  });

  it('shows room count in header', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Conversatii (2)')).toBeInTheDocument();
  });

  it('shows placeholder when no room selected', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Selecteaza o conversatie pentru a vedea mesajele')).toBeInTheDocument();
  });

  it('shows room type labels', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: mockRooms }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    const labels = screen.getAllByText('Rezervare');
    expect(labels.length).toBe(2);
  });

  it('shows "Conversatie noua" button', () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === ALL_CHAT_ROOMS) return { data: { allChatRooms: [] }, loading: false } as ReturnType<typeof useQuery>;
      return { data: null, loading: false } as ReturnType<typeof useQuery>;
    });
    renderPage();
    expect(screen.getByText('Conversatie noua')).toBeInTheDocument();
  });
});
