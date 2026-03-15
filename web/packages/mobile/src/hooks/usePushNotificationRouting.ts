import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

type NotificationType =
  | 'booking_confirmed'
  | 'booking_assigned'
  | 'job_started'
  | 'job_completed'
  | 'new_notification';

interface NotificationData {
  type: NotificationType;
  bookingId?: string;
}

function resolveRoute(data: NotificationData): string | null {
  switch (data.type) {
    case 'booking_confirmed':
    case 'booking_assigned':
    case 'job_started':
    case 'job_completed':
      if (data.bookingId) {
        return `/(client)/bookings/${data.bookingId}`;
      }
      return '/(client)/bookings';
    case 'new_notification':
      return '/(client)/profile';
    default:
      return null;
  }
}

/**
 * Sets up tap-to-navigate for push notifications in the client portal.
 * Must be called inside the `(client)/_layout.tsx` after auth is established.
 */
export function usePushNotificationRouting(): void {
  useEffect(() => {
    // Handle notifications that were tapped while the app was in background/killed
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;
        if (!data?.type) return;
        const route = resolveRoute(data);
        if (route) {
          // Small delay ensures navigation stack is ready
          setTimeout(() => {
            router.push(route as never);
          }, 100);
        }
      });

    return () => {
      responseSubscription.remove();
    };
  }, []);
}
