import { gql, useMutation, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_ADDRESSES = gql`
  query MyAddressesScreen {
    myAddresses {
      id
      label
      streetAddress
      city
      county
      floor
      apartment
      isDefault
    }
  }
`;

const ADD_ADDRESS = gql`
  mutation AddAddressScreen($input: AddAddressInput!) {
    addAddress(input: $input) {
      id
      label
      streetAddress
      city
      county
      floor
      apartment
      isDefault
    }
  }
`;

const DELETE_ADDRESS = gql`
  mutation DeleteAddressScreen($id: ID!) {
    deleteAddress(id: $id)
  }
`;

const SET_DEFAULT_ADDRESS = gql`
  mutation SetDefaultAddressScreen($id: ID!) {
    setDefaultAddress(id: $id) {
      id
      isDefault
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedAddress {
  id: string;
  label: string | null;
  streetAddress: string;
  city: string;
  county: string;
  floor: string | null;
  apartment: string | null;
  isDefault: boolean;
}

interface MyAddressesData {
  myAddresses: SavedAddress[];
}

interface AddressFormState {
  label: string;
  streetAddress: string;
  city: string;
  county: string;
  floor: string;
  apartment: string;
}

const EMPTY_FORM: AddressFormState = {
  label: '',
  streetAddress: '',
  city: '',
  county: '',
  floor: '',
  apartment: '',
};

// ---------------------------------------------------------------------------
// Add address modal
// ---------------------------------------------------------------------------

function AddAddressModal({
  visible,
  onClose,
  onSave,
  loading,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (form: AddressFormState) => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSave() {
    if (!form.streetAddress.trim()) {
      setValidationError('Strada si numarul sunt obligatorii.');
      return;
    }
    if (!form.city.trim()) {
      setValidationError('Orasul este obligatoriu.');
      return;
    }
    if (!form.county.trim()) {
      setValidationError('Judetul este obligatoriu.');
      return;
    }
    setValidationError(null);
    onSave(form);
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setValidationError(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adauga adresa</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.modalClose}>{'✕'}</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {(
              [
                {
                  key: 'streetAddress',
                  label: 'Strada si numar *',
                  placeholder: 'Ex: Str. Florilor nr. 10',
                },
                {
                  key: 'city',
                  label: 'Oras *',
                  placeholder: 'Ex: Cluj-Napoca',
                },
                {
                  key: 'county',
                  label: 'Judet *',
                  placeholder: 'Ex: Cluj',
                },
                {
                  key: 'label',
                  label: 'Eticheta',
                  placeholder: 'Ex: Acasa, Birou',
                },
                {
                  key: 'floor',
                  label: 'Etaj',
                  placeholder: 'Ex: 3',
                },
                {
                  key: 'apartment',
                  label: 'Apartament',
                  placeholder: 'Ex: 12',
                },
              ] as Array<{
                key: keyof AddressFormState;
                label: string;
                placeholder: string;
              }>
            ).map(({ key, label, placeholder }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={form[key]}
                  onChangeText={(v: string) =>
                    setForm((f) => ({ ...f, [key]: v }))
                  }
                />
              </View>
            ))}

            {(validationError ?? error) ? (
              <Text style={styles.errorText}>
                {validationError ?? error}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                label="Anuleaza"
                variant="ghost"
                onPress={handleClose}
                style={styles.modalBtn}
              />
              <Button
                label="Salveaza"
                onPress={handleSave}
                loading={loading}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddressesScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<MyAddressesData>(MY_ADDRESSES, {
    fetchPolicy: 'cache-and-network',
  });

  const [addAddress, { loading: addLoading }] = useMutation(ADD_ADDRESS, {
    onCompleted: () => {
      setShowAddModal(false);
      refetch();
    },
    onError: (err) => {
      setAddError(err.message);
    },
  });

  const [deleteAddress, { loading: deleteLoading }] = useMutation(
    DELETE_ADDRESS,
    {
      onCompleted: () => refetch(),
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  const [setDefaultAddress] = useMutation(SET_DEFAULT_ADDRESS, {
    onCompleted: () => refetch(),
    onError: (err) => {
      Alert.alert('Eroare', err.message);
    },
  });

  function handleDelete(address: SavedAddress) {
    Alert.alert(
      'Sterge adresa',
      `Esti sigur ca vrei sa stergi adresa "${address.streetAddress}, ${address.city}"?`,
      [
        { text: 'Anuleaza', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: () => deleteAddress({ variables: { id: address.id } }),
        },
      ]
    );
  }

  const addresses = data?.myAddresses ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>{'‹ Inapoi'}</Text>
        </Pressable>
        <Text style={styles.title}>Adresele mele</Text>
        <Pressable
          onPress={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          hitSlop={8}
        >
          <Text style={styles.addText}>{'+'}</Text>
        </Pressable>
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
          {addresses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'📍'}</Text>
              <Text style={styles.emptyTitle}>Nicio adresa salvata</Text>
              <Text style={styles.emptySubtitle}>
                Adauga o adresa pentru a rezerva mai repede.
              </Text>
              <Button
                label="Adauga adresa"
                onPress={() => setShowAddModal(true)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            addresses.map((addr) => (
              <PlatformCard key={addr.id} style={styles.addrCard}>
                <View style={styles.addrHeader}>
                  <View style={styles.addrTitleRow}>
                    {addr.label ? (
                      <Text style={styles.addrLabel}>{addr.label}</Text>
                    ) : null}
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Implicita</Text>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleDelete(addr)}
                    hitSlop={8}
                    disabled={deleteLoading}
                  >
                    <Text style={styles.trashIcon}>{'🗑'}</Text>
                  </Pressable>
                </View>
                <Text style={styles.addrStreet}>
                  {addr.streetAddress}
                  {addr.floor ? `, etaj ${addr.floor}` : ''}
                  {addr.apartment ? `, ap. ${addr.apartment}` : ''}
                </Text>
                <Text style={styles.addrCity}>
                  {addr.city}, {addr.county}
                </Text>
                {!addr.isDefault && (
                  <Pressable
                    onPress={() =>
                      setDefaultAddress({ variables: { id: addr.id } })
                    }
                    style={styles.setDefaultBtn}
                  >
                    <Text style={styles.setDefaultText}>
                      Seteaza ca implicita
                    </Text>
                  </Pressable>
                )}
              </PlatformCard>
            ))
          )}
        </ScrollView>
      )}

      <AddAddressModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        loading={addLoading}
        error={addError}
        onSave={(form) => {
          setAddError(null);
          addAddress({
            variables: {
              input: {
                label: form.label.trim() || null,
                streetAddress: form.streetAddress.trim(),
                city: form.city.trim(),
                county: form.county.trim(),
                floor: form.floor.trim() || null,
                apartment: form.apartment.trim() || null,
              },
            },
          });
        }}
      />
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
  addText: { fontSize: 28, color: colors.primary, fontWeight: '400', lineHeight: 32 },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  addrCard: { padding: spacing.base, gap: spacing.sm },
  addrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addrTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  addrLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  addrStreet: { ...typography.body, color: colors.textPrimary },
  addrCity: { ...typography.small, color: colors.textSecondary },
  trashIcon: { fontSize: 18 },
  setDefaultBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  setDefaultText: { ...typography.smallMedium, color: colors.primary },
  empty: { alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading3, color: colors.textPrimary },
  emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: { ...typography.heading3, color: colors.textPrimary },
  modalClose: { fontSize: 18, color: colors.textSecondary },
  fieldGroup: { gap: spacing.xs, marginBottom: spacing.md },
  fieldLabel: { ...typography.smallMedium, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  errorText: { ...typography.small, color: colors.danger, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1 },
});
