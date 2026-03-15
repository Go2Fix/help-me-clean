import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../design/tokens';

interface StepProgressProps {
  steps: number;
  current: number;
}

export function StepProgress({ steps, current }: StepProgressProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: steps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;
        return (
          <React.Fragment key={stepNum}>
            <View
              style={[
                styles.dot,
                isCompleted && styles.dotCompleted,
                isActive && styles.dotActive,
              ]}
            >
              <Text
                style={[
                  styles.dotLabel,
                  (isCompleted || isActive) && styles.dotLabelActive,
                ]}
              >
                {stepNum}
              </Text>
            </View>
            {stepNum < steps && (
              <View
                style={[styles.line, isCompleted && styles.lineCompleted]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  dotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dotLabelActive: {
    color: '#fff',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  lineCompleted: {
    backgroundColor: colors.secondary,
  },
});
