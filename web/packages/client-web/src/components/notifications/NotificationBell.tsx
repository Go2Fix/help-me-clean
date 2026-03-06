import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Building2,
  UserCheck,
  Receipt,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import {
  UNREAD_NOTIFICATION_COUNT,
  MY_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '@/graphql/operations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface NotificationConnection {
  edges: Notification[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface UnreadNotificationCountData {
  unreadNotificationCount: number;
}

interface MyNotificationsData {
  myNotifications: NotificationConnection;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'acum';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}z`;
}

function iconForType(type: string): LucideIcon {
  if (type.startsWith('booking_')) return Calendar;
  if (type.startsWith('company_') || type.startsWith('document_')) return Building2;
  if (type.startsWith('worker_') || type === 'cleaner_invited') return UserCheck;
  if (
    type.startsWith('invoice_') ||
    type.startsWith('payment_') ||
    type.startsWith('subscription_')
  )
    return Receipt;
  if (type.startsWith('account_')) return Shield;
  return Bell;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Poll unread count every 30 seconds
  const { data: countData } = useQuery<UnreadNotificationCountData>(
    UNREAD_NOTIFICATION_COUNT,
    { pollInterval: 30_000, fetchPolicy: 'cache-and-network' },
  );

  const unreadCount = countData?.unreadNotificationCount ?? 0;

  // Lazy-load notifications when popover opens
  const [fetchNotifications, { data: notifData, loading: notifLoading }] =
    useLazyQuery<MyNotificationsData>(MY_NOTIFICATIONS, {
      fetchPolicy: 'cache-and-network',
    });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [{ query: UNREAD_NOTIFICATION_COUNT }],
  });

  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [
      { query: UNREAD_NOTIFICATION_COUNT },
      { query: MY_NOTIFICATIONS, variables: { first: 20 } },
    ],
  });

  // Fetch notifications when the dropdown opens
  useEffect(() => {
    if (open) {
      void fetchNotifications({ variables: { first: 20 } });
    }
  }, [open, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const notifications = notifData?.myNotifications.edges ?? [];

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        await markRead({ variables: { id: notification.id } });
      }
      setOpen(false);
      const bookingId = notification.data?.bookingId as string | undefined;

      switch (notification.type) {
        case 'category_request_received':
          navigate('/admin/categorii-cereri');
          break;
        case 'category_request_approved':
        case 'category_request_rejected':
          navigate('/firma/setari');
          break;
        case 'category_assigned':
          navigate('/worker/profil');
          break;
        default:
          if (bookingId) navigate(`/cont/comenzi/${bookingId}`);
          break;
      }
    },
    [markRead, navigate],
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition cursor-pointer"
        aria-label="Notificari"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notificari</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition cursor-pointer"
              >
                Marcheaza toate ca citite
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {notifLoading && notifications.length === 0 ? (
              /* Loading skeleton */
              <div className="px-4 py-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Bell className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nicio notificare</span>
              </div>
            ) : (
              notifications.map((notification) => {
                const TypeIcon = iconForType(notification.type);
                const isUnread = !notification.isRead;

                return (
                  <button
                    key={notification.id}
                    onClick={() => void handleNotificationClick(notification)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 cursor-pointer',
                      isUnread && 'bg-blue-50/40',
                    )}
                  >
                    {/* Icon container */}
                    <div
                      className={cn(
                        'relative shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                        isUnread ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      <TypeIcon className="h-4 w-4" />
                      {/* Unread indicator dot */}
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-600 border border-white" />
                      )}
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm truncate',
                          isUnread
                            ? 'font-medium text-gray-900'
                            : 'font-normal text-gray-500',
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                    </div>

                    {/* Relative time */}
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
