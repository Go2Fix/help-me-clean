import { gql, useMutation, useQuery } from '@apollo/client';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const COMPANY_ORDER_DETAIL = gql`
  query CompanyOrderDetail($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      status
      paymentStatus
      estimatedTotal
      finalTotal
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      client {
        fullName
        email
      }
      worker {
        id
        fullName
        ratingAvg
      }
      company {
        companyName
      }
    }
  }
`;

const MY_WORKERS = gql`
  query MyWorkersForAssignment {
    myWorkers {
      id
      fullName
      status
      ratingAvg
    }
  }
`;

const ASSIGN_WORKER = gql`
  mutation AssignWorkerToBooking($bookingId: ID!, $workerId: ID!) {
    assignWorkerToBooking(bookingId: $bookingId, workerId: $workerId) {
      id
      status
      worker {
        id
        fullName
        ratingAvg
      }
    }
  }
`;

const CONFIRM_BOOKING = gql`
  mutation ConfirmBookingCompany($id: ID!) {
    confirmBooking(id: $id) {
      id
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingAddress {
  streetAddress: string;
  city: string;
  county: string;
  floor: string | null;
  apartment: string | null;
}

interface BookingClient {
  firstName: string;
  lastName: string;
  email: string;
}

interface BookingWorker {
  id: string;
  fullName: string;
  ratingAvg: number | null;
}

interface OrderDetail {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  estimatedDurationHours: number | null;
  status: string;
  paymentStatus: string | null;
  estimatedTotal: number | null;
  finalTotal: number | null;
  address: BookingAddress | null;
  client: BookingClient | null;
  worker: BookingWorker | null;
  company: { companyName: string } | null;
}

interface OrderDetailData {
  booking: OrderDetail;
}

interface WorkerItem {
  id: string;
  fullName: string;
  status: string;
  ratingAvg: number | null;
}

interface WorkersData {
  myWorkers: WorkerItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    STANDARD_CLEANING: 'Curatenie standard',
    DEEP_CLEANING: 'Curatenie profunda',
    MOVE_IN_OUT: 'Curatenie mutare',
    POST_CONSTRUCTION: 'Curatenie dupa constructie',
    OFFICE: 'Curatenie birou',
    WINDOW: 'Curatenie geamuri',
  };
  return map[type] ?? type;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toFixed(2)} RON`;
}

function formatRating(rating: number | null): string {
  if (rating == null) return '—';
  return `★ ${rating.toFixed(1)}`;
}

function buildFullAddress(address: BookingAddress): string {
  return [
    address.streetAddress,
    address.floor ? `Etaj ${address.floor}` : null,
    address.apartment ? `Ap. ${address.apartment}` : null,
    address.city,
    address.county,
  ]
    .filter(Boolean)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function WorkerPickerModal({
  visible,
  workers,
  loadingWorkers,
  onClose,
  onSelect,
  assignLoading,
}: {
  visible: boolean;
  workers: WorkerItem[];
  loadingWorkers: boolean;
  onClose: () => void;
  onSelect: (workerId: string) => void;
  assignLoading: boolean;
}) {
  const activeWorkers = workers.filter((w) => w.status === 'ACTIVE');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Selecteaza lucrateur</Text>

          {loadingWorkers && (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: spacing.xl }}
            />
          )}

          {!loadingWorkers && activeWorkers.length === 0 && (
            <Text style={styles.emptyText}>
              Niciun lucrator activ disponibil.
            </Text>
          )}

          <FlatList
            data={activeWorkers}
            keyExtractor={(item) => item.id}
            style={styles.workerList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.workerRow}
                onPress={() => onSelect(item.id)}
                disabled={assignLoading}
              >
                <View style={styles.workerInfo}>
                  <Text style={styles.workerFullName}>{item.fullName}</Text>
                  <Text style={styles.workerRating}>
                    {formatRating(item.ratingAvg)}
                  </Text>
                </View>
                <Text style={styles.workerSelectHint}>Selecteaza →</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={styles.separator} />
            )}
          />

          <Button
            label="Inchide"
            variant="ghost"
            onPress={onClose}
            fullWidth
            style={styles.modalClose}
          />
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompanyOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showWorkerPicker, setShowWorkerPicker] = useState(false);

  const { data, loading, error, refetch } = useQuery<OrderDetailData>(
    COMPANY_ORDER_DETAIL,
    { variables: { id }, fetchPolicy: 'cache-and-network' }
  );

  const { data: workersData, loading: loadingWorkers } =
    useQuery<WorkersData>(MY_WORKERS, {
      skip: !showWorkerPicker,
      fetchPolicy: 'network-only',
    });

  const [assignWorker, { loading: assignLoading }] = useMutation(
    ASSIGN_WORKER,
    {
      onCompleted: () => {
        setShowWorkerPicker(false);
        refetch();
      },
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  const [confirmBooking, { loading: confirmLoading }] = useMutation(
    CONFIRM_BOOKING,
    {
      onCompleted: () => {
        refetch();
      },
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  // Loading state
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !data?.booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error?.message ?? 'Comanda nu a fost gasita.'}
          </Text>
          <Button
            label="Inapoi"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: spacing.base }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const booking = data.booking;
  const serviceName =
    booking.serviceName ?? formatServiceType(booking.serviceType);
  const displayTotal =
    booking.finalTotal != null ? booking.finalTotal : booking.estimatedTotal;

  const canConfirm =
    booking.status === 'ASSIGNED' && booking.worker != null;
  const isCompleted = booking.status === 'COMPLETED';

  function handleAssignWorker(workerId: string) {
    assignWorker({ variables: { bookingId: booking.id, workerId } });
  }

  function handleConfirm() {
    Alert.alert(
      'Confirma comanda',
      'Esti sigur ca vrei sa confirmi aceasta comanda?',
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Confirma',
          onPress: () => confirmBooking({ variables: { id: booking.id } }),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Text style={styles.backText}>{'‹ Comenzi'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.refCode}>{booking.referenceCode}</Text>
            <Text style={styles.serviceName}>{serviceName}</Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        {/* Client info */}
        {booking.client && (
          <PlatformCard style={styles.card}>
            <SectionTitle label="Client" />
            <DetailRow
              label="Nume"
              value={`${booking.client.firstName} ${booking.client.lastName}`}
            />
            <DetailRow label="Email" value={booking.client.email} />
            {booking.address?.city && (
              <DetailRow label="Oras" value={booking.address.city} />
            )}
          </PlatformCard>
        )}

        {/* Schedule */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Programare" />
          <DetailRow label="Data" value={formatDate(booking.scheduledDate)} />
          {booking.scheduledStartTime && (
            <DetailRow label="Ora" value={booking.scheduledStartTime} />
          )}
          {booking.estimatedDurationHours != null && (
            <DetailRow
              label="Durata estimata"
              value={`${booking.estimatedDurationHours} ore`}
            />
          )}
        </PlatformCard>

        {/* Address */}
        {booking.address && (
          <PlatformCard style={styles.card}>
            <SectionTitle label="Adresa" />
            <Text style={styles.addressText}>
              {buildFullAddress(booking.address)}
            </Text>
          </PlatformCard>
        )}

        {/* Worker assignment */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Lucrator alocat" />

          {booking.worker ? (
            <View style={styles.workerAssigned}>
              <View style={styles.workerAssignedInfo}>
                <Text style={styles.workerAssignedName}>
                  {booking.worker.fullName}
                </Text>
                <Text style={styles.workerAssignedRating}>
                  {formatRating(booking.worker.ratingAvg)}
                </Text>
              </View>
              {!isCompleted && (
                <Button
                  label="Schimba"
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowWorkerPicker(true)}
                />
              )}
            </View>
          ) : (
            <View style={styles.workerUnassignedBox}>
              <Text style={styles.workerUnassignedText}>
                Niciun lucrator alocat inca.
              </Text>
              <Button
                label="Aloca lucrator"
                onPress={() => setShowWorkerPicker(true)}
                fullWidth
                style={styles.assignBtn}
              />
            </View>
          )}
        </PlatformCard>

        {/* Price */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Pret" />
          {booking.estimatedTotal != null && (
            <DetailRow
              label="Total estimat"
              value={formatPrice(booking.estimatedTotal)}
            />
          )}
          {booking.finalTotal != null && (
            <DetailRow
              label="Total final"
              value={formatPrice(booking.finalTotal)}
            />
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(displayTotal)}</Text>
          </View>
          {booking.paymentStatus && (
            <View style={styles.payStatusRow}>
              <Text style={styles.detailLabel}>Status plata</Text>
              <View
                style={[
                  styles.payBadge,
                  booking.paymentStatus === 'PAID'
                    ? styles.payBadgePaid
                    : styles.payBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.payBadgeText,
                    booking.paymentStatus === 'PAID'
                      ? styles.payBadgeTextPaid
                      : styles.payBadgeTextPending,
                  ]}
                >
                  {booking.paymentStatus === 'PAID' ? 'Platit' : 'Neplatit'}
                </Text>
              </View>
            </View>
          )}
        </PlatformCard>

        {/* Action buttons */}
        <View style={styles.actions}>
          {canConfirm && (
            <Button
              label="Confirma comanda"
              onPress={handleConfirm}
              loading={confirmLoading}
              fullWidth
            />
          )}
        </View>
      </ScrollView>

      {/* Worker picker modal */}
      <WorkerPickerModal
        visible={showWorkerPicker}
        workers={workersData?.myWorkers ?? []}
        loadingWorkers={loadingWorkers}
        onClose={() => setShowWorkerPicker(false)}
        onSelect={handleAssignWorker}
        assignLoading={assignLoading}
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
    padding: spacing.base,
  },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { ...typography.bodyMedium, color: colors.primary },

  // Content
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },

  // Title row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleLeft: { flex: 1, marginRight: spacing.sm },
  refCode: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  serviceName: { ...typography.heading3, color: colors.textPrimary },

  // Cards
  card: { padding: spacing.base, gap: spacing.sm },
  sectionTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailLabel: { ...typography.small, color: colors.textSecondary, flex: 1 },
  detailValue: {
    ...typography.smallMedium,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },

  // Address
  addressText: { ...typography.body, color: colors.textPrimary },

  // Worker assignment
  workerAssigned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerAssignedInfo: { flex: 1 },
  workerAssignedName: { ...typography.bodyMedium, color: colors.textPrimary },
  workerAssignedRating: { ...typography.small, color: colors.accent },
  workerUnassignedBox: { gap: spacing.md },
  workerUnassignedText: { ...typography.body, color: colors.textSecondary },
  assignBtn: {},

  // Price
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  totalLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  totalValue: { ...typography.heading3, color: colors.primary },
  payStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  payBadgePaid: { backgroundColor: '#D1FAE5' },
  payBadgePending: { backgroundColor: '#FEF3C7' },
  payBadgeText: { fontSize: 12, fontWeight: '600' },
  payBadgeTextPaid: { color: '#065F46' },
  payBadgeTextPending: { color: '#92400E' },

  // Actions
  actions: { gap: spacing.sm },

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
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  modalTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  workerList: { maxHeight: 320 },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  workerInfo: { flex: 1 },
  workerFullName: { ...typography.bodyMedium, color: colors.textPrimary },
  workerRating: { ...typography.small, color: colors.accent },
  workerSelectHint: { ...typography.small, color: colors.primary },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  modalClose: { marginTop: spacing.base },

  // States
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
});
