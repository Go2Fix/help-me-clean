import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { MessageCircle, Send, Loader2, Plus, X, Search } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import {
  ALL_CHAT_ROOMS,
  ALL_USERS,
  CREATE_ADMIN_CHAT_ROOM,
  CHAT_ROOM_DETAIL,
  SEND_MESSAGE,
  MARK_MESSAGES_READ,
  MESSAGE_SENT_SUBSCRIPTION,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatSender {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  sender: ChatSender;
}

interface ChatParticipant {
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    role?: string;
  };
  joinedAt: string;
}

interface ChatRoom {
  id: string;
  roomType: string;
  lastMessage?: ChatMessage;
  participants: ChatParticipant[];
  createdAt: string;
}

interface ChatRoomDetail {
  id: string;
  roomType: string;
  participants: ChatParticipant[];
  messages: {
    edges: ChatMessage[];
  };
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMessageTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string): { label: string; className: string } {
  switch (role) {
    case 'CLIENT':
      return { label: 'Client', className: 'bg-blue-100 text-blue-700' };
    case 'COMPANY_ADMIN':
      return { label: 'Admin Firma', className: 'bg-emerald-100 text-emerald-700' };
    case 'GLOBAL_ADMIN':
      return { label: 'Admin', className: 'bg-amber-100 text-amber-700' };
    case 'CLEANER':
      return { label: 'Curatator', className: 'bg-purple-100 text-purple-700' };
    default:
      return { label: role, className: 'bg-gray-100 text-gray-700' };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: roomsData, loading: roomsLoading } = useQuery<{ allChatRooms: ChatRoom[] }>(
    ALL_CHAT_ROOMS,
  );

  const { data: usersData, loading: usersLoading } = useQuery<{ allUsers: UserItem[] }>(
    ALL_USERS,
    { skip: !showNewChat },
  );

  const { data: roomDetailData, loading: roomDetailLoading } = useQuery<{
    chatRoom: ChatRoomDetail;
  }>(CHAT_ROOM_DETAIL, {
    variables: { id: roomId },
    skip: !roomId,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onCompleted: () => setMessageText(''),
    update: (cache, { data }) => {
      if (!data?.sendMessage || !roomId) return;

      const existing = cache.readQuery<{ chatRoom: ChatRoomDetail }>({
        query: CHAT_ROOM_DETAIL,
        variables: { id: roomId },
      });

      if (existing?.chatRoom) {
        cache.writeQuery({
          query: CHAT_ROOM_DETAIL,
          variables: { id: roomId },
          data: {
            chatRoom: {
              ...existing.chatRoom,
              messages: {
                ...existing.chatRoom.messages,
                edges: [...existing.chatRoom.messages.edges, data.sendMessage],
              },
            },
          },
        });
      }
    },
    refetchQueries: [{ query: ALL_CHAT_ROOMS }],
  });

  const [markMessagesRead] = useMutation(MARK_MESSAGES_READ);

  const [createAdminChatRoom] = useMutation(CREATE_ADMIN_CHAT_ROOM, {
    onCompleted: (data) => {
      navigate(`/admin/mesaje/${data.createAdminChatRoom.id}`);
      setShowNewChat(false);
      setSearchQuery('');
      setSelectedUserIds([]);
    },
    refetchQueries: [{ query: ALL_CHAT_ROOMS }],
  });

  // ─── Subscription ──────────────────────────────────────────────────────────

  useSubscription(MESSAGE_SENT_SUBSCRIPTION, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ data: subData, client }) => {
      const newMessage = subData.data?.messageSent;
      if (!newMessage || !roomId) return;

      // Dedup handled by ChatRoom.messages merge policy in Apollo cache config.
      // Skip messages we sent (mutation update already added them to cache).
      if (newMessage.sender.id === user?.id) return;

      const existing = client.readQuery<{ chatRoom: ChatRoomDetail }>({
        query: CHAT_ROOM_DETAIL,
        variables: { id: roomId },
      });

      if (existing?.chatRoom) {
        client.writeQuery({
          query: CHAT_ROOM_DETAIL,
          variables: { id: roomId },
          data: {
            chatRoom: {
              ...existing.chatRoom,
              messages: {
                ...existing.chatRoom.messages,
                edges: [...existing.chatRoom.messages.edges, newMessage],
              },
            },
          },
        });
      }
    },
  });

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (roomId) {
      markMessagesRead({ variables: { roomId } });
    }
  }, [roomId, markMessagesRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomDetailData?.chatRoom?.messages?.edges]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !roomId || sending) return;

    sendMessage({
      variables: { roomId, content: trimmed },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const rooms = roomsData?.allChatRooms || [];
  const chatRoom = roomDetailData?.chatRoom;
  const messages = chatRoom?.messages?.edges || [];
  const myId = user?.id || '';

  const allUsers = usersData?.allUsers || [];
  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mesaje</h1>
        <p className="text-gray-500 mt-1">Toate conversatiile de pe platforma</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ height: '600px' }}>
        {/* Sidebar - Room List */}
        <div className="w-80 border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Conversatii ({rooms.length})
            </h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Conversatie noua
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Nicio conversatie pe platforma</p>
              </div>
            ) : (
              rooms.map((room) => {
                const otherParticipants = room.participants.filter((p) => p.user.id !== myId);
                const isGroup = otherParticipants.length > 1;
                const participantNames = otherParticipants.length === 0
                  ? 'Conversatie'
                  : otherParticipants.map((p) => p.user.fullName).join(', ');
                const isActive = room.id === roomId;

                return (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/admin/mesaje/${room.id}`)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer',
                      isActive
                        ? 'bg-primary/5 border-r-2 border-primary'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    {isGroup ? (
                      <div className="relative w-10 h-10 shrink-0">
                        <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white z-10">
                          <span className="text-[9px] font-semibold text-emerald-700">
                            {getInitials(otherParticipants[0].user.fullName)}
                          </span>
                        </div>
                        <div className="absolute top-0 left-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white">
                          <span className="text-[9px] font-semibold text-primary">
                            {getInitials(otherParticipants[1].user.fullName)}
                          </span>
                        </div>
                        {otherParticipants.length > 2 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center z-20">
                            <span className="text-[8px] font-bold text-white">+{otherParticipants.length - 2}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {getInitials(participantNames)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participantNames}
                        </p>
                        {room.lastMessage && (
                          <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                            {formatMessageTime(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {room.lastMessage.messageType === 'system'
                            ? 'Mesaj de sistem'
                            : room.lastMessage.content}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {room.roomType === 'booking' ? 'Rezervare' : 'Suport'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main - Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!roomId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Selecteaza o conversatie pentru a vedea mesajele</p>
            </div>
          ) : roomDetailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              {chatRoom && (
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2 flex-wrap">
                  {chatRoom.participants.filter((p) => p.user.id !== myId).map((p, idx) => (
                    <span key={p.user.id} className="inline-flex items-center gap-1">
                      {idx > 0 && <span className="text-gray-300 mr-1">&middot;</span>}
                      <span className="relative group">
                        <span className="text-sm font-semibold text-gray-900 cursor-default">
                          {p.user.fullName}
                        </span>
                        {p.user.role && (
                          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {getRoleBadge(p.user.role).label}
                          </span>
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-gray-400">
                      Niciun mesaj in aceasta conversatie.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.messageType === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-gray-100 rounded-xl px-4 py-2 max-w-[80%]">
                            <p className="text-xs text-gray-500 italic text-center">
                              {msg.content}
                            </p>
                            <p className="text-[10px] text-gray-400 text-center mt-0.5">
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const isMine = msg.sender.id === myId;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          isMine ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div className={cn('max-w-[70%]', !isMine && 'flex items-start gap-2')}>
                          {!isMine && (
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                              <span className="text-[10px] font-semibold text-gray-600">
                                {getInitials(msg.sender.fullName)}
                              </span>
                            </div>
                          )}
                          <div>
                            {!isMine && (
                              <p className="text-[11px] text-gray-400 mb-0.5 ml-1">
                                {msg.sender.fullName}
                              </p>
                            )}
                            <div
                              className={cn(
                                'rounded-xl px-4 py-2.5',
                                isMine
                                  ? 'bg-primary text-white rounded-br-sm'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-sm',
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              <p
                                className={cn(
                                  'text-[11px] mt-1',
                                  isMine ? 'text-white/70' : 'text-gray-400',
                                )}
                              >
                                {formatMessageTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Raspunde ca admin..."
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer',
                      'bg-primary text-white hover:bg-blue-700 focus:ring-primary/30',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Trimite
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowNewChat(false);
            setSearchQuery('');
            setSelectedUserIds([]);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Conversatie noua</h3>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setSearchQuery('');
                  setSelectedUserIds([]);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cauta utilizator..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
              </div>
            </div>

            {/* Selected Chips */}
            {selectedUserIds.length > 0 && (
              <div className="px-4 sm:px-6 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
                {allUsers
                  .filter((u) => selectedUserIds.includes(u.id))
                  .map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {u.fullName}
                      <button
                        onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== u.id))}
                        className="hover:text-primary/70 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Search className="h-8 w-8 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Niciun utilizator gasit</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUserIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id],
                        );
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 sm:px-6 py-3 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-primary/5' : 'hover:bg-gray-50',
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-gray-300',
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {getInitials(u.fullName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {u.fullName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0',
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200">
              <button
                onClick={() =>
                  createAdminChatRoom({ variables: { userIds: selectedUserIds } })
                }
                disabled={selectedUserIds.length === 0}
                className={cn(
                  'w-full rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer',
                  'bg-primary text-white hover:bg-blue-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Incepe conversatia ({selectedUserIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
