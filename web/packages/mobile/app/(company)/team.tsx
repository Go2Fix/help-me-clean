import { gql, useMutation, useQuery } from '@apollo/client';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const MY_WORKERS = gql`
  query MyWorkers {
    myWorkers {
      id
      fullName
      status
      ratingAvg
      totalJobsCompleted
      email
    }
  }
`;

const INVITE_WORKER = gql`
  mutation InviteWorker($input: InviteWorkerInput!) {
    inviteWorker(input: $input) {
      id
      fullName
      status
      email
    }
  }
`;

const UPDATE_WORKER_STATUS = gql`
  mutation UpdateWorkerStatus($id: ID!, $status: WorkerStatus!) {
    updateWorkerStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkerStatus =
  | 'ACTIVE'
  | 'INVITED'
  | 'PENDING_REVIEW'
  | 'SUSPENDED'
  | 'INACTIVE';

interface Worker {
  id: string;
  fullName: string;
  status: WorkerStatus;
  ratingAvg: number | null;
  totalJobsCompleted: number;
  email: string;
}

interface WorkersData {
  myWorkers: Worker[];
}

interface InviteFormState {
  fullName: string;
  email: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function workerStatusLabel(status: WorkerStatus): string {
  const map: Record<WorkerStatus, string> = {
    ACTIVE: 'Activ',
    INVITED: 'Invitat',
    PENDING_REVIEW: 'In verificare',
    SUSPENDED: 'Suspendat',
    INACTIVE: 'Inactiv',
  };
  return map[status] ?? status;
}

function workerStatusColors(status: WorkerStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'ACTIVE':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'INVITED':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'PENDING_REVIEW':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'SUSPENDED':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'INACTIVE':
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

function formatRating(rating: number | null): string {
  if (rating == null) return '—';
  return `★ ${rating.toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkerStatusBadge({ status }: { status: WorkerStatus }) {
  const { bg, text } = workerStatusColors(status);
  return (
    <View style={[styles.workerBadge, { backgroundColor: bg }]}>
      <Text style={[styles.workerBadgeText, { color: text }]}>
        {workerStatusLabel(status)}
      </Text>
    </View>
  );
}

function InviteWorkerModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: InviteFormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<InviteFormState>({
    fullName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<InviteFormState>>({});

  function validate(): boolean {
    const newErrors: Partial<InviteFormState> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Numele este obligatoriu.';
    if (!form.email.trim()) newErrors.email = 'Email-ul este obligatoriu.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Email invalid.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form);
  }

  function handleClose() {
    setForm({ fullName: '', email: '', phone: '' });
    setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Invita lucrator</Text>
          <Text style={styles.modalSubtitle}>
            Lucratorul va primi un email de invitatie.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nume complet *</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Ion Popescu"
              placeholderTextColor={colors.textSecondary}
              value={form.fullName}
              onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
              autoCapitalize="words"
            />
            {errors.fullName ? (
              <Text style={styles.fieldError}>{errors.fullName}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ion@exemplu.ro"
              placeholderTextColor={colors.textSecondary}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Telefon (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="07xx xxx xxx"
              placeholderTextColor={colors.textSecondary}
              value={form.phone}
              onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              label="Renunta"
              variant="ghost"
              onPress={handleClose}
              style={styles.modalBtn}
            />
            <Button
              label="Trimite invitatie"
              onPress={handleSubmit}
              loading={loading}
              style={styles.modalBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WorkerCard({
  worker,
  onToggleStatus,
  toggleLoading,
}: {
  worker: Worker;
  onToggleStatus: (worker: Worker) => void;
  toggleLoading: boolean;
}) {
  const canToggle =
    worker.status === 'ACTIVE' || worker.status === 'INACTIVE';

  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          'Detalii lucrator',
          `${worker.fullName} — detalii disponibile in curand.`
        )
      }
    >
      <PlatformCard style={styles.workerCard}>
        <View style={styles.workerHeader}>
          <View style={styles.workerAvatar}>
            <Text style={styles.workerAvatarText}>
              {worker.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.workerMeta}>
            <Text style={styles.workerName}>{worker.fullName}</Text>
            <Text style={styles.workerEmail} numberOfLines={1}>
              {worker.email}
            </Text>
          </View>
          <WorkerStatusBadge status={worker.status} />
        </View>

        <View style={styles.workerStats}>
          <View style={styles.workerStat}>
            <Text style={styles.workerStatValue}>
              {formatRating(worker.ratingAvg)}
            </Text>
            <Text style={styles.workerStatLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.workerStat}>
            <Text style={styles.workerStatValue}>
              {worker.totalJobsCompleted}
            </Text>
            <Text style={styles.workerStatLabel}>Joburi</Text>
          </View>
          {canToggle && (
            <>
              <View style={styles.statDivider} />
              <Button
                label={worker.status === 'ACTIVE' ? 'Suspend' : 'Activeaza'}
                variant={worker.status === 'ACTIVE' ? 'danger' : 'secondary'}
                size="sm"
                onPress={() => onToggleStatus(worker)}
                loading={toggleLoading}
              />
            </>
          )}
        </View>
      </PlatformCard>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanyTeamScreen() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<WorkersData>(MY_WORKERS, {
    fetchPolicy: 'cache-and-network',
  });

  const [inviteWorker, { loading: inviteLoading }] = useMutation(
    INVITE_WORKER,
    {
      onCompleted: () => {
        setShowInviteModal(false);
        refetch();
        Alert.alert('Succes', 'Invitatia a fost trimisa.');
      },
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  const [updateWorkerStatus] = useMutation(UPDATE_WORKER_STATUS, {
    onCompleted: () => {
      setTogglingId(null);
      refetch();
    },
    onError: (err) => {
      setTogglingId(null);
      Alert.alert('Eroare', err.message);
    },
  });

  function handleInvite(form: InviteFormState) {
    inviteWorker({
      variables: {
        input: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        },
      },
    });
  }

  function handleToggleStatus(worker: Worker) {
    const newStatus: WorkerStatus =
      worker.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel =
      worker.status === 'ACTIVE' ? 'suspenda' : 'activeaza';

    Alert.alert(
      'Confirma actiunea',
      `Esti sigur ca vrei sa ${actionLabel} lucratorul ${worker.fullName}?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Confirma',
          style: worker.status === 'ACTIVE' ? 'destructive' : 'default',
          onPress: () => {
            setTogglingId(worker.id);
            updateWorkerStatus({
              variables: { id: worker.id, status: newStatus },
            });
          },
        },
      ]
    );
  }

  const workers = data?.myWorkers ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Echipa mea</Text>
          {data && (
            <Text style={styles.pageSubtitle}>
              {workers.length} lucrator{workers.length !== 1 ? 'i' : ''}
            </Text>
          )}
        </View>
        <Button
          label="+ Invita"
          size="sm"
          onPress={() => setShowInviteModal(true)}
        />
      </View>

      {/* Loading */}
      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Error */}
      {error && !data && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Empty */}
      {!loading && workers.length === 0 && data && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nu ai inca niciun lucrator.{'\n'}Invita primul tau lucrator!
          </Text>
          <Button
            label="Invita lucrator"
            onPress={() => setShowInviteModal(true)}
            style={{ marginTop: spacing.base }}
          />
        </View>
      )}

      {/* Workers list */}
      {workers.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onToggleStatus={handleToggleStatus}
              toggleLoading={togglingId === worker.id}
            />
          ))}
        </ScrollView>
      )}

      {/* Invite modal */}
      <InviteWorkerModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInvite}
        loading={inviteLoading}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // Page header
  pageHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: { ...typography.heading3, color: colors.textPrimary },
  pageSubtitle: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  // List
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },

  // Worker card
  workerCard: { padding: spacing.base, gap: spacing.md },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerAvatarText: {
    ...typography.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  workerMeta: { flex: 1 },
  workerName: { ...typography.bodyMedium, color: colors.textPrimary },
  workerEmail: { ...typography.caption, color: colors.textSecondary },

  // Worker badge
  workerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  workerBadgeText: { fontSize: 12, fontWeight: '600' },

  // Worker stats row
  workerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workerStat: { alignItems: 'center', gap: 2 },
  workerStatValue: { ...typography.smallMedium, color: colors.textPrimary },
  workerStatLabel: { ...typography.caption, color: colors.textSecondary },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
  },

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
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.heading3, color: colors.textPrimary },
  modalSubtitle: { ...typography.small, color: colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modalBtn: { flex: 1 },

  // Form fields
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { ...typography.small, color: colors.textSecondary, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { ...typography.caption, color: colors.danger },

  // States
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
});
