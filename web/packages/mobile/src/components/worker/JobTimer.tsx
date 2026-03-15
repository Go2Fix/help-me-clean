import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../design/tokens';

interface JobTimerProps {
  startedAt: string;
}

function computeElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m in desfasurare`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s in desfasurare`;
  }
  return `${seconds}s in desfasurare`;
}

export function JobTimer({ startedAt }: JobTimerProps) {
  const [elapsed, setElapsed] = useState(() => computeElapsed(startedAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(computeElapsed(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={styles.timer}>{elapsed}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
