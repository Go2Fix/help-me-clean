import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { loadStripe } from '@stripe/stripe-js';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Home,
  Calendar,
  MapPin,
  ClipboardList,
  PawPrint,
  Plus,
  Minus,
  CheckCircle2,
  ArrowRight,
  LogIn,
  Users,
  Building2,
  Briefcase,
  Refrigerator,
  CookingPot,
  Shirt,
  SquareStack,
  UtensilsCrossed,
  Archive,
  Clock,
  X,
  Star,
  AlertCircle,
  CreditCard,
  Loader2,
  Repeat,
  Mail,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AddressAutocomplete, { type ParsedAddress } from '@/components/ui/AddressAutocomplete';
import AddCardModal from '@/components/payment/AddCardModal';
import EmailOtpModal from '@/components/auth/EmailOtpModal';
import {
  AVAILABLE_SERVICES,
  AVAILABLE_EXTRAS,
  ESTIMATE_PRICE,
  CREATE_BOOKING_REQUEST,
  MY_ADDRESSES,
  ACTIVE_CITIES,
  SUGGEST_CLEANERS,
  MY_PAYMENT_METHODS,
  CREATE_BOOKING_PAYMENT_INTENT,
} from '@/graphql/operations';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
);

// ---- Types ------------------------------------------------------------------

interface ServiceDefinition {
  id: string;
  serviceType: string;
  nameRo: string;
  descriptionRo: string;
  basePricePerHour: number;
  minHours: number;
  icon: string;
  isActive?: boolean;
  includedItems: string[];
}

interface ExtraDefinition {
  id: string;
  nameRo: string;
  nameEn: string;
  price: number;
  icon: string;
  isActive?: boolean;
  allowMultiple: boolean;
  unitLabel?: string | null;
}

interface SavedAddress {
  id: string;
  label?: string;
  streetAddress: string;
  city: string;
  county: string;
  floor?: string;
  apartment?: string;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { latitude: number; longitude: number } | null;
  isDefault: boolean;
}

interface PriceEstimate {
  hourlyRate: number;
  estimatedHours: number;
  propertyMultiplier: number;
  petsSurcharge: number;
  subtotal: number;
  extras: {
    extra: { nameRo: string; price: number };
    quantity: number;
    lineTotal: number;
  }[];
  total: number;
}

interface SelectedExtra {
  extraId: string;
  quantity: number;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

interface ActiveCity {
  id: string;
  name: string;
  county: string;
  isActive: boolean;
  areas: CityArea[];
}

interface CleanerSuggestion {
  cleaner: {
    id: string;
    fullName: string;
    user: {
      id: string;
      avatarUrl: string | null;
    };
    ratingAvg: number;
    totalJobsCompleted: number;
  };
  company: {
    id: string;
    companyName: string;
  };
  availabilityStatus: string;
  availableFrom: string | null;
  availableTo: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  suggestedSlotIndex: number | null;
  suggestedDate: string | null;
  matchScore: number;
}

interface SavedPaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  cardLastFour: string;
  cardBrand: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isDefault: boolean;
}

interface BookingFormState {
  serviceType: string;
  propertyType: string;
  numRooms: number;
  numBathrooms: number;
  areaSqm: string;
  hasPets: boolean;
  extras: SelectedExtra[];
  timeSlots: TimeSlot[];
  streetAddress: string;
  city: string;
  county: string;
  floor: string;
  apartment: string;
  latitude: number | null;
  longitude: number | null;
  useSavedAddress: string;
  selectedCityId: string;
  selectedAreaId: string;
  preferredCleanerId: string;
  suggestedStartTime: string;
  specialInstructions: string;
  isRecurring: boolean;
  recurrenceType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | '';
  recurrenceDayOfWeek: number;
}

// ---- Constants --------------------------------------------------------------

const STEPS_BASE = [
  { key: 'service', label: 'Serviciu', icon: Sparkles },
  { key: 'details', label: 'Detalii', icon: Home },
  { key: 'schedule', label: 'Programare', icon: Calendar },
  { key: 'address', label: 'Adresă', icon: MapPin },
  { key: 'cleaner', label: 'Curățător', icon: Users },
  { key: 'summary', label: 'Sumar', icon: ClipboardList },
  { key: 'payment', label: 'Plată', icon: CreditCard },
] as const;

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
};

const PROPERTY_TYPES: { value: string; label: string; icon: LucideIcon; badge: string | null }[] = [
  { value: 'Apartament', label: 'Apartament', icon: Building2, badge: null },
  { value: 'Casa', label: 'Casa', icon: Home, badge: 'x1.3' },
  { value: 'Birou', label: 'Birou', icon: Briefcase, badge: null },
];

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '\uD83E\uDDF9',
  DEEP_CLEANING: '\u2728',
  MOVE_IN_OUT_CLEANING: '\uD83D\uDCE6',
  POST_CONSTRUCTION: '\uD83C\uDFD7\uFE0F',
  OFFICE_CLEANING: '\uD83C\uDFE2',
  WINDOW_CLEANING: '\uD83E\uDE9F',
};

const EXTRA_ICON_MAP: Record<string, LucideIcon> = {
  fridge: Refrigerator,
  oven: CookingPot,
  iron: Shirt,
  window: SquareStack,
  dishes: UtensilsCrossed,
  closet: Archive,
};


const NEXT_STEP_LABELS: Record<string, string> = {
  service: 'Detalii proprietate',
  details: 'Alege data și ora',
  schedule: 'Adresa de curățenie',
  address: 'Alege curățătorul',
  cleaner: 'Sumar și confirmare',
  summary: 'Plată',
};

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

const MONTH_NAMES_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

// ---- Helpers ----------------------------------------------------------------

function getExtraIcon(iconField: string): LucideIcon {
  if (!iconField) return Sparkles;
  const lower = iconField.toLowerCase();
  for (const [key, Icon] of Object.entries(EXTRA_ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Sparkles;
}

function getInitialColor(name: string): string {
  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600',
    'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateRo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = MONTH_NAMES_RO[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${padTwo(m + 1)}-${padTwo(d)}`;
}

function minutesToTime(mins: number): string {
  return `${padTwo(Math.floor(mins / 60))}:${padTwo(mins % 60)}`;
}

// ---- Component --------------------------------------------------------------

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, loginWithGoogle } = useAuth();

  const preselectedService = searchParams.get('service') || '';

  const [currentStep, setCurrentStep] = useState(preselectedService ? 1 : 0);
  const [bookingResult, setBookingResult] = useState<{
    referenceCode: string;
    id: string;
    recurringGroupId?: string;
  } | null>(null);

  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Payment step state
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Dynamic steps: authenticated users get a Payment step; guests don't
  const STEPS = useMemo(() => {
    if (!isAuthenticated) return STEPS_BASE.filter((s) => s.key !== 'payment');
    return [...STEPS_BASE];
  }, [isAuthenticated]);

  const [form, setForm] = useState<BookingFormState>({
    serviceType: preselectedService,
    propertyType: 'Apartament',
    numRooms: 2,
    numBathrooms: 1,
    areaSqm: '',
    hasPets: false,
    extras: [],
    timeSlots: [],
    streetAddress: '',
    city: '',
    county: '',
    floor: '',
    apartment: '',
    latitude: null,
    longitude: null,
    useSavedAddress: '',
    selectedCityId: '',
    selectedAreaId: '',
    preferredCleanerId: '',
    suggestedStartTime: '',
    specialInstructions: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDayOfWeek: 1,
  });

  // ---- Data fetching --------------------------------------------------------

  const { data: servicesData, loading: servicesLoading } =
    useQuery(AVAILABLE_SERVICES, { fetchPolicy: 'cache-first' });

  const { data: extrasData } = useQuery(AVAILABLE_EXTRAS, {
    fetchPolicy: 'cache-first',
  });

  const { data: addressesData } = useQuery<{ myAddresses: SavedAddress[] }>(
    MY_ADDRESSES,
    { skip: !isAuthenticated },
  );

  // Payment methods (authenticated only)
  const { data: paymentMethodsData, refetch: refetchPaymentMethods } = useQuery<{
    myPaymentMethods: SavedPaymentMethod[];
  }>(MY_PAYMENT_METHODS, { skip: !isAuthenticated });
  const [createPaymentIntent] = useMutation(CREATE_BOOKING_PAYMENT_INTENT);
  const paymentMethods: SavedPaymentMethod[] = paymentMethodsData?.myPaymentMethods ?? [];

  const [fetchEstimate, { data: estimateData, loading: estimateLoading }] =
    useLazyQuery<{ estimatePrice: PriceEstimate }>(ESTIMATE_PRICE, {
      fetchPolicy: 'network-only',
    });

  const [createBooking, { loading: creating }] = useMutation(
    CREATE_BOOKING_REQUEST,
  );

  const services: ServiceDefinition[] = servicesData?.availableServices ?? [];
  const extras: ExtraDefinition[] = extrasData?.availableExtras ?? [];
  const savedAddresses: SavedAddress[] = addressesData?.myAddresses ?? [];
  const estimate = estimateData?.estimatePrice;

  // Auto-select first service when data loads and none is preselected
  useEffect(() => {
    if (!form.serviceType && services.length > 0) {
      setForm((prev) => ({ ...prev, serviceType: services[0].serviceType }));
    }
  }, [services, form.serviceType]);

  // ---- Reactive price estimation (debounced 400ms) --------------------------

  const estimateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerEstimate = useCallback(() => {
    if (!form.serviceType) return;
    if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    estimateTimerRef.current = setTimeout(() => {
      fetchEstimate({
        variables: {
          input: {
            serviceType: form.serviceType,
            numRooms: form.numRooms,
            numBathrooms: form.numBathrooms,
            areaSqm: parseInt(form.areaSqm, 10) || undefined,
            propertyType: form.propertyType || undefined,
            hasPets: form.hasPets,
            extras: form.extras.filter((e) => e.quantity > 0),
          },
        },
      });
    }, 400);
  }, [form.serviceType, form.numRooms, form.numBathrooms, form.areaSqm, form.propertyType, form.hasPets, form.extras, fetchEstimate]);

  useEffect(() => {
    triggerEstimate();
    return () => {
      if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    };
  }, [triggerEstimate]);

  // Auto-select default payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
      setSelectedPaymentMethodId(defaultMethod?.id ?? paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  // ---- Helpers --------------------------------------------------------------

  const updateForm = useCallback(
    (updates: Partial<BookingFormState>) => {
      setForm((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const selectedService = useMemo(
    () => services.find((s) => s.serviceType === form.serviceType),
    [services, form.serviceType],
  );

  const canProceed = useMemo(() => {
    const stepKey = STEPS[currentStep]?.key;
    switch (stepKey) {
      case 'service':
        return !!form.serviceType;
      case 'details':
        return form.numRooms >= 1 && form.numBathrooms >= 1 && !!form.areaSqm && parseInt(form.areaSqm, 10) > 0;
      case 'schedule':
        return form.timeSlots.length >= 1;
      case 'address':
        return !!form.useSavedAddress || (
          !!form.streetAddress.trim() &&
          !!form.selectedCityId &&
          !!form.selectedAreaId
        );
      case 'cleaner':
        return !!form.preferredCleanerId;
      case 'summary':
        return isAuthenticated;
      case 'payment':
        return !!selectedPaymentMethodId;
      default:
        return false;
    }
  }, [currentStep, STEPS, form, isAuthenticated, selectedPaymentMethodId]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, STEPS.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleToggleExtra = useCallback(
    (extraId: string, delta: number, allowMultiple: boolean) => {
      setForm((prev) => {
        const existing = prev.extras.find((e) => e.extraId === extraId);
        if (!allowMultiple) {
          // Toggle: active → remove, inactive → add with qty 1
          if (existing && existing.quantity > 0) {
            return { ...prev, extras: prev.extras.filter((e) => e.extraId !== extraId) };
          }
          return { ...prev, extras: [...prev.extras, { extraId, quantity: 1 }] };
        }
        // Quantity-based logic
        if (existing) {
          const newQty = Math.max(0, existing.quantity + delta);
          if (newQty === 0) {
            return {
              ...prev,
              extras: prev.extras.filter((e) => e.extraId !== extraId),
            };
          }
          return {
            ...prev,
            extras: prev.extras.map((e) =>
              e.extraId === extraId ? { ...e, quantity: newQty } : e,
            ),
          };
        }
        if (delta > 0) {
          return {
            ...prev,
            extras: [...prev.extras, { extraId, quantity: 1 }],
          };
        }
        return prev;
      });
    },
    [],
  );

  const handleSubmitBooking = useCallback(async () => {
    try {
      const input: Record<string, unknown> = {
        serviceType: form.serviceType,
        scheduledDate: form.timeSlots[0]?.date,
        scheduledStartTime: form.timeSlots[0]?.startTime,
        timeSlots: form.timeSlots.map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        propertyType: form.propertyType || undefined,
        numRooms: form.numRooms,
        numBathrooms: form.numBathrooms,
        areaSqm: parseInt(form.areaSqm, 10) || undefined,
        hasPets: form.hasPets,
        specialInstructions: form.specialInstructions || undefined,
        extras: form.extras.filter((e) => e.quantity > 0),
        preferredCleanerId: form.preferredCleanerId || undefined,
        suggestedStartTime: form.suggestedStartTime || undefined,
        ...(form.isRecurring && form.recurrenceType ? {
          recurrence: {
            type: form.recurrenceType,
            dayOfWeek: form.recurrenceDayOfWeek,
          },
        } : {}),
      };

      if (form.useSavedAddress) {
        input.addressId = form.useSavedAddress;
      } else {
        input.address = {
          streetAddress: form.streetAddress,
          city: form.city,
          county: form.county,
          floor: form.floor || undefined,
          apartment: form.apartment || undefined,
          latitude: form.latitude,
          longitude: form.longitude,
        };
      }

      const { data } = await createBooking({ variables: { input } });
      setBookingResult({
        referenceCode: data.createBookingRequest.referenceCode,
        id: data.createBookingRequest.id,
        recurringGroupId: data.createBookingRequest.recurringGroupId,
      });
    } catch (err) {
      console.error('Booking creation failed:', err);
    }
  }, [form, createBooking]);

  const buildBookingInput = useCallback(() => {
    const input: Record<string, unknown> = {
      serviceType: form.serviceType,
      scheduledDate: form.timeSlots[0]?.date,
      scheduledStartTime: form.timeSlots[0]?.startTime,
      timeSlots: form.timeSlots.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      propertyType: form.propertyType || undefined,
      numRooms: form.numRooms,
      numBathrooms: form.numBathrooms,
      areaSqm: parseInt(form.areaSqm, 10) || undefined,
      hasPets: form.hasPets,
      specialInstructions: form.specialInstructions || undefined,
      extras: form.extras.filter((e) => e.quantity > 0),
      preferredCleanerId: form.preferredCleanerId || undefined,
      suggestedStartTime: form.suggestedStartTime || undefined,
      ...(form.isRecurring && form.recurrenceType ? {
        recurrence: {
          type: form.recurrenceType,
          dayOfWeek: form.recurrenceDayOfWeek,
        },
      } : {}),
    };
    if (form.useSavedAddress) {
      input.addressId = form.useSavedAddress;
    } else {
      input.address = {
        streetAddress: form.streetAddress,
        city: form.city,
        county: form.county,
        floor: form.floor || undefined,
        apartment: form.apartment || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
      };
    }
    return input;
  }, [form]);

  const handlePayAndBook = useCallback(async () => {
    if (!selectedPaymentMethodId) return;

    // Look up the Stripe payment method ID (pm_xxx) for the selected card
    const selectedPm = paymentMethods.find((pm) => pm.id === selectedPaymentMethodId);
    const stripePmId = selectedPm?.stripePaymentMethodId;
    if (!stripePmId) {
      setPaymentError('Metoda de plata selectata nu este valida. Te rugam sa selectezi alta.');
      return;
    }

    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      // 1. Create booking
      const input = buildBookingInput();
      const { data } = await createBooking({ variables: { input } });
      const bookingId = data.createBookingRequest.id;
      const refCode = data.createBookingRequest.referenceCode;
      const recurringGrpId = data.createBookingRequest.recurringGroupId;

      // 2. Create PaymentIntent
      try {
        const { data: piData } = await createPaymentIntent({
          variables: { bookingId },
        });
        const { clientSecret } = piData.createBookingPaymentIntent;

        // 3. Confirm payment with saved card (use Stripe pm_xxx ID, not internal UUID)
        const stripe = await stripePromise;
        if (!stripe) {
          setPaymentError('Stripe nu s-a incarcat. Poti plati ulterior din pagina comenzii.');
          setBookingResult({ referenceCode: refCode, id: bookingId, recurringGroupId: recurringGrpId });
          return;
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: stripePmId },
        );

        if (stripeError) {
          setPaymentError(
            `Plata a esuat: ${stripeError.message}. Rezervarea ${refCode} a fost creata. Poti plati ulterior din pagina comenzii.`,
          );
          setBookingResult({ referenceCode: refCode, id: bookingId, recurringGroupId: recurringGrpId });
        } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
          setBookingResult({ referenceCode: refCode, id: bookingId, recurringGroupId: recurringGrpId });
        }
      } catch {
        setPaymentError(
          `Rezervarea ${refCode} a fost creata, dar plata nu a putut fi initiata. Poti plati ulterior din pagina comenzii.`,
        );
        setBookingResult({ referenceCode: refCode, id: bookingId, recurringGroupId: recurringGrpId });
      }
    } catch (err) {
      console.error('Booking creation failed:', err);
      setPaymentError('Crearea rezervarii a esuat. Te rugam sa incerci din nou.');
    } finally {
      setPaymentProcessing(false);
    }
  }, [selectedPaymentMethodId, paymentMethods, buildBookingInput, createBooking, createPaymentIntent]);

  // ---- Auth handlers --------------------------------------------------------

  const handleBookingGoogleSuccess = useCallback(
    async (response: CredentialResponse) => {
      if (!response.credential) {
        setAuthError('Autentificarea Google a eșuat.');
        return;
      }
      setAuthError('');
      setAuthLoading(true);
      try {
        await loginWithGoogle(response.credential);
      } catch {
        setAuthError('Autentificarea a eșuat. Te rugăm să încerci din nou.');
      } finally {
        setAuthLoading(false);
      }
    },
    [loginWithGoogle],
  );

  // ---- Success screen -------------------------------------------------------

  if (bookingResult) {
    const hasPaymentError = !!paymentError;
    return (
      <div className="min-h-[50vh] sm:min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-md">
          <div className="relative w-24 h-24 mx-auto mb-6">
            {hasPaymentError ? (
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <AlertCircle className="h-12 w-12 text-white" />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 animate-bounce" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="absolute top-0 -left-4 w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                <div className="absolute -bottom-2 right-0 w-3 h-3 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {hasPaymentError ? 'Rezervare creată, plată în așteptare' : 'Rezervare confirmată!'}
          </h1>
          <p className="text-gray-500 mb-4">
            {hasPaymentError
              ? paymentError
              : 'Rezervarea ta a fost confirmată. Curățătorul a fost notificat!'}
          </p>
          <div className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xl font-mono font-bold text-gray-900 mb-4 tracking-wider',
            hasPaymentError
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
              : 'bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100',
          )}>
            {bookingResult.referenceCode}
          </div>
          {bookingResult.recurringGroupId && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 mb-4 text-sm text-blue-800">
              <Repeat className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Serie recurentă creată — 8 programări au fost generate automat.</span>
            </div>
          )}
          <p className="text-sm text-gray-400 mb-8">
            {hasPaymentError
              ? 'Poți plăti din pagina comenzii tale.'
              : bookingResult.recurringGroupId
                ? 'Gestionează seria recurentă din pagina Comenzile mele.'
                : 'Poți comunica cu curățătorul prin chat din pagina comenzii.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated && (
              <>
                <Button onClick={() => navigate(`/cont/comenzi/${bookingResult.id}`)}>
                  {hasPaymentError ? 'Plătește acum' : 'Vezi comenzile mele'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {bookingResult.recurringGroupId && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/cont/recurente/${bookingResult.recurringGroupId}`)}
                  >
                    <Repeat className="h-4 w-4" />
                    Vezi seria recurenta
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={() => navigate('/')}>
              Înapoi la pagina principală
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Render ----------------------------------------------------------

  return (
    <div className="py-8 sm:py-12 pb-28 lg:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">Rezervare</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-blue-600 font-medium">{STEPS[currentStep]?.label}</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Curățători verificați
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Plată securizată
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Garanție satisfacție
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} steps={STEPS} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
            {STEPS[currentStep]?.key === 'service' && (
              <StepService
                services={services}
                loading={servicesLoading}
                selected={form.serviceType}
                onSelect={(type) => updateForm({ serviceType: type })}
              />
            )}

            {STEPS[currentStep]?.key === 'details' && (
              <StepDetails
                form={form}
                updateForm={updateForm}
                extras={extras}
                selectedExtras={form.extras}
                onToggleExtra={handleToggleExtra}
                selectedService={selectedService}
                estimatedHours={estimate?.estimatedHours}
              />
            )}

            {STEPS[currentStep]?.key === 'schedule' && (
              <StepSchedule
                form={form}
                updateForm={updateForm}
                estimatedHours={estimate?.estimatedHours}
                minHours={selectedService?.minHours}
              />
            )}

            {STEPS[currentStep]?.key === 'address' && (
              <StepAddress
                form={form}
                updateForm={updateForm}
                savedAddresses={savedAddresses}
                isAuthenticated={isAuthenticated}
                onGoogleLogin={handleBookingGoogleSuccess}
              />
            )}

            {STEPS[currentStep]?.key === 'cleaner' && (
              <StepCleaner
                form={form}
                updateForm={updateForm}
                estimatedHours={estimate?.estimatedHours}
                minHours={selectedService?.minHours}
              />
            )}

            {STEPS[currentStep]?.key === 'summary' && (
              <>
                {/* Auth gate */}
                {!isAuthenticated && (
                  <Card className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <LogIn className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Autentificare necesară
                        </h3>
                        <p className="text-sm text-gray-500">
                          Pentru a finaliza rezervarea, te rugăm să te autentifici.
                        </p>
                      </div>
                    </div>

                    {authLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <GoogleLogin
                          onSuccess={handleBookingGoogleSuccess}
                          onError={() =>
                            setAuthError('Autentificarea Google a eșuat.')
                          }
                          theme="outline"
                          size="large"
                          text="signin_with"
                          shape="rectangular"
                          width="300"
                        />

                        {/* Divider */}
                        <div className="flex items-center gap-3 w-full max-w-[300px]">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400">sau</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowOtpModal(true)}
                          className="w-full max-w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          Continuă cu email
                        </button>
                      </div>
                    )}

                    {authError && (
                      <div className="mt-4 p-3 rounded-xl bg-red-50 text-sm text-red-700">
                        {authError}
                      </div>
                    )}

                    <EmailOtpModal
                      open={showOtpModal}
                      onClose={() => setShowOtpModal(false)}
                      onSuccess={() => {/* auth state updates automatically via authService */}}
                      role="CLIENT"
                    />
                  </Card>
                )}

                <StepSummary
                  form={form}
                  updateForm={updateForm}
                  selectedService={selectedService}
                  estimate={estimate}
                  estimateLoading={estimateLoading}
                  extras={extras}
                  savedAddresses={savedAddresses}
                  isAuthenticated={isAuthenticated}
                  userName={user?.fullName}
                />
              </>
            )}

            {STEPS[currentStep]?.key === 'payment' && (
              <div className="space-y-6">
                {/* Price reminder */}
                {estimate && (
                  <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total de plată</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {estimate.total} RON
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Saved cards */}
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-4">Selectează metoda de plată</h3>

                  {paymentMethods.length > 0 ? (
                    <div className="space-y-3">
                      {paymentMethods.map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethodId(pm.id)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                            selectedPaymentMethodId === pm.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            selectedPaymentMethodId === pm.id ? 'border-primary' : 'border-gray-300',
                          )}>
                            {selectedPaymentMethodId === pm.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {BRAND_LABELS[pm.cardBrand?.toLowerCase()] ?? pm.cardBrand}
                              </span>
                              <span className="text-gray-500">
                                •••• {pm.cardLastFour}
                              </span>
                              {pm.isDefault && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  Implicit
                                </span>
                              )}
                            </div>
                            {pm.cardExpMonth && pm.cardExpYear && (
                              <p className="text-sm text-gray-400 mt-0.5">
                                Expira {String(pm.cardExpMonth).padStart(2, '0')}/{pm.cardExpYear}
                              </p>
                            )}
                          </div>
                          <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-1">Niciun card salvat</p>
                      <p className="text-sm text-gray-400">
                        Adauga un card pentru a putea plati.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddCardModal(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Adaugă un card nou
                  </button>
                </Card>

                {/* Payment error */}
                {paymentError && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{paymentError}</p>
                  </div>
                )}

                {/* Security note */}
                <p className="text-xs text-gray-400 text-center">
                  Plățile sunt procesate securizat prin Stripe. Datele cardului tău nu sunt stocate pe serverele noastre.
                </p>

                {/* Add card modal */}
                <AddCardModal
                  open={showAddCardModal}
                  onClose={() => setShowAddCardModal(false)}
                  onSuccess={() => {
                    refetchPaymentMethods();
                    setShowAddCardModal(false);
                  }}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8">
              {currentStep > 0 ? (
                <Button variant="ghost" onClick={handleBack} disabled={paymentProcessing} className="w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4" />
                  Înapoi
                </Button>
              ) : (
                <div className="hidden sm:block" />
              )}

              {currentStep < STEPS.length - 1 ? (
                <div className="flex flex-col items-stretch sm:items-end gap-1">
                  <Button onClick={handleNext} disabled={!canProceed} className="w-full sm:w-auto">
                    Continuă
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {NEXT_STEP_LABELS[STEPS[currentStep]?.key] && (
                    <p className="text-xs text-gray-400 text-center sm:text-right">
                      Pasul următor: {NEXT_STEP_LABELS[STEPS[currentStep].key]}
                    </p>
                  )}
                </div>
              ) : STEPS[currentStep]?.key === 'payment' ? (
                <Button
                  onClick={handlePayAndBook}
                  loading={paymentProcessing}
                  disabled={!canProceed || paymentProcessing}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {paymentProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Se procesează...
                    </>
                  ) : (
                    <>
                      Confirmă și plătește
                      <CreditCard className="h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitBooking}
                  loading={creating}
                  disabled={!canProceed}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Confirmă rezervarea
                  <Check className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar: Price estimate (desktop only) */}
          <div className="hidden lg:block lg:col-span-2">
            <PriceSidebar
              form={form}
              selectedService={selectedService}
              extras={extras}
              estimate={estimate}
              estimateLoading={estimateLoading}
            />
          </div>
        </div>

        {/* Mobile price footer */}
        <MobilePriceFooter
          form={form}
          selectedService={selectedService}
          estimate={estimate}
          estimateLoading={estimateLoading}
          extras={extras}
        />
      </div>
    </div>
  );
}

// ---- Step Indicator ---------------------------------------------------------

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: readonly { key: string; label: string; icon: LucideIcon }[] }) {
  const CurrentIcon = steps[currentStep]?.icon;

  return (
    <>
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {CurrentIcon && <CurrentIcon className="h-4 w-4 text-blue-600" />}
            <span className="text-sm font-semibold text-gray-900">
              {steps[currentStep]?.label}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < currentStep ? 'bg-emerald-500' : i === currentStep ? 'bg-blue-600' : 'bg-gray-200',
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop: full step indicator with icons and labels */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
                    isCompleted && 'bg-emerald-500 text-white',
                    isCurrent && 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
                    !isCompleted && !isCurrent && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-medium',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-emerald-500' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-10 h-0.5 mx-2 rounded-full mb-5',
                    index < currentStep ? 'bg-emerald-500' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---- Step 0: Service Selection ----------------------------------------------

function StepService({
  services,
  loading,
  selected,
  onSelect,
}: {
  services: ServiceDefinition[];
  loading: boolean;
  selected: string;
  onSelect: (type: string) => void;
}) {
  if (loading) {
    return <LoadingSpinner text="Se încarcă serviciile..." />;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Alege tipul de curățenie
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Selectează serviciul potrivit nevoilor tale.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((service) => {
          const isSelected = selected === service.serviceType;
          const isRecommended = service.serviceType === 'STANDARD_CLEANING';
          const includedItems = service.includedItems ?? [];
          return (
            <Card
              key={service.id}
              className={cn(
                'cursor-pointer transition-all relative',
                isSelected
                  ? 'ring-2 ring-blue-600 border-blue-600 shadow-md shadow-blue-600/10'
                  : 'hover:shadow-md hover:border-gray-300',
              )}
              onClick={() => onSelect(service.serviceType)}
            >
              {isRecommended && (
                <div className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Recomandat
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">
                    {SERVICE_ICONS[service.serviceType] || service.icon || '\uD83E\uDDF9'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {service.nameRo}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-blue-600">
                        {service.basePricePerHour} lei
                      </span>
                      <span className="text-xs text-gray-400">/oră</span>
                      <span className="text-xs text-gray-400 ml-1">
                        · min. {service.minHours} ore
                      </span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 ml-2">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              {includedItems.length > 0 && (
                <ul className="space-y-1">
                  {includedItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        Prețul final depinde de suprafața și durata efectivă a lucrării.
      </p>
    </div>
  );
}

// ---- Step 1: Details --------------------------------------------------------

function StepDetails({
  form,
  updateForm,
  extras,
  selectedExtras,
  onToggleExtra,
  selectedService,
  estimatedHours,
}: {
  form: BookingFormState;
  updateForm: (updates: Partial<BookingFormState>) => void;
  extras: ExtraDefinition[];
  selectedExtras: SelectedExtra[];
  onToggleExtra: (extraId: string, delta: number, allowMultiple: boolean) => void;
  selectedService?: ServiceDefinition;
  estimatedHours?: number;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Detalii proprietate
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Spune-ne mai multe despre spațiul care trebuie curățat.
      </p>
      {selectedService && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-6">
          <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>{selectedService.nameRo}</strong> pentru {form.propertyType.toLowerCase()} cu{' '}
            <strong>{form.numRooms} {form.numRooms === 1 ? 'cameră' : 'camere'}</strong>
            {estimatedHours ? (
              <> — estimăm <strong>~{estimatedHours} ore</strong>
              {form.areaSqm ? ` pentru ${form.areaSqm} m²` : ''}</>
            ) : (
              <> — completează detaliile pentru a vedea durata estimată</>
            )}.
          </p>
        </div>
      )}

      <Card className="space-y-6">
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tip proprietate
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PROPERTY_TYPES.map((pt) => {
              const Icon = pt.icon;
              const isSelected = form.propertyType === pt.value;
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => updateForm({ propertyType: pt.value })}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                    isSelected
                      ? 'border-blue-600 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      isSelected ? 'text-blue-600' : 'text-gray-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-blue-600' : 'text-gray-700',
                    )}
                  >
                    {pt.label}
                  </span>
                  {pt.badge && (
                    <span
                      className={cn(
                        'absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-md',
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {pt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rooms stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StepperField
            label="Numar camere"
            value={form.numRooms}
            min={1}
            max={10}
            onChange={(v) => updateForm({ numRooms: v })}
          />
          <StepperField
            label="Numar bai"
            value={form.numBathrooms}
            min={1}
            max={5}
            onChange={(v) => updateForm({ numBathrooms: v })}
          />
        </div>

        {/* Area */}
        <Input
          label="Suprafata (mp) *"
          type="number"
          placeholder="mp"
          value={form.areaSqm}
          onChange={(e) => updateForm({ areaSqm: e.target.value })}
          min={1}
        />

        {/* Pets toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Animale de companie
          </label>
          <button
            type="button"
            onClick={() => updateForm({ hasPets: !form.hasPets })}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer w-full sm:w-auto',
              form.hasPets
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300',
            )}
          >
            <PawPrint
              className={cn(
                'h-5 w-5',
                form.hasPets ? 'text-blue-600' : 'text-gray-400',
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                form.hasPets ? 'text-blue-600' : 'text-gray-700',
              )}
            >
              Am animale de companie
            </span>
            {form.hasPets && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md ml-auto">
                +15 lei
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* Extras */}
      {extras.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Servicii extra
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Adaugă servicii suplimentare la rezervarea ta.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {extras.map((extra) => {
              const sel = selectedExtras.find((e) => e.extraId === extra.id);
              const qty = sel?.quantity ?? 0;
              const ExtraIcon = getExtraIcon(extra.icon);

              if (!extra.allowMultiple) {
                // ── Toggle extra (single activation) ──────────────────────
                return (
                  <Card
                    key={extra.id}
                    className={cn(
                      'transition-all cursor-pointer',
                      qty > 0
                        ? 'ring-2 ring-blue-600/30 border-blue-600/40 shadow-sm shadow-blue-600/5'
                        : 'hover:border-gray-300',
                    )}
                    onClick={() => onToggleExtra(extra.id, 1, false)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            qty > 0 ? 'bg-blue-50' : 'bg-gray-50',
                          )}
                        >
                          <ExtraIcon
                            className={cn(
                              'h-5 w-5',
                              qty > 0 ? 'text-blue-600' : 'text-gray-400',
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {extra.nameRo}
                          </div>
                          <div className="text-sm text-blue-600 font-semibold">
                            +{extra.price} lei
                          </div>
                        </div>
                      </div>
                      {/* Checkbox circle */}
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                          qty > 0
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300',
                        )}
                      >
                        {qty > 0 && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  </Card>
                );
              }

              // ── Quantity extra (multiple units) ───────────────────────────
              return (
                <Card
                  key={extra.id}
                  className={cn(
                    'transition-all',
                    qty > 0 && 'ring-2 ring-blue-600/30 border-blue-600/40 shadow-sm shadow-blue-600/5',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          qty > 0 ? 'bg-blue-50' : 'bg-gray-50',
                        )}
                      >
                        <ExtraIcon
                          className={cn(
                            'h-5 w-5',
                            qty > 0 ? 'text-blue-600' : 'text-gray-400',
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {extra.nameRo}
                        </div>
                        <div className="text-xs text-gray-500">
                          {extra.unitLabel
                            ? `${extra.price} lei / ${extra.unitLabel}`
                            : `+${extra.price} lei`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => onToggleExtra(extra.id, -1, true)}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold text-blue-600 w-5 text-center">
                            {qty}
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleExtra(extra.id, 1, true)}
                        className={cn(
                          'w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer',
                          qty > 0
                            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                            : 'border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {qty > 0 && extra.unitLabel && (
                    <p className="text-xs text-blue-600 font-medium mt-2">
                      {qty} {extra.unitLabel}{qty > 1 ? 'uri' : ''}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Stepper Field ----------------------------------------------------------

function StepperField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-xl font-bold text-gray-900 w-10 text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---- Step 2: Schedule -------------------------------------------------------

function StepSchedule({
  form,
  updateForm,
  estimatedHours,
  minHours,
}: {
  form: BookingFormState;
  updateForm: (updates: Partial<BookingFormState>) => void;
  estimatedHours?: number;
  minHours?: number;
}) {
  const duration = estimatedHours ?? minHours ?? 2;

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Slider values: 0 = 08:00, 24 = 20:00, step = 30 min
  const minDurationSlots = Math.ceil(duration * 2);
  const [startSlot, setStartSlot] = useState(0);
  const [endSlot, setEndSlot] = useState(() => Math.max(18, minDurationSlots)); // default 17:00

  // Dates that already have slots
  const slotDates = useMemo(
    () => new Set(form.timeSlots.map((s) => s.date)),
    [form.timeSlots],
  );

  // Calendar data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-based: 0=Mon..6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];

    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDateClick = useCallback((day: number) => {
    const ds = toDateString(viewYear, viewMonth, day);
    setSelectedDate(ds);
    setStartSlot(0);
    setEndSlot(Math.max(18, minDurationSlots));
  }, [viewYear, viewMonth, minDurationSlots]);

  const isDayPast = useCallback(
    (day: number) => {
      const d = new Date(viewYear, viewMonth, day);
      return d < today;
    },
    [viewYear, viewMonth, today],
  );

  // Convert slot index (0–24, step=1) to "HH:MM" string; 0 = 08:00, 24 = 20:00
  const slotToTime = (slot: number) => minutesToTime(8 * 60 + slot * 30);

  const handleAddSlot = useCallback(() => {
    if (!selectedDate) return;
    if (form.timeSlots.length >= 5) return;

    const newSlot: TimeSlot = {
      date: selectedDate,
      startTime: slotToTime(startSlot),
      endTime: slotToTime(endSlot),
    };
    updateForm({ timeSlots: [...form.timeSlots, newSlot] });
    setSelectedDate(null);
    setStartSlot(0);
    setEndSlot(Math.max(18, minDurationSlots));
  }, [selectedDate, startSlot, endSlot, minDurationSlots, form.timeSlots, updateForm]);

  const handleRemoveSlot = useCallback(
    (index: number) => {
      updateForm({
        timeSlots: form.timeSlots.filter((_, i) => i !== index),
      });
    },
    [form.timeSlots, updateForm],
  );

  const canAddSlot = !!selectedDate && form.timeSlots.length < 5;

  const canPrevMonth = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Alege data și ora
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Selectează unul sau mai multe intervale orare disponibile.
      </p>

      {/* Duration + recurring hint */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 flex-1">
          <Clock className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <span className="text-sm font-semibold text-blue-900">
              Durată estimată: ~{duration} ore
            </span>
            <span className="text-sm text-blue-600 ml-2">
              Selectează intervale de minim {duration} ore
            </span>
          </div>
        </div>
        {!form.isRecurring && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800 cursor-default">
            <Repeat className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Economisești <strong>10%</strong> la curățenie recurentă</span>
          </div>
        )}
      </div>

      {/* Calendar */}
      <Card>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={goToPrevMonth}
            disabled={!canPrevMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {MONTH_NAMES_RO[viewMonth]} {viewYear}
          </h3>
          <button
            type="button"
            onClick={goToNextMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-semibold text-gray-400 py-2"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }
            const dateStr = toDateString(viewYear, viewMonth, day);
            const isPast = isDayPast(day);
            const isToday = dateStr === toDateString(today.getFullYear(), today.getMonth(), today.getDate());
            const hasSlot = slotDates.has(dateStr);
            const isPickedDate = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(day)}
                className={cn(
                  'relative h-11 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  isPast && 'text-gray-300 cursor-not-allowed',
                  !isPast && !isPickedDate && !hasSlot && 'text-gray-700 hover:bg-gray-100',
                  isPickedDate && 'bg-blue-600 text-white shadow-sm',
                  !isPickedDate && hasSlot && 'bg-blue-50 text-blue-600',
                  isToday && !isPickedDate && 'ring-1 ring-blue-300',
                )}
              >
                {day}
                {hasSlot && !isPickedDate && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Time picker */}
      {selectedDate && (
        <Card className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Interval pentru {formatDateRo(selectedDate)}
          </h4>

          {/* Dual-pin time range slider */}
          {(() => {
            const selDurSlots = endSlot - startSlot;
            const selDurH = Math.floor(selDurSlots / 2);
            const selDurM = (selDurSlots % 2) * 30;
            const durLabel = selDurH > 0
              ? `${selDurH}h${selDurM > 0 ? ` ${selDurM}min` : ''}`
              : `${selDurM}min`;
            return (
              <>
                {/* Time display */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Ora inceput</p>
                    <p className="text-2xl font-bold text-blue-600">{slotToTime(startSlot)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    <Clock className="h-3.5 w-3.5" />
                    {durLabel}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Ora sfârșit</p>
                    <p className="text-2xl font-bold text-blue-600">{slotToTime(endSlot)}</p>
                  </div>
                </div>

                {/* Slider track */}
                <div className="relative h-8 mb-1">
                  {/* Background track */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gray-200" />
                  {/* Filled range — offset by thumbRadius (10px) so fill edges sit on thumb centers */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-blue-500 pointer-events-none"
                    style={{
                      left: `calc(${(startSlot / 24) * 100}% + ${10 - (startSlot / 24) * 20}px)`,
                      right: `calc(${((24 - endSlot) / 24) * 100}% + ${(endSlot / 24) * 20 - 10}px)`,
                    }}
                  />
                  {/* Start pin — min/max = 0/24 so thumb % matches fill % */}
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={startSlot}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value), 20); // cap at 18:00
                      setStartSlot(v);
                      if (endSlot < v + minDurationSlots) setEndSlot(Math.min(v + minDurationSlots, 24));
                    }}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none
                      [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600
                      [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                      [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                  />
                  {/* End pin */}
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={endSlot}
                    onChange={(e) => {
                      const v = Math.max(Number(e.target.value), minDurationSlots); // floor at min duration
                      setEndSlot(v);
                      if (startSlot > v - minDurationSlots) setStartSlot(Math.max(0, v - minDurationSlots));
                    }}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none
                      [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600
                      [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                      [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                  />
                </div>

                {/* Hour markers */}
                <div className="flex justify-between text-xs text-gray-400 mb-5 px-0.5">
                  <span>08:00</span>
                  <span>11:00</span>
                  <span>14:00</span>
                  <span>17:00</span>
                  <span>20:00</span>
                </div>
              </>
            );
          })()}

          {/* Add slot button */}
          <Button
            onClick={handleAddSlot}
            disabled={!canAddSlot}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Adaugă interval
          </Button>
        </Card>
      )}

      {/* Slot list */}
      {form.timeSlots.length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intervale selectate ({form.timeSlots.length}/5)
          </label>
          {form.timeSlots.map((slot, index) => (
            <div
              key={`${slot.date}-${slot.startTime}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm font-medium text-gray-900">
                  {formatDateRo(slot.date)}
                </span>
                <span className="text-sm text-blue-600 font-semibold">
                  {slot.startTime} - {slot.endTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSlot(index)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition cursor-pointer text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {form.timeSlots.length < 5 && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null);
              }}
              className="text-sm text-blue-600 font-medium hover:underline cursor-pointer mt-1"
            >
              + Adaugă alt interval
            </button>
          )}
        </div>
      )}

      {/* Recurring booking section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Repeat className="h-5 w-5 text-blue-600" />
          Programare recurentă
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Programează curățenia să se repete automat.
        </p>

        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) =>
                updateForm({
                  isRecurring: e.target.checked,
                  recurrenceType: e.target.checked ? 'WEEKLY' : '',
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Vreau curățenie recurentă
          </span>
        </label>

        {form.isRecurring && (
          <div className="space-y-4 pl-1">
            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecventa
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'WEEKLY', label: 'Săptămânal' },
                  { value: 'BIWEEKLY', label: 'Bisăptămânal' },
                  { value: 'MONTHLY', label: 'Lunar' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateForm({ recurrenceType: opt.value })}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border',
                      form.recurrenceType === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Day of week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zi preferata
              </label>
              <div className="flex gap-1.5">
                {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(
                  (day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => updateForm({ recurrenceDayOfWeek: idx + 1 })}
                      className={cn(
                        'px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border',
                        form.recurrenceDayOfWeek === idx + 1
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300',
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
              <Repeat className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">8 programări vor fi create automat</p>
                <p className="text-blue-600">
                  Același curățător va fi alocat pentru fiecare sesiune — consistență garantată.
                  Poți anula oricând seria. Plătești per sesiune.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Step 3: Address --------------------------------------------------------

function StepAddress({
  form,
  updateForm,
  savedAddresses,
  isAuthenticated,
  onGoogleLogin,
}: {
  form: BookingFormState;
  updateForm: (updates: Partial<BookingFormState>) => void;
  savedAddresses: SavedAddress[];
  isAuthenticated: boolean;
  onGoogleLogin: (response: CredentialResponse) => void;
}) {
  const { data: citiesData } = useQuery<{ activeCities: ActiveCity[] }>(ACTIVE_CITIES);
  const activeCities: ActiveCity[] = useMemo(
    () => (citiesData?.activeCities ?? []).filter((c) => c.isActive),
    [citiesData],
  );

  const navigate = useNavigate();
  const [showCityNotFound, setShowCityNotFound] = useState(false);
  const [unsupportedCityName, setUnsupportedCityName] = useState('');

  // City names for Google Places autocomplete bias.
  const supportedCityNames = useMemo(
    () => activeCities.map((c) => c.name),
    [activeCities],
  );

  // City options for dropdown
  const cityOptions = useMemo(
    () => activeCities.map((c) => ({ value: c.id, label: c.name })),
    [activeCities],
  );

  // When a city is selected from dropdown, auto-fill county and area options
  const selectedCity = useMemo(
    () => activeCities.find((c) => c.id === form.selectedCityId) ?? null,
    [activeCities, form.selectedCityId],
  );

  const areaOptions = useMemo(() => {
    if (!selectedCity) return [];
    return selectedCity.areas.map((a) => ({ value: a.id, label: a.name }));
  }, [selectedCity]);

  const handleCityChange = useCallback(
    (cityId: string) => {
      const city = activeCities.find((c) => c.id === cityId);
      updateForm({
        selectedCityId: cityId,
        city: city?.name ?? '',
        county: city?.county ?? '',
        selectedAreaId: '',
        useSavedAddress: '',
      });
      setShowCityNotFound(false);
    },
    [activeCities, updateForm],
  );

  // Try to match an area from the parsed neighborhood / sublocality.
  // Strip Romanian diacritics for comparison (e.g. București → Bucuresti).
  const stripDiacritics = useCallback(
    (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    [],
  );

  const matchArea = useCallback(
    (city: ActiveCity, neighborhood: string): string => {
      if (!neighborhood) return '';
      const norm = stripDiacritics(neighborhood.toLowerCase().trim());
      // Exact match first.
      const exact = city.areas.find(
        (a) => stripDiacritics(a.name.toLowerCase()) === norm,
      );
      if (exact) return exact.id;
      // Partial match (area name contained in neighborhood or vice-versa).
      const partial = city.areas.find(
        (a) =>
          norm.includes(stripDiacritics(a.name.toLowerCase())) ||
          stripDiacritics(a.name.toLowerCase()).includes(norm),
      );
      return partial?.id ?? '';
    },
    [stripDiacritics],
  );

  const handleAddressSelect = useCallback(
    (parsed: ParsedAddress) => {

      // Match city from active cities (case-insensitive, diacritics-insensitive).
      const cityMatch = activeCities.find(
        (c) =>
          stripDiacritics(c.name.toLowerCase()) ===
          stripDiacritics(parsed.city.toLowerCase()),
      );

      // Try to auto-match area from neighborhood.
      let areaId = '';
      if (cityMatch) {
        areaId = matchArea(cityMatch, parsed.neighborhood);
      }

      updateForm({
        streetAddress: parsed.streetAddress,
        city: parsed.city,
        county: parsed.county,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        floor: parsed.floor || form.floor,
        apartment: parsed.apartment || form.apartment,
        useSavedAddress: '',
        selectedCityId: cityMatch?.id ?? '',
        selectedAreaId: areaId,
      });

      if (!cityMatch && parsed.city) {
        setShowCityNotFound(true);
        setUnsupportedCityName(parsed.city);
      } else {
        setShowCityNotFound(false);
        setUnsupportedCityName('');
      }
    },
    [activeCities, matchArea, updateForm],
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Adresa de curățenie
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Caută adresa ta și vom completa automat orașul și zona.
      </p>

      {/* Saved addresses */}
      {isAuthenticated && savedAddresses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Adrese salvate
          </h3>
          <div className="space-y-2">
            {savedAddresses.map((addr) => (
              <Card
                key={addr.id}
                className={cn(
                  'cursor-pointer transition-all',
                  form.useSavedAddress === addr.id
                    ? 'ring-2 ring-blue-600 border-blue-600'
                    : 'hover:border-gray-300',
                )}
                onClick={() => {
                  const cityMatch = activeCities.find(
                    (c) => c.name.toLowerCase() === addr.city.toLowerCase(),
                  );
                  // Auto-select first area as default for saved addresses.
                  const areaId = cityMatch?.areas?.[0]?.id ?? '';
                  updateForm({
                    useSavedAddress: addr.id,
                    streetAddress: addr.streetAddress,
                    city: addr.city,
                    county: addr.county,
                    floor: addr.floor || '',
                    apartment: addr.apartment || '',
                    latitude: addr.coordinates?.latitude ?? null,
                    longitude: addr.coordinates?.longitude ?? null,
                    selectedCityId: cityMatch?.id ?? '',
                    selectedAreaId: areaId,
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {addr.label || addr.streetAddress}
                      {addr.isDefault && (
                        <span className="ml-2 text-xs text-emerald-600 font-semibold">
                          Implicita
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {addr.streetAddress}, {addr.city}, {addr.county}
                    </div>
                  </div>
                  {form.useSavedAddress === addr.id && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {/* Divider + new address link (only when no saved address selected) */}
          {!form.useSavedAddress && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#FAFBFC] px-4 text-sm text-gray-400">
                  sau introdu o adresă nouă
                </span>
              </div>
            </div>
          )}

          {/* Area selector + link to switch when saved address is selected */}
          {form.useSavedAddress && (
            <div className="mt-4 space-y-3">
              {selectedCity && areaOptions.length > 1 && (
                <Select
                  label="Zona / Sector"
                  options={areaOptions}
                  value={form.selectedAreaId}
                  onChange={(e) => updateForm({ selectedAreaId: e.target.value })}
                />
              )}
              <button
                type="button"
                onClick={() => updateForm({ useSavedAddress: '' })}
                className="text-sm text-blue-600 font-medium hover:underline cursor-pointer"
              >
                Folosește o adresă nouă
              </button>
            </div>
          )}
        </div>
      )}

      {!form.useSavedAddress && (
      <Card className="space-y-5">
        {/* Address Autocomplete - biased toward supported cities */}
        <AddressAutocomplete
          label="Cauta adresa"
          placeholder="Incepe sa scrii adresa (ex: Strada Eroilor 5, Cluj-Napoca)..."
          value={form.streetAddress}
          biasTowardCities={supportedCityNames}
          onChange={(val) => {
            updateForm({
              streetAddress: val,
              useSavedAddress: '',
            });
          }}
          onAddressSelect={handleAddressSelect}
        />

        {/* Auto-filled location info */}
        {form.selectedCityId && selectedCity && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">
              {selectedCity.name}, {form.county}
              {form.selectedAreaId && areaOptions.length > 0 && (
                <> &mdash; {areaOptions.find((a) => a.value === form.selectedAreaId)?.label}</>
              )}
            </span>
          </div>
        )}

        {/* City dropdown (manual override if needed) */}
        {!form.selectedCityId && (
          <div>
            <Select
              label="Oras"
              placeholder="Selectează orașul"
              options={cityOptions}
              value={form.selectedCityId}
              onChange={(e) => handleCityChange(e.target.value)}
            />
            {/* City not found */}
            {showCityNotFound && (
              <div className="mt-3 p-5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Nu suntem încă activi în {unsupportedCityName || 'zona ta'}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Lucrăm la extindere! Creează un cont gratuit și te vom contacta imediat ce devenim disponibili în orașul tău.
                    </p>
                  </div>
                </div>

                {!isAuthenticated ? (
                  <div className="mt-3">
                    <p className="text-xs text-blue-600 mb-2 font-medium">
                      Înregistrează-te cu Google pentru a fi notificat:
                    </p>
                    <GoogleLogin
                      onSuccess={onGoogleLogin}
                      onError={() => {}}
                      text="signup_with"
                      shape="rectangular"
                      width="280"
                    />
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-lg bg-blue-100 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        Cont înregistrat! Te vom contacta când devenim activi în {unsupportedCityName || 'zona ta'}. Între timp, explorează platforma.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/cont/adrese')}
                      className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Adaugă adresa mea
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCityNotFound(false);
                    setUnsupportedCityName('');
                  }}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-600 hover:underline cursor-pointer"
                >
                  Închide
                </button>
              </div>
            )}
            {!showCityNotFound && (
              <button
                type="button"
                onClick={() => setShowCityNotFound(true)}
                className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Orașul tău nu este în listă?
              </button>
            )}
          </div>
        )}

        {/* Change city link when auto-filled */}
        {form.selectedCityId && selectedCity && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => updateForm({ selectedCityId: '', selectedAreaId: '', city: '', county: '' })}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Schimbă orașul
            </button>
          </div>
        )}

        {/* Area dropdown (shown if city has areas and not yet auto-matched) */}
        {selectedCity && areaOptions.length > 0 && !form.selectedAreaId && (
          <Select
            label="Selectează zona / sectorul"
            placeholder="Alege zona"
            options={areaOptions}
            value={form.selectedAreaId}
            onChange={(e) => updateForm({ selectedAreaId: e.target.value })}
          />
        )}

        {/* Area change link when auto-matched */}
        {selectedCity && areaOptions.length > 0 && form.selectedAreaId && (
          <div>
            <Select
              label="Zona / Sector"
              options={areaOptions}
              value={form.selectedAreaId}
              onChange={(e) => updateForm({ selectedAreaId: e.target.value })}
            />
          </div>
        )}

        {/* Floor / Apartment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label="Etaj (optional)"
            placeholder="ex: 3"
            value={form.floor}
            onChange={(e) => updateForm({ floor: e.target.value })}
          />
          <Input
            label="Apartament (optional)"
            placeholder="ex: 12B"
            value={form.apartment}
            onChange={(e) => updateForm({ apartment: e.target.value })}
          />
        </div>
      </Card>
      )}
    </div>
  );
}

// ---- AI Matching Loader Component ------------------------------------------

function AIMatchingLoader() {
  const [stage, setStage] = useState(0);

  const stages = [
    { icon: Sparkles, text: 'Analizăm cererea ta...', color: 'text-gray-600' },
    { icon: MapPin, text: 'Căutăm curățători disponibili în zona ta...', color: 'text-gray-600' },
    { icon: Calendar, text: 'Calculăm programele optime...', color: 'text-gray-600' },
    { icon: Star, text: 'Clasificăm cele mai bune potriviri...', color: 'text-gray-600' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 800); // Progress every 800ms

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="py-10 px-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Animated icon container */}
        <div className="relative w-24 h-24">
          {/* Background ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 animate-pulse" />

          {/* Icon transitions */}
          {stages.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-500',
                  idx === stage
                    ? 'opacity-100 scale-100'
                    : idx < stage
                    ? 'opacity-0 scale-75'
                    : 'opacity-0 scale-125',
                )}
              >
                <Icon className={cn('h-12 w-12', s.color)} />
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-700 ease-out"
              style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Title and stage text */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Căutăm echipa perfectă pentru tine
          </h3>
          <p
            className={cn(
              'text-sm font-medium transition-colors duration-300',
              stages[stage].color,
            )}
          >
            {stages[stage].text}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---- Step 4: Cleaner Suggestions --------------------------------------------

function StepCleaner({
  form,
  updateForm,
  estimatedHours,
  minHours,
}: {
  form: BookingFormState;
  updateForm: (updates: Partial<BookingFormState>) => void;
  estimatedHours?: number;
  minHours?: number;
}) {
  const duration = estimatedHours ?? minHours ?? 2;
  const firstSlot = form.timeSlots[0];

  // State for minimum loading delay (ensures AIMatchingLoader shows for 2.5s)
  const [showLoader, setShowLoader] = useState(false);
  const [_minimumLoadingComplete, setMinimumLoadingComplete] = useState(false);
  const loadingStartTimeRef = useRef<number | null>(null);

  const { data: suggestionsData, loading: suggestionsLoading, refetch } = useQuery<{
    suggestCleaners: CleanerSuggestion[];
  }>(SUGGEST_CLEANERS, {
    variables: {
      cityId: form.selectedCityId,
      areaId: form.selectedAreaId,
      timeSlots: form.timeSlots.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      estimatedDurationHours: duration,
    },
    skip:
      !form.selectedCityId ||
      !form.selectedAreaId ||
      !firstSlot?.date ||
      !firstSlot?.startTime,
    fetchPolicy: 'network-only',
  });

  const suggestions: CleanerSuggestion[] =
    suggestionsData?.suggestCleaners ?? [];
  const topSuggestions = suggestions.slice(0, 5);

  // Force refetch when critical dependencies change
  useEffect(() => {
    if (
      !suggestionsLoading &&
      form.selectedCityId &&
      form.selectedAreaId &&
      firstSlot?.date &&
      firstSlot?.startTime
    ) {
      refetch();
    }
  }, [
    form.timeSlots,
    form.selectedCityId,
    form.selectedAreaId,
    refetch,
  ]);

  // Enforce minimum loading time of 2500ms for smooth animation
  useEffect(() => {
    if (suggestionsLoading) {
      // Start loading
      setShowLoader(true);
      setMinimumLoadingComplete(false);
      loadingStartTimeRef.current = Date.now();

      // Set minimum display time
      const minLoadingTimer = setTimeout(() => {
        setMinimumLoadingComplete(true);
      }, 2500);

      return () => clearTimeout(minLoadingTimer);
    } else {
      // Data arrived, but check if minimum time has elapsed
      if (loadingStartTimeRef.current !== null) {
        const elapsed = Date.now() - loadingStartTimeRef.current;
        const remaining = Math.max(0, 2500 - elapsed);

        if (remaining > 0) {
          // Wait for remaining time before hiding loader
          const hideTimer = setTimeout(() => {
            setShowLoader(false);
            setMinimumLoadingComplete(true);
          }, remaining);

          return () => clearTimeout(hideTimer);
        } else {
          // Minimum time already elapsed
          setShowLoader(false);
          setMinimumLoadingComplete(true);
        }
      } else {
        setShowLoader(false);
        setMinimumLoadingComplete(true);
      }
    }
  }, [suggestionsLoading]);

  const getAvailabilityBadge = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return {
          label: 'Disponibil',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'partial':
        return {
          label: 'Partial disponibil',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'unavailable':
        return {
          label: 'Indisponibil',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'busy':
      default:
        return {
          label: 'Ocupat',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
    }
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Alege un curățător
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Selectează curățătorul care va efectua serviciul. Prețul este același indiferent de alegere.
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { icon: CheckCircle2, text: 'Verificare cazier' },
          { icon: Star, text: 'Rating mediu 4.8/5' },
          { icon: Sparkles, text: 'Experiență medie 3+ ani' },
        ] as { icon: typeof CheckCircle2; text: string }[]).map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
            <Icon className="h-3 w-3 text-emerald-500" />
            {text}
          </div>
        ))}
      </div>

      {/* Job schedule header */}
      {firstSlot && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 mb-6">
          <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm text-blue-800 font-medium">
            Programarea ta: {new Date(firstSlot.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })},{' '}
            {firstSlot.startTime} - {firstSlot.endTime}
            {duration ? ` (${duration} ${duration === 1 ? 'ora' : 'ore'})` : ''}
          </span>
        </div>
      )}

      {showLoader ? (
        <AIMatchingLoader />
      ) : topSuggestions.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-4 sm:overflow-x-auto p-1">
          {topSuggestions.slice(0, 2).map((suggestion) => {
            const { cleaner, availabilityStatus, availableFrom, availableTo, suggestedStartTime, suggestedEndTime, suggestedDate } = suggestion;
            const isSelected = form.preferredCleanerId === cleaner.id;
            const badge = getAvailabilityBadge(availabilityStatus);
            const initial = cleaner.fullName.charAt(0).toUpperCase();

            return (
              <Card
                key={cleaner.id}
                className={cn(
                  'transition-all cursor-pointer shrink-0 w-full sm:w-64 relative',
                  isSelected
                    ? 'ring-2 ring-blue-600 border-blue-600 shadow-md shadow-blue-600/10'
                    : 'hover:shadow-md hover:border-gray-300',
                )}
                onClick={() =>
                  updateForm({
                    preferredCleanerId: isSelected ? '' : cleaner.id,
                    suggestedStartTime: isSelected ? '' : (suggestedStartTime ?? ''),
                  })
                }
              >
                <div className="flex flex-col items-center">
                  {/* Selected indicator - top right */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    </div>
                  )}

                  {/* Avatar or initial */}
                  {cleaner.user?.avatarUrl ? (
                    <img
                      src={cleaner.user.avatarUrl}
                      alt={cleaner.fullName}
                      className="w-24 h-24 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-24 h-24 rounded-xl flex items-center justify-center text-white font-bold text-3xl shrink-0',
                        getInitialColor(cleaner.fullName),
                      )}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Info */}
                  <div className="w-full mt-4 text-center">
                    <h3 className="font-semibold text-gray-900 text-base mb-2">
                      {cleaner.fullName}
                    </h3>

                    <span
                      className={cn(
                        'inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-3',
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>

                    {/* Availability time window */}
                    {availableFrom && availableTo && (
                      <p className={cn(
                        'text-xs mt-2 flex items-center justify-center gap-1',
                        availabilityStatus === 'available' ? 'text-emerald-600' :
                        availabilityStatus === 'partial' ? 'text-amber-600' :
                        'text-red-500',
                      )}>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="text-center">
                          {availabilityStatus === 'unavailable' || availabilityStatus === 'busy' ? (
                            <>Indisponibil</>
                          ) : availabilityStatus === 'partial' ? (
                            <>{availableFrom} - {availableTo}</>
                          ) : (
                            <>{availableFrom} - {availableTo}</>
                          )}
                        </span>
                      </p>
                    )}

                    {/* System-decided optimal date + time */}
                    {suggestedStartTime && suggestedEndTime && availabilityStatus !== 'unavailable' && (
                      <p className="text-xs mt-2 flex items-center justify-center gap-1 text-blue-600 font-medium">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {suggestedDate && new Date(suggestedDate + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {suggestedDate && ' '}
                          {suggestedStartTime} - {suggestedEndTime}
                        </span>
                      </p>
                    )}

                    <div className="flex items-center justify-center gap-1 mt-3 text-sm">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium text-gray-900">
                        {cleaner.ratingAvg > 0
                          ? cleaner.ratingAvg.toFixed(1)
                          : '5.0'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="text-center py-6">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Nu am găsit curățători disponibili în această zonă și dată. Te rugăm
              să încerci o altă dată sau să verifici zona.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Step 5: Summary --------------------------------------------------------

function StepSummary({
  form,
  updateForm,
  selectedService,
  estimate,
  estimateLoading,
  extras,
  savedAddresses,
  isAuthenticated,
  userName,
}: {
  form: BookingFormState;
  updateForm: (updates: Partial<BookingFormState>) => void;
  selectedService?: ServiceDefinition;
  estimate?: PriceEstimate;
  estimateLoading: boolean;
  extras: ExtraDefinition[];
  savedAddresses: SavedAddress[];
  isAuthenticated: boolean;
  userName?: string;
}) {
  const selectedExtraNames = useMemo(
    () =>
      form.extras
        .filter((e) => e.quantity > 0)
        .map((e) => {
          const extra = extras.find((x) => x.id === e.extraId);
          return extra ? `${extra.nameRo} x${e.quantity}` : '';
        })
        .filter(Boolean),
    [form.extras, extras],
  );

  const firstSlot = form.timeSlots[0];

  // Fetch cleaner suggestions to resolve selected cleaner name
  const { data: suggestionsData } = useQuery<{
    suggestCleaners: CleanerSuggestion[];
  }>(SUGGEST_CLEANERS, {
    variables: {
      cityId: form.selectedCityId,
      areaId: form.selectedAreaId,
      timeSlots: form.timeSlots.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      estimatedDurationHours: estimate?.estimatedHours ?? selectedService?.minHours ?? 2,
    },
    skip:
      !form.preferredCleanerId ||
      !form.selectedCityId ||
      !form.selectedAreaId ||
      !firstSlot?.date ||
      !firstSlot?.startTime,
    fetchPolicy: 'cache-first',
  });

  const selectedCleaner = useMemo(() => {
    if (!form.preferredCleanerId) return null;
    const suggestions = suggestionsData?.suggestCleaners ?? [];
    return (
      suggestions.find((s) => s.cleaner.id === form.preferredCleanerId) ?? null
    );
  }, [form.preferredCleanerId, suggestionsData]);

  const propertyLabel = useMemo(() => {
    const pt = PROPERTY_TYPES.find((p) => p.value === form.propertyType);
    return pt ? pt.label : form.propertyType;
  }, [form.propertyType]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Sumar și confirmare
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Verifică detaliile înainte de a confirma rezervarea.
      </p>

      {isAuthenticated && userName && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-sm text-emerald-700">
            Conectat ca <strong>{userName}</strong>
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Service summary */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Serviciu
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {SERVICE_ICONS[form.serviceType] || '\uD83E\uDDF9'}
            </span>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {selectedService?.nameRo || form.serviceType}
              </div>
              <div className="text-sm text-blue-600 font-medium">
                {selectedService?.basePricePerHour} lei/ora
              </div>
            </div>
          </div>
        </Card>

        {/* Details summary */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Detalii proprietate
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Tip:</span>{' '}
              <span className="font-medium text-gray-900">{propertyLabel}</span>
              {form.propertyType === 'Casa' && (
                <span className="text-xs text-amber-600 font-semibold ml-1">
                  (x1.3)
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-500">Camere:</span>{' '}
              <span className="font-medium text-gray-900">{form.numRooms}</span>
            </div>
            <div>
              <span className="text-gray-500">Bai:</span>{' '}
              <span className="font-medium text-gray-900">{form.numBathrooms}</span>
            </div>
            <div>
              <span className="text-gray-500">Suprafata:</span>{' '}
              <span className="font-medium text-gray-900">{form.areaSqm} mp</span>
            </div>
            {form.hasPets && (
              <div className="flex items-center gap-1">
                <PawPrint className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-gray-500">Animale:</span>{' '}
                <span className="font-medium text-amber-600">Da (+15 lei)</span>
              </div>
            )}
          </div>
          {selectedExtraNames.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Extra: </span>
              <span className="text-sm font-medium text-gray-900">
                {selectedExtraNames.join(', ')}
              </span>
            </div>
          )}
        </Card>

        {/* Date & Time summary */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Data și ora
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDateRo(selectedCleaner?.suggestedDate || firstSlot?.date || '')}
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-base mt-0.5">
                <Clock className="h-4 w-4" />
                {selectedCleaner?.suggestedStartTime || firstSlot?.startTime} - {selectedCleaner?.suggestedEndTime || firstSlot?.endTime}
              </div>
            </div>
          </div>
        </Card>

        {/* Recurrence summary */}
        {form.isRecurring && form.recurrenceType && (
          <Card>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Programare recurentă
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <Repeat className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-medium text-gray-900">
                  {form.recurrenceType === 'WEEKLY' ? 'Săptămânal' : form.recurrenceType === 'BIWEEKLY' ? 'Bisăptămânal' : 'Lunar'}
                </span>
                <span className="text-gray-500 ml-2">
                  — {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'][form.recurrenceDayOfWeek - 1]}
                </span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              8 programări vor fi create automat. Plătești per sesiune.
            </p>
          </Card>
        )}

        {/* Address summary */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Adresa
          </h3>
          {(() => {
            const saved = form.useSavedAddress
              ? savedAddresses.find((a) => a.id === form.useSavedAddress)
              : null;
            const street = saved?.streetAddress ?? form.streetAddress;
            const city = saved?.city ?? form.city;
            const county = saved?.county ?? form.county;
            const floor = saved?.floor ?? form.floor;
            const apartment = saved?.apartment ?? form.apartment;
            return (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="text-sm text-gray-900">
                  {street}
                  {floor && `, Etaj ${floor}`}
                  {apartment && `, Ap. ${apartment}`}
                  <br />
                  <span className="text-gray-500">
                    {city}, {county}
                  </span>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Cleaner summary */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Curățător preferat
          </h3>
          {selectedCleaner ? (
            <div className="flex items-center gap-4">
              {selectedCleaner.cleaner.user.avatarUrl ? (
                <img
                  src={selectedCleaner.cleaner.user.avatarUrl}
                  alt={selectedCleaner.cleaner.fullName}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0',
                    getInitialColor(selectedCleaner.cleaner.fullName),
                  )}
                >
                  {selectedCleaner.cleaner.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-base font-semibold text-gray-900">
                  {selectedCleaner.cleaner.fullName}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedCleaner.cleaner.ratingAvg.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    ({selectedCleaner.cleaner.totalJobsCompleted} lucrări)
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {selectedCleaner.company.companyName}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              Niciun curățător selectat
            </div>
          )}
        </Card>

        {/* Price breakdown */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Estimare preț
          </h3>
          {estimateLoading ? (
            <LoadingSpinner size="sm" text="Se calculeaza pretul..." />
          ) : estimate ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>
                  {estimate.hourlyRate} lei/ora x {estimate.estimatedHours} ore
                </span>
                <span>{estimate.subtotal} lei</span>
              </div>
              {estimate.propertyMultiplier > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    Multiplicator proprietate (x{estimate.propertyMultiplier})
                  </span>
                  <span className="text-amber-600">inclus</span>
                </div>
              )}
              {estimate.petsSurcharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <PawPrint className="h-3 w-3" />
                    Supliment animale
                  </span>
                  <span>+{estimate.petsSurcharge} lei</span>
                </div>
              )}
              {estimate.extras.map((ext, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>
                    {ext.extra.nameRo} x{ext.quantity}
                  </span>
                  <span>{ext.lineTotal} lei</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-3 border-t border-gray-100 mt-1">
                <span>Total estimat</span>
                <span className="text-blue-600">{estimate.total} lei</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Prețul va fi calculat automat.
            </p>
          )}
        </Card>

        {/* Special instructions */}
        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Instrucțiuni speciale (opțional)
          </label>
          <textarea
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 resize-none"
            rows={3}
            placeholder="Indicații suplimentare pentru echipa de curățenie..."
            value={form.specialInstructions}
            onChange={(e) =>
              updateForm({ specialInstructions: e.target.value })
            }
          />
        </Card>
      </div>
    </div>
  );
}

// ---- Price Sidebar (desktop) ------------------------------------------------

const SIDEBAR_FAQ = [
  { q: 'Cât durează o curățenie?', a: 'Depinde de suprafață. Un apartament cu 2 camere durează ~2–3 ore.' },
  { q: 'Pot anula rezervarea?', a: 'Da, gratuit cu 24 ore înainte. Fără comisioane.' },
  { q: 'Ce aduce curățătorul?', a: 'Echipamentele de curățenie. Produsele le asiguri tu (sau le aducem contra cost).' },
];

function PriceSidebar({
  form,
  selectedService,
  extras,
  estimate,
  estimateLoading,
}: {
  form: BookingFormState;
  selectedService?: ServiceDefinition;
  extras: ExtraDefinition[];
  estimate?: PriceEstimate;
  estimateLoading: boolean;
}) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showServiceInfo, setShowServiceInfo] = useState(false);
  return (
    <div className="sticky top-8 space-y-4">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Rezumat comandă
        </h3>

        {selectedService ? (
          <div className="space-y-3 text-sm relative">
            {/* Loading overlay */}
            {estimateLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            )}

            {/* Service */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {SERVICE_ICONS[form.serviceType] || '\uD83E\uDDF9'}
                </span>
                <span className="font-medium text-gray-900">
                  {selectedService.nameRo}
                </span>
                <button
                  onClick={() => setShowServiceInfo(true)}
                  className="p-0.5 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                  title="Detalii serviciu"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <span className="font-semibold text-gray-900">
                {selectedService.basePricePerHour} lei/ora
              </span>
            </div>

            {/* Property type */}
            {form.propertyType && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tip proprietate</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  {form.propertyType}
                  {form.propertyType === 'Casa' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                      x1.3
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Rooms / Bathrooms */}
            <div className="flex justify-between">
              <span className="text-gray-500">Camere</span>
              <span className="font-medium text-gray-900">{form.numRooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bai</span>
              <span className="font-medium text-gray-900">{form.numBathrooms}</span>
            </div>

            {/* Duration estimate */}
            {estimate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Durata estimata</span>
                <span className="font-medium text-gray-900">
                  ~{estimate.estimatedHours} ore
                </span>
              </div>
            )}

            {/* Subtotal */}
            {estimate && (
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {estimate.subtotal} lei
                </span>
              </div>
            )}

            {/* Extras */}
            {form.extras.filter((e) => e.quantity > 0).length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  Extra
                </span>
                {form.extras
                  .filter((e) => e.quantity > 0)
                  .map((e) => {
                    const extra = extras.find((x) => x.id === e.extraId);
                    return (
                      <div key={e.extraId} className="flex justify-between mt-1">
                        <span className="text-gray-600">
                          {extra?.nameRo}
                          {extra?.allowMultiple ? ` x${e.quantity}` : ''}
                        </span>
                        <span className="font-medium text-gray-900">
                          +{(extra?.price ?? 0) * e.quantity} lei
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Pets surcharge */}
            {estimate && estimate.petsSurcharge > 0 && (
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  <PawPrint className="h-3 w-3" />
                  Animale
                </span>
                <span className="font-medium">+{estimate.petsSurcharge} lei</span>
              </div>
            )}

            {/* Total */}
            {estimate && (
              <div className="pt-3 border-t border-gray-200 mt-1">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600">{estimate.total} lei</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  *Estimare - pretul final poate varia
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            Selectează un serviciu pentru a vedea prețul estimat.
          </p>
        )}
      </Card>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
        <span className="text-base">🔒</span>
        Plată securizată prin Stripe
      </div>

      {/* FAQ accordion */}
      <Card>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Întrebări frecvente</h4>
        <div className="space-y-2">
          {SIDEBAR_FAQ.map((item, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {item.q}
                {openFaqIndex === idx ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                )}
              </button>
              {openFaqIndex === idx && (
                <div className="px-3 pb-3 text-sm text-gray-600 border-t border-gray-100 pt-2">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Service info modal */}
      {showServiceInfo && selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowServiceInfo(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {SERVICE_ICONS[form.serviceType] || '\uD83E\uDDF9'}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedService.nameRo}
                </h3>
              </div>
              <button
                onClick={() => setShowServiceInfo(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedService.descriptionRo && (
              <p className="text-sm text-gray-500 mb-4">
                {selectedService.descriptionRo}
              </p>
            )}
            {selectedService.includedItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Inclus în serviciu
                </p>
                <ul className="space-y-2">
                  {selectedService.includedItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Mobile Price Footer ----------------------------------------------------

function MobilePriceFooter({
  form,
  selectedService,
  estimate,
  estimateLoading,
  extras,
}: {
  form: BookingFormState;
  selectedService?: ServiceDefinition;
  estimate?: PriceEstimate;
  estimateLoading: boolean;
  extras: ExtraDefinition[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showServiceInfo, setShowServiceInfo] = useState(false);

  if (!selectedService) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden z-40">
      {/* Expanded breakdown */}
      {expanded && (
        <div className="max-h-[50vh] overflow-y-auto px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="max-w-5xl mx-auto space-y-2 text-sm">
            {/* Service */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Serviciu</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-900">
                  {selectedService.nameRo}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowServiceInfo(true); }}
                  className="p-0.5 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                  title="Detalii serviciu"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pret/ora</span>
              <span className="font-medium text-gray-900">
                {selectedService.basePricePerHour} lei
              </span>
            </div>

            {/* Property type */}
            {form.propertyType && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tip</span>
                <span className="font-medium text-gray-900">
                  {form.propertyType}
                  {form.propertyType === 'Casa' && (
                    <span className="text-xs text-amber-600 ml-1">(x1.3)</span>
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Camere / Bai</span>
              <span className="font-medium text-gray-900">
                {form.numRooms} / {form.numBathrooms}
              </span>
            </div>

            {/* Duration */}
            {estimate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Durata</span>
                <span className="font-medium text-gray-900">
                  ~{estimate.estimatedHours} ore
                </span>
              </div>
            )}

            {/* Subtotal */}
            {estimate && (
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{estimate.subtotal} lei</span>
              </div>
            )}

            {/* Extras */}
            {form.extras
              .filter((e) => e.quantity > 0)
              .map((e) => {
                const extra = extras.find((x) => x.id === e.extraId);
                return (
                  <div key={e.extraId} className="flex justify-between">
                    <span className="text-gray-600">
                      {extra?.nameRo}
                      {extra?.allowMultiple ? ` x${e.quantity}` : ''}
                    </span>
                    <span>+{(extra?.price ?? 0) * e.quantity} lei</span>
                  </div>
                );
              })}

            {/* Pets */}
            {estimate && estimate.petsSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Animale</span>
                <span>+{estimate.petsSurcharge} lei</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full cursor-pointer"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-gray-500 text-left">
                {selectedService.nameRo}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {estimateLoading ? (
                  <span className="text-sm text-gray-400">Se calculeaza...</span>
                ) : estimate ? (
                  `${estimate.total} lei`
                ) : (
                  `de la ${selectedService.basePricePerHour * selectedService.minHours} lei`
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {form.numRooms} camere, {form.numBathrooms} bai
            </span>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Service info modal */}
      {showServiceInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowServiceInfo(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {SERVICE_ICONS[form.serviceType] || '\uD83E\uDDF9'}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedService.nameRo}
                </h3>
              </div>
              <button
                onClick={() => setShowServiceInfo(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedService.descriptionRo && (
              <p className="text-sm text-gray-500 mb-4">
                {selectedService.descriptionRo}
              </p>
            )}
            {selectedService.includedItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Inclus în serviciu
                </p>
                <ul className="space-y-2">
                  {selectedService.includedItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
