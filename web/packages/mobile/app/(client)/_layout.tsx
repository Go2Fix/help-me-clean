import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useNotifications } from '../../src/hooks/useNotifications';
import { usePushNotificationRouting } from '../../src/hooks/usePushNotificationRouting';
import { colors } from '../../src/design/tokens';

export default function ClientLayout() {
  useNotifications();
  usePushNotificationRouting();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Acasa',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          tabBarLabel: 'Rezervari',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarLabel: 'Cont',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="bookings/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment/setup" options={{ href: null }} />
      <Tabs.Screen name="profile/addresses" options={{ href: null }} />
      <Tabs.Screen name="profile/payment-methods" options={{ href: null }} />
    </Tabs>
  );
}
