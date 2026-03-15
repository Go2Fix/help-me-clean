import { gql, useMutation, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_PAYMENT_METHODS = gql`
  query MyPaymentMethodsScreen {
    myPaymentMethods {
      id
      cardLastFour
      cardBrand
      isDefault
    }
  }
`;

const DELETE_PAYMENT_METHOD = gql`
  mutation DeletePaymentMethodScreen($id: ID!) {
    deletePaymentMethod(id: $id)
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentMethod {
  id: string;
  cardLastFour: string;
  cardBrand: string;
  isDefault: boolean;
}

interface MyPaymentMethodsData {
  myPaymentMethods: PaymentMethod[];
}

// ---------------------------------------------------------------------------
// Card brand display
// ---------------------------------------------------------------------------

const BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 Amex',
  discover: '💳 Discover',
  unionpay: '💳 UnionPay',
};

function brandDisplay(brand: string): string {
  const normalized = brand.toLowerCase();
  return BRAND_ICONS[normalized] ?? `💳 ${brand}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PaymentMethodsScreen() {
  const { data, loading, refetch } = useQuery<MyPaymentMethodsData>(
    MY_PAYMENT_METHODS,
    { fetchPolicy: 'cache-and-network' }
  );

  const [deletePaymentMethod, { loading: deleteLoading }] = useMutation(
    DELETE_PAYMENT_METHOD,
    {
      onCompleted: () => refetch(),
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  function handleDelete(method: PaymentMethod) {
    Alert.alert(
      'Sterge cardul',
      `Esti sigur ca vrei sa stergi cardul **** ${method.cardLastFour}?`,
      [
        { text: 'Anuleaza', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: () =>
            deletePaymentMethod({ variables: { id: method.id } }),
        },
      ]
    );
  }

  const methods = data?.myPaymentMethods ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>{'‹ Inapoi'}</Text>
        </Pressable>
        <Text style={styles.title}>Metode de plata</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {methods.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'💳'}</Text>
              <Text style={styles.emptyTitle}>Niciun card salvat</Text>
              <Text style={styles.emptySubtitle}>
                Adauga un card pentru a plati rezervarile mai usor.
              </Text>
            </View>
          ) : (
            methods.map((method) => (
              <PlatformCard key={method.id} style={styles.methodCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardBrand}>
                      {brandDisplay(method.cardBrand)}
                    </Text>
                    <Text style={styles.cardNumber}>
                      {'**** **** **** '}
                      {method.cardLastFour}
                    </Text>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Implicit</Text>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleDelete(method)}
                    hitSlop={8}
                    disabled={deleteLoading}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>{'🗑'}</Text>
                  </Pressable>
                </View>
              </PlatformCard>
            ))
          )}

          {/* Add card button */}
          <Button
            label="+ Adauga card"
            variant={methods.length > 0 ? 'ghost' : 'primary'}
            onPress={() => router.push('/(client)/payment/setup' as never)}
            fullWidth
            style={styles.addBtn}
          />

          <PlatformCard style={styles.infoCard}>
            <Text style={styles.infoText}>
              {'🔒'} Platile sunt procesate securizat prin Stripe. Nu stocam
              datele cardului tau.
            </Text>
          </PlatformCard>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backText: { ...typography.bodyMedium, color: colors.primary },
  title: { ...typography.heading3, color: colors.textPrimary },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  methodCard: { padding: spacing.base },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { gap: spacing.xs, flex: 1 },
  cardBrand: { ...typography.smallMedium, color: colors.textSecondary },
  cardNumber: { ...typography.heading3, color: colors.textPrimary, fontFamily: 'monospace' },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: { fontSize: 18 },
  addBtn: { marginTop: spacing.xs },
  infoCard: {
    padding: spacing.base,
    backgroundColor: '#F0FDF4',
  },
  infoText: { ...typography.small, color: '#166534' },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading3, color: colors.textPrimary },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
