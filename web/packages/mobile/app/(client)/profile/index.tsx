import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { Button } from '../../../src/components/ui/Button';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// Menu item definition
// ---------------------------------------------------------------------------

interface MenuItem {
  label: string;
  sublabel?: string;
  route: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Adresele mele',
    sublabel: 'Administreaza adresele salvate',
    route: '/(client)/profile/addresses',
    icon: '📍',
  },
  {
    label: 'Metode de plata',
    sublabel: 'Carduri salvate',
    route: '/(client)/profile/payment-methods',
    icon: '💳',
  },
  {
    label: 'Facturi',
    sublabel: 'Istoricul facturilor',
    route: '/(client)/profile/invoices',
    icon: '🧾',
  },
  {
    label: 'Abonamente',
    sublabel: 'Gestioneaza abonamentul activ',
    route: '/(client)/profile/subscriptions',
    icon: '⭐',
  },
  {
    label: 'Suport',
    sublabel: 'Contacteaza echipa Go2Fix',
    route: '/(client)/profile/support',
    icon: '💬',
  },
];

// ---------------------------------------------------------------------------
// Avatar placeholder
// ---------------------------------------------------------------------------

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Contul meu</Text>

        {/* User info card */}
        <PlatformCard style={styles.userCard}>
          <AvatarPlaceholder name={displayName || 'U'} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName || 'Utilizator'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </PlatformCard>

        {/* Menu items */}
        <PlatformCard style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <React.Fragment key={item.route}>
              <Pressable
                style={styles.menuItem}
                onPress={() => router.push(item.route as never)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.sublabel ? (
                    <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                  ) : null}
                </View>
                <Text style={styles.chevron}>{'›'}</Text>
              </Pressable>
              {idx < MENU_ITEMS.length - 1 && (
                <View style={styles.divider} />
              )}
            </React.Fragment>
          ))}
        </PlatformCard>

        {/* App version */}
        <Text style={styles.version}>Go2Fix v1.0.0</Text>

        {/* Logout */}
        <Button
          label="Deconectare"
          variant="ghost"
          onPress={logout}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  pageTitle: { ...typography.heading2, color: colors.textPrimary },
  userCard: {
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.heading3,
    color: '#fff',
  },
  userInfo: { flex: 1, gap: 2 },
  userName: { ...typography.heading3, color: colors.textPrimary },
  userEmail: { ...typography.small, color: colors.textSecondary },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  menuIcon: { fontSize: 22 },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  menuSublabel: { ...typography.caption, color: colors.textSecondary },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.base + 22 + spacing.md,
  },
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
