import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius } from '../../design/tokens';

type BookingStatus =
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_COMPANY'
  | 'PENDING';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  ASSIGNED: { label: 'Alocat', bg: '#FEF3C7', text: '#92400E' },
  CONFIRMED: { label: 'Confirmat', bg: '#D1FAE5', text: '#065F46' },
  IN_PROGRESS: { label: 'In desfasurare', bg: '#DBEAFE', text: '#1E40AF' },
  COMPLETED: { label: 'Finalizat', bg: '#F3F4F6', text: '#374151' },
  CANCELLED_BY_CLIENT: { label: 'Anulat', bg: '#FEE2E2', text: '#991B1B' },
  CANCELLED_BY_COMPANY: { label: 'Anulat', bg: '#FEE2E2', text: '#991B1B' },
  PENDING: { label: 'In asteptare', bg: '#FEF3C7', text: '#92400E' },
};

const FALLBACK_CONFIG: StatusConfig = { label: '', bg: '#F3F4F6', text: '#374151' };

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as BookingStatus] ?? { ...FALLBACK_CONFIG, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
