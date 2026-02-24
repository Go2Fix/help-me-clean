import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { MessageCircle, Send, Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import {
  MY_CHAT_ROOMS,
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

function getRoleLabel(role: string): string {
  switch (role) {
    case 'CLIENT': return 'Client';
    case 'COMPANY_ADMIN': return 'Admin Firma';
    case 'GLOBAL_ADMIN': return 'Admin';
    case 'WORKER': return 'Curatator';
    default: return role;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine base path based on user role
  const basePath = user?.role === 'WORKER' ? '/worker/mesaje' : '/cont/mesaje';

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: roomsData, loading: roomsLoading } = useQuery<{ myChatRooms: ChatRoom[] }>(
    MY_CHAT_ROOMS,
    { skip: !isAuthenticated },
  );

  const { data: roomDetailData, loading: roomDetailLoading } = useQuery<{
    chatRoom: ChatRoomDetail;
  }>(CHAT_ROOM_DETAIL, {
    variables: { id: roomId },
    skip: !roomId || !isAuthenticated,
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
    refetchQueries: [{ query: MY_CHAT_ROOMS }],
  });

  const [markMessagesRead] = useMutation(MARK_MESSAGES_READ);

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

  // Mark messages as read when opening a room
  useEffect(() => {
    if (roomId && isAuthenticated) {
      markMessagesRead({ variables: { roomId } });
    }
  }, [roomId, isAuthenticated, markMessagesRead]);

  // Scroll to bottom when messages change
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

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: basePath }} replace />;
  }

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const rooms = roomsData?.myChatRooms || [];
  const chatRoom = roomDetailData?.chatRoom;
  const messages = chatRoom?.messages?.edges || [];
  const myId = user?.id || '';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header — hide on narrow when inside a chat */}
      <div className={cn('mb-6', roomId && 'hidden lg:block')}>
        <h1 className="text-2xl font-bold text-gray-900">Mesaje</h1>
        <p className="text-gray-500 mt-1">Conversatiile tale</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex h-[calc(100dvh-10rem)] lg:h-[600px]">
        {/* Sidebar - Room List */}
        <div className={cn(
          'border-r border-gray-200 flex flex-col shrink-0',
          roomId ? 'hidden lg:flex lg:w-80' : 'w-full lg:w-80',
        )}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Conversatii</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Nicio conversatie</p>
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
                    onClick={() => navigate(`${basePath}/${room.id}`)}
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
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main - Chat Area */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          !roomId && 'hidden lg:flex',
        )}>
          {!roomId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Selecteaza o conversatie</p>
            </div>
          ) : roomDetailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              {chatRoom && (
                <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 flex items-center gap-2">
                  <button
                    onClick={() => navigate(basePath)}
                    className="lg:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                    aria-label="Inapoi la conversatii"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-500" />
                  </button>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {chatRoom.participants.filter((p) => p.user.id !== myId).map((p, idx) => (
                      <span key={p.user.id} className="inline-flex items-center gap-1">
                        {idx > 0 && <span className="text-gray-300 mr-1">&middot;</span>}
                        <span className="relative group">
                          <span className="text-sm font-semibold text-gray-900 cursor-default">
                            {p.user.fullName}
                          </span>
                          {p.user.role && (
                            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {getRoleLabel(p.user.role)}
                            </span>
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-gray-400">
                      Niciun mesaj inca. Trimite primul mesaj!
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
                        <div
                          className={cn(
                            'max-w-[70%] rounded-xl px-4 py-2.5',
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
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200">
                <div className="flex items-center gap-2 lg:gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrie un mesaj..."
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer',
                      'bg-primary text-white hover:bg-blue-700 focus:ring-primary/30',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'h-10 w-10 lg:h-auto lg:w-auto lg:px-5 lg:py-2.5',
                    )}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="hidden lg:inline">Trimite</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
