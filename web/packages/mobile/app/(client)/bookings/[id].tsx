import { gql, useMutation, useQuery } from '@apollo/client';
import { router, useLocalSearchParams } from 'expo-router';
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
import { StatusBadge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { StarRating } from '../../../src/components/booking/StarRating';
import { PlatformCard } from '../../../src/design';
import { colors, radius, spacing, typography } from '../../../src/design/tokens';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const BOOKING_DETAIL = gql`
  query BookingDetailMobile($id: ID!) {
    booking(id: $id) {
      id
      referenceCode
      serviceType
      serviceName
      scheduledDate
      scheduledStartTime
      estimatedDurationHours
      propertyType
      numRooms
      numBathrooms
      areaSqm
      hasPets
      specialInstructions
      hourlyRate
      estimatedTotal
      finalTotal
      status
      paymentStatus
      startedAt
      completedAt
      cancelledAt
      cancellationReason
      createdAt
      address {
        streetAddress
        city
        county
        floor
        apartment
      }
      company {
        id
        companyName
      }
      worker {
        id
        fullName
      }
      review {
        id
        rating
        comment
      }
    }
  }
`;

const CANCEL_BOOKING = gql`
  mutation CancelBookingMobile($id: ID!, $reason: String) {
    cancelBooking(id: $id, reason: $reason) {
      id
      status
      cancellationReason
    }
  }
`;

const RESCHEDULE_BOOKING = gql`
  mutation RescheduleBookingMobile(
    $id: ID!
    $scheduledDate: String!
    $scheduledStartTime: String!
    $reason: String
  ) {
    rescheduleBooking(
      id: $id
      scheduledDate: $scheduledDate
      scheduledStartTime: $scheduledStartTime
      reason: $reason
    ) {
      id
      scheduledDate
      scheduledStartTime
    }
  }
`;

const SUBMIT_REVIEW = gql`
  mutation SubmitReviewMobile($input: SubmitReviewInput!) {
    submitReview(input: $input) {
      id
      rating
      comment
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

interface BookingCompany {
  id: string;
  companyName: string;
}

interface BookingWorker {
  id: string;
  fullName: string;
}

interface BookingReview {
  id: string;
  rating: number;
  comment: string | null;
}

interface BookingDetail {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  estimatedDurationHours: number | null;
  propertyType: string | null;
  numRooms: number;
  numBathrooms: number;
  areaSqm: number | null;
  hasPets: boolean | null;
  specialInstructions: string | null;
  hourlyRate: number | null;
  estimatedTotal: number | null;
  finalTotal: number | null;
  status: string;
  paymentStatus: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  address: BookingAddress | null;
  company: BookingCompany | null;
  worker: BookingWorker | null;
  review: BookingReview | null;
}

interface BookingDetailData {
  booking: BookingDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Creat' },
  { key: 'ASSIGNED', label: 'Alocat' },
  { key: 'CONFIRMED', label: 'Confirmat' },
  { key: 'IN_PROGRESS', label: 'In desfasurare' },
  { key: 'COMPLETED', label: 'Finalizat' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  ASSIGNED: 1,
  CONFIRMED: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toFixed(2)} RON`;
}

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

function isCancelled(status: string): boolean {
  return status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_COMPANY';
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

function TimelineSection({ booking }: { booking: BookingDetail }) {
  const currentOrder = STATUS_ORDER[booking.status] ?? -1;
  const cancelled = isCancelled(booking.status);

  if (cancelled) {
    return (
      <PlatformCard style={styles.card}>
        <SectionTitle label="Stare rezervare" />
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledText}>Rezervare anulata</Text>
          {booking.cancellationReason ? (
            <Text style={styles.cancelledReason}>
              Motiv: {booking.cancellationReason}
            </Text>
          ) : null}
          {booking.cancelledAt ? (
            <Text style={styles.cancelledDate}>
              La: {formatDate(booking.cancelledAt)} {formatTime(booking.cancelledAt)}
            </Text>
          ) : null}
        </View>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard style={styles.card}>
      <SectionTitle label="Progres rezervare" />
      <View style={styles.timeline}>
        {TIMELINE_STEPS.map((step, idx) => {
          const stepOrder = STATUS_ORDER[step.key] ?? 0;
          const isCompleted = stepOrder < currentOrder;
          const isActive = step.key === booking.status;
          const isLast = idx === TIMELINE_STEPS.length - 1;
          return (
            <View key={step.key} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotDone,
                    isActive && styles.timelineDotActive,
                  ]}
                />
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineDone,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    isActive && styles.timelineLabelActive,
                    isCompleted && styles.timelineLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </PlatformCard>
  );
}

function ReviewSection({
  bookingId,
  onReviewSubmitted,
}: {
  bookingId: string;
  onReviewSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [submitReview, { loading }] = useMutation(SUBMIT_REVIEW, {
    onCompleted: () => {
      onReviewSubmitted();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit() {
    setError(null);
    if (rating < 1) {
      setError('Te rugam sa selectezi un numar de stele.');
      return;
    }
    submitReview({
      variables: {
        input: {
          bookingId,
          rating,
          comment: comment.trim() || null,
        },
      },
    });
  }

  return (
    <PlatformCard style={styles.card}>
      <SectionTitle label="Lasa o recenzie" />
      <View style={styles.reviewStars}>
        <StarRating value={rating} onChange={setRating} size={36} />
      </View>
      <TextInput
        style={styles.reviewInput}
        placeholder="Comentariu optional..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
        value={comment}
        onChangeText={setComment}
        textAlignVertical="top"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        label="Trimite recenzia"
        onPress={handleSubmit}
        loading={loading}
        fullWidth
      />
    </PlatformCard>
  );
}

function CancelModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Anuleaza rezervarea</Text>
          <Text style={styles.modalSubtitle}>
            Specifica motivul anularii (optional):
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Ex: program schimbat, nu mai am nevoie..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            value={reason}
            onChangeText={setReason}
            textAlignVertical="top"
          />
          <View style={styles.modalActions}>
            <Button
              label="Renunta"
              variant="ghost"
              onPress={onClose}
              style={styles.modalBtn}
            />
            <Button
              label="Confirma anularea"
              variant="danger"
              onPress={() => onConfirm(reason)}
              loading={loading}
              style={styles.modalBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showCancel, setShowCancel] = useState(false);

  const { data, loading, error, refetch } = useQuery<BookingDetailData>(
    BOOKING_DETAIL,
    { variables: { id }, fetchPolicy: 'cache-and-network' }
  );

  const [cancelBooking, { loading: cancelLoading }] = useMutation(
    CANCEL_BOOKING,
    {
      onCompleted: () => {
        setShowCancel(false);
        refetch();
      },
      onError: (err) => {
        Alert.alert('Eroare', err.message);
      },
    }
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data?.booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error?.message ?? 'Rezervarea nu a fost gasita.'}
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
  const canCancel =
    booking.status === 'ASSIGNED' || booking.status === 'CONFIRMED';
  const needsPayment =
    booking.status === 'CONFIRMED' && booking.paymentStatus !== 'PAID';
  const canReview = booking.status === 'COMPLETED' && !booking.review;
  const hasDispute = booking.status === 'COMPLETED'; // simplified — server would have dispute flag

  const displayTotal =
    booking.finalTotal != null ? booking.finalTotal : booking.estimatedTotal;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>{'‹ Inapoi'}</Text>
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
            <Text style={styles.serviceName}>
              {booking.serviceName ?? formatServiceType(booking.serviceType)}
            </Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        {/* Timeline */}
        <TimelineSection booking={booking} />

        {/* Date & Details */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Detalii programare" />
          <DetailRow
            label="Data"
            value={formatDate(booking.scheduledDate)}
          />
          {booking.scheduledStartTime ? (
            <DetailRow label="Ora" value={booking.scheduledStartTime} />
          ) : null}
          {booking.estimatedDurationHours != null ? (
            <DetailRow
              label="Durata estimata"
              value={`${booking.estimatedDurationHours} ore`}
            />
          ) : null}
          {booking.address ? (
            <DetailRow
              label="Adresa"
              value={[
                booking.address.streetAddress,
                booking.address.floor
                  ? `Etaj ${booking.address.floor}`
                  : null,
                booking.address.apartment
                  ? `Ap. ${booking.address.apartment}`
                  : null,
                booking.address.city,
                booking.address.county,
              ]
                .filter(Boolean)
                .join(', ')}
            />
          ) : null}
          {booking.company ? (
            <DetailRow label="Firma" value={booking.company.companyName} />
          ) : null}
          {booking.worker ? (
            <DetailRow label="Curatitor" value={booking.worker.fullName} />
          ) : null}
        </PlatformCard>

        {/* Property info */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Proprietate" />
          {booking.propertyType ? (
            <DetailRow
              label="Tip"
              value={
                booking.propertyType === 'apartment' ? 'Apartament' : 'Casa'
              }
            />
          ) : null}
          <DetailRow label="Camere" value={String(booking.numRooms)} />
          <DetailRow label="Bai" value={String(booking.numBathrooms)} />
          {booking.areaSqm != null ? (
            <DetailRow label="Suprafata" value={`${booking.areaSqm} m²`} />
          ) : null}
          {booking.hasPets != null ? (
            <DetailRow
              label="Animale de companie"
              value={booking.hasPets ? 'Da' : 'Nu'}
            />
          ) : null}
          {booking.specialInstructions ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.detailLabel}>Instructiuni speciale</Text>
              <Text style={styles.instructionsText}>
                {booking.specialInstructions}
              </Text>
            </View>
          ) : null}
        </PlatformCard>

        {/* Price */}
        <PlatformCard style={styles.card}>
          <SectionTitle label="Pret" />
          {booking.hourlyRate != null ? (
            <DetailRow
              label="Tarif orar"
              value={formatPrice(booking.hourlyRate)}
            />
          ) : null}
          {booking.estimatedTotal != null ? (
            <DetailRow
              label="Total estimat"
              value={formatPrice(booking.estimatedTotal)}
            />
          ) : null}
          {booking.finalTotal != null ? (
            <DetailRow
              label="Total final"
              value={formatPrice(booking.finalTotal)}
            />
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>De platit</Text>
            <Text style={styles.totalValue}>{formatPrice(displayTotal)}</Text>
          </View>
          <View style={styles.paymentStatusRow}>
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
        </PlatformCard>

        {/* Existing review */}
        {booking.review ? (
          <PlatformCard style={styles.card}>
            <SectionTitle label="Recenzia ta" />
            <View style={styles.reviewRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Text
                  key={s}
                  style={{
                    fontSize: 20,
                    color:
                      s <= booking.review!.rating
                        ? colors.accent
                        : colors.border,
                  }}
                >
                  {'★'}
                </Text>
              ))}
            </View>
            {booking.review.comment ? (
              <Text style={styles.reviewCommentText}>
                {booking.review.comment}
              </Text>
            ) : null}
          </PlatformCard>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          {needsPayment && (
            <Button
              label="Plateste acum"
              onPress={() =>
                router.push(
                  `/(client)/payment/setup` as never
                )
              }
              fullWidth
              style={styles.actionBtn}
            />
          )}
          {canCancel && (
            <Button
              label="Anuleaza rezervarea"
              variant="danger"
              onPress={() => setShowCancel(true)}
              fullWidth
              style={styles.actionBtn}
            />
          )}
        </View>

        {/* Review section */}
        {canReview && (
          <ReviewSection
            bookingId={booking.id}
            onReviewSubmitted={refetch}
          />
        )}
      </ScrollView>

      {/* Cancel modal */}
      <CancelModal
        visible={showCancel}
        onClose={() => setShowCancel(false)}
        loading={cancelLoading}
        onConfirm={(reason) => {
          cancelBooking({
            variables: { id: booking.id, reason: reason.trim() || null },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.base },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { ...typography.bodyMedium, color: colors.primary },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleLeft: { flex: 1, marginRight: spacing.sm },
  refCode: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  serviceName: { ...typography.heading3, color: colors.textPrimary },
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
  instructionsBox: { gap: spacing.xs },
  instructionsText: { ...typography.small, color: colors.textPrimary },
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
  totalValue: {
    ...typography.heading3,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentStatusRow: {
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
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: spacing.md },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotDone: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  timelineLineDone: { backgroundColor: colors.secondary },
  timelineContent: { paddingBottom: spacing.md, flex: 1 },
  timelineLabel: { ...typography.small, color: colors.textSecondary, paddingTop: 2 },
  timelineLabelActive: { ...typography.smallMedium, color: colors.primary },
  timelineLabelDone: { color: colors.secondary },
  cancelledBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cancelledText: { ...typography.bodyMedium, color: '#991B1B' },
  cancelledReason: { ...typography.small, color: '#991B1B' },
  cancelledDate: { ...typography.caption, color: '#B91C1C' },
  actions: { gap: spacing.sm },
  actionBtn: {},
  reviewStars: { alignItems: 'center', paddingVertical: spacing.sm },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
  },
  reviewRow: { flexDirection: 'row', gap: spacing.xs },
  reviewCommentText: { ...typography.small, color: colors.textPrimary, fontStyle: 'italic' },
  errorText: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
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
    gap: spacing.md,
  },
  modalTitle: { ...typography.heading3, color: colors.textPrimary },
  modalSubtitle: { ...typography.small, color: colors.textSecondary },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1 },
});
