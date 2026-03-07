import { gql } from '@apollo/client';

// ─── Page Info ───────────────────────────────────────────────────────────────

export const PAGE_INFO_FIELDS = gql`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    endCursor
  }
`;

// ─── User ────────────────────────────────────────────────────────────────────

export const USER_CORE_FIELDS = gql`
  fragment UserCoreFields on User {
    id
    fullName
    email
    phone
    avatarUrl
    role
    status
  }
`;

// ─── Address ─────────────────────────────────────────────────────────────────

export const ADDRESS_FIELDS = gql`
  fragment AddressFields on Address {
    id
    label
    streetAddress
    city
    county
    postalCode
    floor
    apartment
    entryCode
    notes
    latitude
    longitude
    isDefault
  }
`;

export const ADDRESS_SUMMARY_FIELDS = gql`
  fragment AddressSummaryFields on Address {
    streetAddress
    city
    county
    floor
    apartment
  }
`;

// ─── Booking ──────────────────────────────────────────────────────────────────

export const BOOKING_LIST_FIELDS = gql`
  fragment BookingListFields on Booking {
    id
    referenceCode
    serviceType
    serviceName
    scheduledDate
    scheduledStartTime
    estimatedTotal
    status
    recurringGroupId
    createdAt
  }
`;

export const BOOKING_DETAIL_FIELDS = gql`
  fragment BookingDetailFields on Booking {
    id
    referenceCode
    serviceType
    serviceName
    categoryId
    category {
      id
      slug
      nameRo
      nameEn
      icon
    }
    includedItems
    scheduledDate
    scheduledStartTime
    estimatedDurationHours
    estimatedTotal
    finalTotal
    hourlyRate
    platformCommissionPct
    status
    specialInstructions
    propertyType
    numRooms
    numBathrooms
    areaSqm
    hasPets
    paymentStatus
    paidAt
    recurringGroupId
    subscriptionId
    occurrenceNumber
    rescheduleCount
    rescheduledAt
    startedAt
    completedAt
    cancelledAt
    cancellationReason
    createdAt
    promoCodeId
    promoDiscountAmount
  }
`;

// ─── Worker ───────────────────────────────────────────────────────────────────

export const WORKER_LIST_FIELDS = gql`
  fragment WorkerListFields on WorkerProfile {
    id
    fullName
    status
    ratingAvg
    totalJobsCompleted
    serviceCategories {
      id
      slug
      nameRo
      nameEn
      icon
    }
  }
`;

export const WORKER_SUMMARY_FIELDS = gql`
  fragment WorkerSummaryFields on WorkerProfile {
    id
    fullName
    user {
      id
      avatarUrl
    }
  }
`;

// ─── Review ───────────────────────────────────────────────────────────────────

export const REVIEW_FIELDS = gql`
  fragment ReviewFields on Review {
    id
    rating
    ratingPunctuality
    ratingQuality
    ratingCommunication
    ratingValue
    comment
    status
    createdAt
  }
`;
