import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../design/tokens';

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}

export function StarRating({ value, onChange, size = 32 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={8}
          accessibilityLabel={`${star} stele`}
          accessibilityRole="button"
        >
          <Text
            style={[
              { fontSize: size },
              star <= value ? styles.filled : styles.empty,
            ]}
          >
            {'★'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filled: {
    color: colors.accent,
  },
  empty: {
    color: colors.border,
  },
});
