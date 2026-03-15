import { gql, useMutation } from '@apollo/client';
import { useEffect } from 'react';
import { router } from 'expo-router';
import {
  addNotificationTapListener,
  getDeviceToken,
  requestNotificationPermission,
} from '../notifications/setup';

const REGISTER_DEVICE_TOKEN = gql`
  mutation RegisterDeviceToken($token: String!) {
    registerDeviceToken(token: $token)
  }
`;

function routeFromNotification(data: Record<string, unknown>): string | null {
  const type = data?.type as string | undefined;
  const bookingId = data?.bookingId as string | undefined;
  const role = data?.userRole as string | undefined;

  if (!type) return null;

  if (
    [
      'booking_confirmed',
      'booking_assigned',
      'booking_cancelled',
      'payment_succeeded',
      'review_received',
    ].includes(type)
  ) {
    if (bookingId) {
      if (role === 'WORKER') return `/(worker)/jobs/${bookingId}`;
      if (role === 'COMPANY_ADMIN') return `/(company)/orders/${bookingId}`;
      return `/(client)/bookings/${bookingId}`;
    }
  }

  if (type === 'job_started' || type === 'job_completed') {
    if (bookingId) return `/(client)/bookings/${bookingId}`;
  }

  return null;
}

export function useNotifications(): void {
  const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init(): Promise<void> {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const token = await getDeviceToken();
      if (token) {
        registerToken({ variables: { token } }).catch(() => {});
      }

      const sub = addNotificationTapListener((notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        const route = routeFromNotification(data);
        if (route) {
          setTimeout(() => router.push(route as never), 300);
        }
      });
      cleanup = () => sub.remove();
    }

    void init();
    return () => cleanup?.();
  }, [registerToken]);
}
