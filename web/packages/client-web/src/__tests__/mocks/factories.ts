/**
 * Central factory file for test data.
 * Shapes match what Apollo queries return for each domain.
 */

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface BookingAddress {
  streetAddress: string;
  city: string;
  county: string;
  floor?: string | null;
  apartment?: string | null;
  entryCode?: string | null;
  notes?: string | null;
}

export interface BookingWorker {
  id: string;
  fullName: string;
  user?: { id: string; avatarUrl?: string | null } | null;
}

export interface BookingReview {
  id: string;
  rating: number;
  ratingPunctuality?: number | null;
  ratingQuality?: number | null;
  ratingCommunication?: number | null;
  ratingValue?: number | null;
  comment?: string | null;
  status?: string | null;
  photos?: { id: string; photoUrl: string; sortOrder: number }[];
  createdAt: string;
}

export interface Booking {
  id: string;
  referenceCode: string;
  serviceType: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  estimatedTotal: number;
  finalTotal?: number | null;
  status: string;
  paymentStatus?: string | null;
  paidAt?: string | null;
  specialInstructions?: string | null;
  propertyType?: string | null;
  numRooms: number;
  numBathrooms: number;
  areaSqm?: number | null;
  hasPets?: boolean;
  recurringGroupId?: string | null;
  occurrenceNumber?: number | null;
  rescheduleCount?: number | null;
  rescheduledAt?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  address: BookingAddress;
  worker?: BookingWorker | null;
  includedItems: string[];
  extras: {
    extra: {
      id: string;
      nameRo: string;
      nameEn: string;
      price: number;
      durationMinutes: number;
      icon?: string;
      allowMultiple: boolean;
      unitLabel?: string | null;
    };
    price: number;
    quantity: number;
  }[];
  review?: BookingReview | null;
  photos?: { id: string; photoUrl: string; phase: string; sortOrder: number }[];
}

export const makeBooking = (overrides?: Partial<Booking>): Booking => ({
  id: 'booking-1',
  referenceCode: 'G2F-2026-0001',
  serviceType: 'STANDARD_CLEANING',
  serviceName: 'Curatenie standard',
  scheduledDate: '2026-04-10',
  scheduledStartTime: '10:00',
  estimatedDurationHours: 3,
  estimatedTotal: 200,
  finalTotal: null,
  status: 'CONFIRMED',
  paymentStatus: null,
  paidAt: null,
  specialInstructions: null,
  propertyType: 'APARTMENT',
  numRooms: 2,
  numBathrooms: 1,
  areaSqm: 60,
  hasPets: false,
  recurringGroupId: null,
  occurrenceNumber: null,
  rescheduleCount: 0,
  rescheduledAt: null,
  createdAt: '2026-04-01T08:00:00Z',
  startedAt: null,
  completedAt: null,
  address: {
    streetAddress: 'Str. Florilor 10',
    city: 'Bucuresti',
    county: 'Ilfov',
    floor: '2',
    apartment: '5',
    entryCode: null,
    notes: null,
  },
  worker: null,
  includedItems: ['Aspirat', 'Sters praf', 'Curatenie baie'],
  extras: [],
  review: null,
  photos: [],
  ...overrides,
});

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  role: string;
  status: string;
  preferredLanguage?: string | null;
  createdAt: string;
}

export const makeUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'maria@example.com',
  fullName: 'Maria Popescu',
  phone: '0722123456',
  phoneVerified: true,
  avatarUrl: null,
  role: 'CLIENT',
  status: 'ACTIVE',
  preferredLanguage: 'ro',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ─── Worker ──────────────────────────────────────────────────────────────────

export interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  ratingAvg?: number | null;
  totalJobsCompleted?: number;
  user?: { id: string; avatarUrl?: string | null } | null;
  company?: { id: string; companyName: string } | null;
}

export const makeWorker = (overrides?: Partial<Worker>): Worker => ({
  id: 'worker-1',
  fullName: 'Ion Popescu',
  email: 'ion@example.com',
  phone: '0733111222',
  status: 'ACTIVE',
  ratingAvg: 4.8,
  totalJobsCompleted: 24,
  user: { id: 'u-worker-1', avatarUrl: null },
  company: { id: 'company-1', companyName: 'Clean Pro SRL' },
  ...overrides,
});

// ─── PromoCode ────────────────────────────────────────────────────────────────

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usesCount: number;
  maxUsesPerUser: number;
  isActive: boolean;
  activeFrom: string;
  activeUntil: string | null;
  createdAt: string;
}

export const makePromoCode = (overrides?: Partial<PromoCode>): PromoCode => ({
  id: 'promo-1',
  code: 'SPRING25',
  description: 'Campanie primavara 2025',
  discountType: 'percent',
  discountValue: 25,
  minOrderAmount: 0,
  maxUses: 100,
  usesCount: 5,
  maxUsesPerUser: 1,
  isActive: true,
  activeFrom: '2026-03-01',
  activeUntil: '2026-06-30',
  createdAt: '2026-03-01T00:00:00Z',
  ...overrides,
});
