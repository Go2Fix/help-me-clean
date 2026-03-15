import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors, radius, shadows } from './tokens';

interface PlatformCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Force glass rendering even on non-iOS (for blur-heavy UIs) */
  glass?: boolean;
}

export function PlatformCard({ children, style, glass = false }: PlatformCardProps) {
  if (Platform.OS === 'ios' || glass) {
    return <GlassCard style={style}>{children}</GlassCard>;
  }
  return <View style={[styles.androidCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  androidCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.md,
  },
});
