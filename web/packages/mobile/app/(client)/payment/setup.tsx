import { gql, useMutation } from '@apollo/client';
import {
  CardField,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const CREATE_SETUP_INTENT = gql`
  mutation CreateSetupIntentMobile {
    createSetupIntent {
      clientSecret
    }
  }
`;

const ATTACH_PAYMENT_METHOD = gql`
  mutation AttachPaymentMethodMobile($stripePaymentMethodId: String!) {
    attachPaymentMethod(stripePaymentMethodId: $stripePaymentMethodId) {
      id
      cardLastFour
      cardBrand
      isDefault
    }
  }
`;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PaymentSetupScreen() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { confirmSetupIntent } = useConfirmSetupIntent();

  const [createSetupIntent, { loading: setupLoading }] = useMutation(
    CREATE_SETUP_INTENT,
    {
      onCompleted: (data) => {
        setClientSecret(data.createSetupIntent.clientSecret as string);
      },
      onError: (err) => {
        setError(err.message);
      },
    }
  );

  const [attachPaymentMethod] = useMutation(ATTACH_PAYMENT_METHOD, {
    onCompleted: () => {
      router.replace('/(client)/profile/payment-methods' as never);
    },
    onError: (err) => {
      setError(err.message);
      setSaving(false);
    },
  });

  useEffect(() => {
    createSetupIntent();
  }, [createSetupIntent]);

  async function handleSaveCard() {
    if (!clientSecret || !cardComplete) return;
    setError(null);
    setSaving(true);

    const { setupIntent, error: stripeError } = await confirmSetupIntent(
      clientSecret,
      { paymentMethodType: 'Card' }
    );

    if (stripeError) {
      setError(stripeError.message ?? 'Eroare la salvarea cardului.');
      setSaving(false);
      return;
    }

    if (setupIntent?.paymentMethodId) {
      attachPaymentMethod({
        variables: {
          stripePaymentMethodId: setupIntent.paymentMethodId,
        },
      });
    } else {
      setError('Nu s-a putut identifica metoda de plata.');
      setSaving(false);
    }
  }

  if (setupLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Se initializeaza...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>{'‹ Inapoi'}</Text>
        </Pressable>
        <Text style={styles.title}>Adauga card</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PlatformCard style={styles.card}>
          <Text style={styles.sectionTitle}>Detalii card</Text>
          <Text style={styles.sectionSubtitle}>
            Datele cardului sunt procesate securizat prin Stripe. Nu stocam
            informatiile cardului tau.
          </Text>

          {clientSecret ? (
            <CardField
              postalCodeEnabled={false}
              placeholders={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={{
                backgroundColor: colors.surface,
                textColor: colors.textPrimary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                placeholderColor: colors.textSecondary,
              }}
              style={styles.cardField}
              onCardChange={(cardDetails: { complete: boolean }) => {
                setCardComplete(cardDetails.complete);
                setError(null);
              }}
            />
          ) : (
            <View style={styles.cardFieldPlaceholder}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </PlatformCard>

        <PlatformCard style={styles.infoCard}>
          <Text style={styles.infoText}>
            {'🔒'} Plata este procesata securizat prin Stripe. Cardul tau va fi
            folosit pentru platile viitoare ale rezervarilor.
          </Text>
        </PlatformCard>

        <Button
          label="Salveaza cardul"
          onPress={handleSaveCard}
          loading={saving}
          disabled={!cardComplete || !clientSecret}
          fullWidth
          size="lg"
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backText: { ...typography.bodyMedium, color: colors.primary },
  title: { ...typography.heading3, color: colors.textPrimary },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  card: { padding: spacing.base, gap: spacing.md },
  sectionTitle: { ...typography.heading3, color: colors.textPrimary },
  sectionSubtitle: { ...typography.small, color: colors.textSecondary },
  cardField: {
    height: 52,
    marginTop: spacing.sm,
  },
  cardFieldPlaceholder: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  infoCard: {
    padding: spacing.base,
    backgroundColor: '#F0FDF4',
  },
  infoText: { ...typography.small, color: '#166534' },
  errorText: { ...typography.small, color: colors.danger },
});
