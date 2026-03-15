import { Stack } from 'expo-router';
import { colors } from '../../src/design/tokens';

export default function NewBookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
