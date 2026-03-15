import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography } from '../../src/design/tokens';

export default function AdminWebScreen() {
  const { logout } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.icon}>🖥️</Text>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.body}>
          Panoul de administrare este disponibil exclusiv pe web.{'\n'}
          Acceseaza go2fix.ro/admin din browser.
        </Text>
        <Button label="Deconectare" variant="ghost" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  icon: { fontSize: 64 },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
