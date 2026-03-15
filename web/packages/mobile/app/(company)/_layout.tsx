import { gql, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, Tabs } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_COMPANY_STATUS = gql`
  query MyCompanyStatus {
    myCompany {
      id
      status
      rejectionReason
    }
  }
`;

// ---------------------------------------------------------------------------
// Contact info (matches web)
// ---------------------------------------------------------------------------

const CONTACT_PHONE = '+40 312 345 678';
const CONTACT_EMAIL = 'contact@go2fix.ro';

function ContactInfo() {
  return (
    <View style={s.contactWrap}>
      <Text style={s.contactLabel}>Ai nevoie de ajutor?</Text>
      <Text style={s.contactItem}>{CONTACT_PHONE}</Text>
      <Text style={s.contactItem}>{CONTACT_EMAIL}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overlay shell
// ---------------------------------------------------------------------------

function StatusOverlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BlurView
        style={StyleSheet.absoluteFill}
        tint="light"
        intensity={Platform.OS === 'ios' ? 60 : 100}
      />
      <View style={[StyleSheet.absoluteFill, s.overlayCenter]} pointerEvents="box-none">
        <View style={s.card}>{children}</View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overlay variants
// ---------------------------------------------------------------------------

function PendingOverlay() {
  const { logout } = useAuth();
  return (
    <StatusOverlay>
      <View style={s.iconCircleAmber}>
        <Feather name="clock" size={32} color="#F59E0B" />
      </View>
      <Text style={s.cardTitle}>Aplicatia ta este in curs de verificare</Text>
      <Text style={s.cardBody}>
        Echipa noastra verifica documentele si datele firmei tale. Vei primi o notificare cand procesul este finalizat.
      </Text>
      <Text style={s.cardNote}>De obicei, verificarea dureaza 1-2 zile lucratoare.</Text>
      <Pressable style={s.logoutBtn} onPress={logout}>
        <Feather name="log-out" size={16} color={colors.textSecondary} />
        <Text style={s.logoutText}>Deconecteaza-te</Text>
      </Pressable>
      <ContactInfo />
    </StatusOverlay>
  );
}

function RejectedOverlay({ reason }: { reason?: string | null }) {
  const { logout } = useAuth();
  return (
    <StatusOverlay>
      <View style={s.iconCircleRed}>
        <Feather name="x-circle" size={32} color="#EF4444" />
      </View>
      <Text style={s.cardTitle}>Aplicatia firmei a fost respinsa</Text>
      {reason ? (
        <View style={s.reasonBox}>
          <Text style={s.reasonLabel}>Motiv:</Text>
          <Text style={s.reasonText}>{reason}</Text>
        </View>
      ) : null}
      <Text style={s.cardBody}>
        Poti incerca sa aplici din nou sau sa ne contactezi pentru mai multe detalii.
      </Text>
      <Pressable
        style={s.primaryBtn}
        onPress={() => router.replace('/(auth)/register-company' as never)}
      >
        <Text style={s.primaryBtnText}>Aplica din nou</Text>
      </Pressable>
      <Pressable style={s.logoutBtn} onPress={logout}>
        <Feather name="log-out" size={16} color={colors.textSecondary} />
        <Text style={s.logoutText}>Deconecteaza-te</Text>
      </Pressable>
      <ContactInfo />
    </StatusOverlay>
  );
}

function SuspendedOverlay() {
  const { logout } = useAuth();
  return (
    <StatusOverlay>
      <View style={s.iconCircleRed}>
        <Feather name="shield-off" size={32} color="#EF4444" />
      </View>
      <Text style={s.cardTitle}>Contul firmei a fost suspendat</Text>
      <Text style={s.cardBody}>
        Accesul la panoul de administrare a fost restrictionat. Te rugam sa ne contactezi pentru a afla motivul si pasii urmatori.
      </Text>
      <Pressable style={s.logoutBtn} onPress={logout}>
        <Feather name="log-out" size={16} color={colors.textSecondary} />
        <Text style={s.logoutText}>Deconecteaza-te</Text>
      </Pressable>
      <ContactInfo />
    </StatusOverlay>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function CompanyLayout() {
  const { data, loading } = useQuery<{
    myCompany: { id: string; status: string; rejectionReason?: string | null };
  }>(MY_COMPANY_STATUS, { fetchPolicy: 'cache-and-network' });

  const status = data?.myCompany?.status;
  const rejectionReason = data?.myCompany?.rejectionReason;

  let overlay: React.ReactNode = null;
  if (loading && !data) {
    overlay = (
      <View style={[StyleSheet.absoluteFill, s.loadingOverlay]} pointerEvents="none">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  } else if (status === 'PENDING_REVIEW') {
    overlay = <PendingOverlay />;
  } else if (status === 'REJECTED') {
    overlay = <RejectedOverlay reason={rejectionReason} />;
  } else if (status === 'SUSPENDED') {
    overlay = <SuspendedOverlay />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor:
              Platform.OS === 'ios' ? 'transparent' : colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Acasa',
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders/index"
          options={{
            tabBarLabel: 'Comenzi',
            tabBarIcon: ({ color, size }) => (
              <Feather name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            tabBarLabel: 'Echipa',
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Feather name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarLabel: 'Setari',
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {overlay}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  iconCircleAmber: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircleRed: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  cardNote: {
    ...typography.small,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reasonLabel: {
    ...typography.smallMedium,
    color: '#B91C1C',
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.small,
    color: '#B91C1C',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    ...typography.bodyMedium,
    color: '#fff',
  },
  logoutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  logoutText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  contactWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  contactItem: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
