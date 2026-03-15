import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../design/tokens';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function EmptyState({ emoji = '📭', title, subtitle, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing['3xl'] },
  emoji: { fontSize: 48, marginBottom: spacing.base },
  title: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
