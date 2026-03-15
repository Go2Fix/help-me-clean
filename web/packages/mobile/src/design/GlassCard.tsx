import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadows } from './tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export function GlassCard({
  children,
  style,
  intensity = 60,
  tint = 'light',
}: GlassCardProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={[styles.glass, style]}>
        <View style={styles.overlay}>{children}</View>
      </BlurView>
    );
  }
  // On Android / web, fall back to opaque card
  return <View style={[styles.fallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadows.md,
  },
  overlay: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fallback: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.md,
  },
});
