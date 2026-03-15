import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../src/design/tokens';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.note}>Chat in timp real — Faza 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    padding: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  note: { ...typography.body, color: colors.textSecondary },
});
