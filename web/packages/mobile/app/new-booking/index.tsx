import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { PlatformCard } from '../../src/design';
import { colors, radius, spacing, typography } from '../../src/design/tokens';
import { useAuth } from '../../src/auth/AuthContext';

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const AVAILABLE_SERVICES = gql`
  query AvailableServicesPublic {
    availableServices {
      id
      serviceType
      nameRo
      basePricePerHour
      minHours
      icon
      includedItems
    }
    availableExtras {
      id
      nameRo
      price
      icon
      allowMultiple
    }
  }
`;

const MY_ADDRESSES = gql`
  query MyAddressesBooking {
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

const ESTIMATE_PRICE = gql`
  query EstimatePriceBooking($input: PriceEstimateInput!) {
    estimatePrice(input: $input) {
      hourlyRate
      estimatedHours
      propertyMultiplier
      petsSurcharge
      subtotal
      extras {
        extra {
          id
          nameRo
          price
        }
        quantity
        lineTotal
      }
      total
      cityPricingMultiplier
      pricingModel
      areaTotal
    }
  }
`;

const ADD_ADDRESS = gql`
  mutation AddAddressBooking($input: AddAddressInput!) {
    addAddress(input: $input) {
      id
    }
  }
`;

const CREATE_BOOKING = gql`
  mutation CreateBookingRequestPublic($input: CreateBookingInput!) {
    createBookingRequest(input: $input) {
      id
      referenceCode
      status
      estimatedTotal
    }
  }
`;

const RECURRING_DISCOUNTS = gql`
  query RecurringDiscounts {
    recurringDiscounts {
      recurrenceType
      discountPct
      isActive
    }
  }
`;

const SUBSCRIPTION_PRICING_PREVIEW = gql`
  query SubscriptionPricingPreview(
    $serviceType: ServiceType!
    $recurrenceType: RecurrenceType!
    $numRooms: Int!
    $numBathrooms: Int!
    $areaSqm: Int
    $propertyType: String
    $hasPets: Boolean
    $extras: [ExtraInput!]
  ) {
    subscriptionPricingPreview(
      serviceType: $serviceType
      recurrenceType: $recurrenceType
      numRooms: $numRooms
      numBathrooms: $numBathrooms
      areaSqm: $areaSqm
      propertyType: $propertyType
      hasPets: $hasPets
      extras: $extras
    ) {
      perSessionOriginal
      discountPct
      perSessionDiscounted
      sessionsPerMonth
      monthlyAmount
    }
  }
`;

const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      id
      status
      recurrenceType
      serviceType
      serviceName
      monthlyAmount
      perSessionDiscounted
      sessionsPerMonth
      dayOfWeek
      preferredTime
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Service {
  id: string;
  serviceType: string;
  nameRo: string;
  basePricePerHour: number;
  minHours: number;
  icon: string | null;
  includedItems: string[];
}

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '🧹',
  DEEP_CLEANING: '✨',
  MOVE_IN_OUT_CLEANING: '📦',
  POST_CONSTRUCTION: '🏗️',
  OFFICE_CLEANING: '🏢',
  WINDOW_CLEANING: '🪟',
};

interface Extra {
  id: string;
  nameRo: string;
  price: number;
  icon: string | null;
  allowMultiple: boolean;
}

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

interface PriceEstimate {
  hourlyRate: number;
  estimatedHours: number;
  propertyMultiplier: number;
  petsSurcharge: number;
  subtotal: number;
  extras: Array<{
    extra: { id: string; nameRo: string; price: number };
    quantity: number;
    lineTotal: number;
  }>;
  total: number;
  cityPricingMultiplier: number;
  pricingModel: string;
  areaTotal: number;
}

interface ExtraQty {
  extraId: string;
  quantity: number;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface SubscriptionPricing {
  perSessionOriginal: number;
  discountPct: number;
  perSessionDiscounted: number;
  sessionsPerMonth: number;
  monthlyAmount: number;
}

interface WizardForm {
  serviceType: string;
  numRooms: number;
  numBathrooms: number;
  propertyType: 'apartment' | 'house' | 'office';
  hasPets: boolean;
  areaSqm: string;
  // address
  selectedAddressId: string | null;
  newAddressStreet: string;
  newAddressCity: string;
  newAddressCounty: string;
  newAddressLabel: string;
  newAddressFloor: string;
  newAddressApartment: string;
  // date/time (one-time single slot)
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  // one-time multi-slot
  timeSlots: TimeSlot[];
  // subscription / recurring
  isRecurring: boolean;
  recurrenceType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | '';
  recurrenceDayOfWeek: number;
  preferredTimeStart: string;
  preferredTimeEnd: string;
  // extras
  extras: ExtraQty[];
  // guest fields
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  // special instructions
  specialInstructions: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} RON`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const MONTH_NAMES_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}


function slotToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToSlot(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepHeader({
  title,
  subtitle,
  s,
}: {
  title: string;
  subtitle?: string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.stepHeader}>
      <Text style={s.stepTitle}>{title}</Text>
      {subtitle ? <Text style={s.stepSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}


function SummaryRow({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.bookSummaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  placeholderColor,
  s,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  placeholderColor?: string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor ?? colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Total steps: 5 — step 2 combines property details + extras
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 5;

const EXTRA_ICON_MAP: Record<string, string> = {
  fridge:   'fridge',
  oven:     'stove',
  iron:     'iron',
  window:   'window-closed',
  windows:  'window-closed',
  dishes:   'silverware-fork-knife',
  trash:    'trash-can-outline',
  closet:   'wardrobe-outline',
  wardrobe: 'wardrobe-outline',
  carpet:   'rug',
  laundry:  'washing-machine',
  balcony:  'balcony',
  garage:   'garage',
};

export default function NewBookingScreen() {
  const { isAuthenticated } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = useMemo(() => makeStyles(dark), [dark]);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [calViewYear, setCalViewYear] = useState(() => new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(() => new Date().getMonth());
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Slider refs (created once, close over mutable refs)
  const sliderTrackWidth = useRef(Dimensions.get('window').width - spacing.base * 4);
  const sliderStartAtGrant = useRef(0);
  const sliderEndAtGrant = useRef(0);
  const sliderStartSlotRef = useRef(0);
  const sliderEndSlotRef = useRef(4);
  const sliderMinSlotsRef = useRef(4);

  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        sliderStartAtGrant.current = sliderStartSlotRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const TOTAL = 24;
        const min = sliderMinSlotsRef.current;
        const delta = (gs.dx / sliderTrackWidth.current) * TOTAL;
        const newStart = Math.round(Math.max(0, Math.min(TOTAL - min, sliderStartAtGrant.current + delta)));
        setValue('scheduledStartTime', minutesToSlot(480 + newStart * 30));
        if (sliderEndSlotRef.current < newStart + min) {
          setValue('scheduledEndTime', minutesToSlot(480 + Math.min(newStart + min, TOTAL) * 30));
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        sliderEndAtGrant.current = sliderEndSlotRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const TOTAL = 24;
        const min = sliderMinSlotsRef.current;
        const delta = (gs.dx / sliderTrackWidth.current) * TOTAL;
        const newEnd = Math.round(Math.max(min, Math.min(TOTAL, sliderEndAtGrant.current + delta)));
        setValue('scheduledEndTime', minutesToSlot(480 + newEnd * 30));
        if (sliderStartSlotRef.current > newEnd - min) {
          setValue('scheduledStartTime', minutesToSlot(480 + Math.max(0, newEnd - min) * 30));
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  function toggleSummary() {
    Animated.timing(expandAnim, {
      toValue: summaryExpanded ? 0 : 1,
      duration: 240,
      useNativeDriver: false,
    }).start();
    setSummaryExpanded((v) => !v);
  }

  const { control, watch, setValue, getValues, handleSubmit } =
    useForm<WizardForm>({
      defaultValues: {
        serviceType: '',
        numRooms: 2,
        numBathrooms: 1,
        propertyType: 'apartment',
        hasPets: false,
        areaSqm: '',
        selectedAddressId: null,
        newAddressStreet: '',
        newAddressCity: '',
        newAddressCounty: '',
        newAddressLabel: '',
        newAddressFloor: '',
        newAddressApartment: '',
        scheduledDate: '',
        scheduledStartTime: '',
        scheduledEndTime: '',
        timeSlots: [],
        isRecurring: false,
        recurrenceType: '',
        recurrenceDayOfWeek: 1,
        preferredTimeStart: '',
        preferredTimeEnd: '',
        extras: [],
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        specialInstructions: '',
      },
    });

  const watchedValues = watch();

  const { data: servicesData, loading: servicesLoading } = useQuery<{
    availableServices: Service[];
    availableExtras: Extra[];
  }>(AVAILABLE_SERVICES);

  const { data: addressesData, loading: addressesLoading } = useQuery<{
    myAddresses: SavedAddress[];
  }>(MY_ADDRESSES, {
    skip: !isAuthenticated,
  });

  const [fetchEstimate, { loading: estimateLoading }] = useLazyQuery<{
    estimatePrice: PriceEstimate;
  }>(ESTIMATE_PRICE, {
    onCompleted: (d) => setEstimate(d.estimatePrice),
  });

  const [addAddress, { loading: addAddressLoading }] = useMutation(ADD_ADDRESS);

  const [createBooking, { loading: createLoading }] = useMutation(
    CREATE_BOOKING,
    {
      onCompleted: (d) => {
        const booking = d.createBookingRequest as {
          id: string;
          referenceCode: string;
          estimatedTotal: number;
        };
        router.replace({
          pathname: '/new-booking/success',
          params: {
            bookingId: booking.id,
            referenceCode: booking.referenceCode,
            estimatedTotal: String(booking.estimatedTotal),
            isGuest: isAuthenticated ? '0' : '1',
          },
        });
      },
      onError: (err) => {
        setStepError(err.message);
      },
    }
  );

  const { data: discountsData } = useQuery<{
    recurringDiscounts: { recurrenceType: string; discountPct: number; isActive: boolean }[];
  }>(RECURRING_DISCOUNTS);

  const [fetchSubPricing, { data: subPricingData, loading: subPricingLoading }] = useLazyQuery<{
    subscriptionPricingPreview: SubscriptionPricing;
  }>(SUBSCRIPTION_PRICING_PREVIEW, { fetchPolicy: 'network-only' });

  const [createSubscription, { loading: createSubLoading }] = useMutation(CREATE_SUBSCRIPTION);

  const recurringDiscounts = (discountsData?.recurringDiscounts ?? []).filter((d) => d.isActive);
  const maxDiscount = recurringDiscounts.reduce((m, d) => Math.max(m, d.discountPct), 0);
  const subPricing: SubscriptionPricing | null = subPricingData?.subscriptionPricingPreview ?? null;

  const refreshEstimate = useCallback(
    (values: WizardForm) => {
      if (!values.serviceType) return;
      const extrasInput = values.extras
        .filter((e) => e.quantity > 0)
        .map((e) => ({ extraId: e.extraId, quantity: e.quantity }));
      fetchEstimate({
        variables: {
          input: {
            serviceType: values.serviceType,
            numRooms: values.numRooms,
            numBathrooms: values.numBathrooms,
            propertyType: values.propertyType,
            hasPets: values.hasPets,
            areaSqm: values.areaSqm ? parseInt(values.areaSqm, 10) : null,
            extras: extrasInput,
          },
        },
      });
    },
    [fetchEstimate]
  );

  useEffect(() => {
    if (!watchedValues.isRecurring || !watchedValues.recurrenceType || !watchedValues.serviceType) return;
    fetchSubPricing({
      variables: {
        serviceType: watchedValues.serviceType,
        recurrenceType: watchedValues.recurrenceType,
        numRooms: watchedValues.numRooms,
        numBathrooms: watchedValues.numBathrooms,
        areaSqm: watchedValues.areaSqm ? parseInt(watchedValues.areaSqm, 10) : undefined,
        propertyType: watchedValues.propertyType || undefined,
        hasPets: watchedValues.hasPets,
        extras: watchedValues.extras.filter((e) => e.quantity > 0),
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedValues.isRecurring,
    watchedValues.recurrenceType,
    watchedValues.serviceType,
    watchedValues.numRooms,
    watchedValues.numBathrooms,
    watchedValues.areaSqm,
    watchedValues.propertyType,
    watchedValues.hasPets,
    watchedValues.extras,
  ]);

  function validateStep(s: number, values: WizardForm): string | null {
    if (s === 1 && !values.serviceType) return 'Selecteaza un tip de serviciu.';
    if (s === 4) {
      if (!values.selectedAddressId) {
        if (!values.newAddressStreet.trim()) return 'Strada este obligatorie.';
        if (!values.newAddressCity.trim()) return 'Orasul este obligatoriu.';
        if (!values.newAddressCounty.trim()) return 'Judetul este obligatoriu.';
      }
    }
    if (s === 3) {
      if (values.isRecurring) {
        if (!values.recurrenceType) return 'Selectează frecvența abonamentului.';
        if (!values.recurrenceDayOfWeek) return 'Selectează ziua preferată.';
        if (!values.preferredTimeStart) return 'Selectează ora de start.';
        if (!values.preferredTimeEnd) return 'Selectează ora de sfârșit.';
      } else {
        if (values.timeSlots.length === 0) {
          if (!values.scheduledDate) return 'Selectează o dată.';
          if (!values.scheduledStartTime) return 'Selectează ora de start.';
          if (!values.scheduledEndTime) return 'Selectează ora de sfârșit.';
        }
      }
    }
    if (s === 5 && !isAuthenticated) {
      if (!values.guestName.trim()) return 'Numele este obligatoriu.';
      if (!values.guestEmail.trim()) return 'Emailul este obligatoriu.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.guestEmail.trim()))
        return 'Adresa de email nu este valida.';
      if (!values.guestPhone.trim()) return 'Numarul de telefon este obligatoriu.';
    }
    return null;
  }

  function goNext() {
    const values = getValues();
    const err = validateStep(step, values);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step >= 1) refreshEstimate(values);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onSubmit(values: WizardForm) {
    setStepError(null);

    const extrasInput = values.extras
      .filter((e) => e.quantity > 0)
      .map((e) => ({ extraId: e.extraId, quantity: e.quantity }));

    // ── Subscription flow ─────────────────────────────────────────────────────
    if (values.isRecurring && values.recurrenceType) {
      let resolvedStreet = values.newAddressStreet.trim();
      let resolvedCity = values.newAddressCity.trim();
      let resolvedCounty = values.newAddressCounty.trim();
      let resolvedFloor = values.newAddressFloor.trim() || null;
      let resolvedApartment = values.newAddressApartment.trim() || null;

      if (isAuthenticated && values.selectedAddressId) {
        const saved = addressesData?.myAddresses?.find((a) => a.id === values.selectedAddressId);
        if (saved) {
          resolvedStreet = saved.streetAddress;
          resolvedCity = saved.city;
          resolvedCounty = saved.county;
          resolvedFloor = saved.floor ?? null;
          resolvedApartment = saved.apartment ?? null;
        }
      } else if (isAuthenticated && !values.selectedAddressId) {
        try {
          await addAddress({
            variables: {
              input: {
                label: values.newAddressLabel.trim() || 'Adresa mea',
                streetAddress: resolvedStreet,
                city: resolvedCity,
                county: resolvedCounty,
                floor: resolvedFloor,
                apartment: resolvedApartment,
              },
            },
          });
        } catch (err: unknown) {
          setStepError(err instanceof Error ? err.message : 'Eroare la salvarea adresei.');
          return;
        }
      }

      try {
        await createSubscription({
          variables: {
            input: {
              serviceType: values.serviceType,
              recurrenceType: values.recurrenceType,
              dayOfWeek: values.recurrenceDayOfWeek,
              preferredTime: values.preferredTimeStart || '09:00',
              propertyType: values.propertyType || undefined,
              numRooms: values.numRooms,
              numBathrooms: values.numBathrooms,
              areaSqm: values.areaSqm ? parseInt(values.areaSqm, 10) : undefined,
              hasPets: values.hasPets,
              specialInstructions: values.specialInstructions.trim() || undefined,
              extras: extrasInput.length > 0 ? extrasInput : undefined,
              streetAddress: resolvedStreet,
              city: resolvedCity,
              county: resolvedCounty,
              floor: resolvedFloor,
              apartment: resolvedApartment,
            },
          },
        });
        router.replace({
          pathname: '/new-booking/success',
          params: {
            bookingId: '',
            referenceCode: '',
            estimatedTotal: subPricing ? String(subPricing.monthlyAmount) : '0',
            isGuest: isAuthenticated ? '0' : '1',
            isSubscription: '1',
          },
        });
      } catch (err: unknown) {
        setStepError(err instanceof Error ? err.message : 'Eroare la crearea abonamentului.');
      }
      return;
    }

    // ── One-time booking flow ─────────────────────────────────────────────────
    const slot =
      values.timeSlots.length > 0
        ? values.timeSlots[0]
        : { date: values.scheduledDate, startTime: values.scheduledStartTime, endTime: '' };

    const bookingFields = {
      serviceType: values.serviceType,
      scheduledDate: slot.date,
      scheduledStartTime: slot.startTime,
      propertyType: values.propertyType,
      numRooms: values.numRooms,
      numBathrooms: values.numBathrooms,
      areaSqm: values.areaSqm ? parseInt(values.areaSqm, 10) : null,
      hasPets: values.hasPets,
      extras: extrasInput.length > 0 ? extrasInput : null,
      specialInstructions: values.specialInstructions.trim() || null,
    };

    if (isAuthenticated) {
      let addressId = values.selectedAddressId;
      if (!addressId) {
        try {
          const result = await addAddress({
            variables: {
              input: {
                label: values.newAddressLabel.trim() || 'Adresa mea',
                streetAddress: values.newAddressStreet.trim(),
                city: values.newAddressCity.trim(),
                county: values.newAddressCounty.trim(),
                floor: values.newAddressFloor.trim() || null,
                apartment: values.newAddressApartment.trim() || null,
              },
            },
          });
          addressId = result.data?.addAddress?.id ?? null;
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Eroare la salvarea adresei.';
          setStepError(message);
          return;
        }
      }
      createBooking({ variables: { input: { addressId, ...bookingFields } } });
    } else {
      createBooking({
        variables: {
          input: {
            address: {
              label: 'Adresa rezervare',
              streetAddress: values.newAddressStreet.trim(),
              city: values.newAddressCity.trim(),
              county: values.newAddressCounty.trim(),
              floor: values.newAddressFloor.trim() || null,
              apartment: values.newAddressApartment.trim() || null,
            },
            guestName: values.guestName.trim(),
            guestEmail: values.guestEmail.trim().toLowerCase(),
            guestPhone: values.guestPhone.trim(),
            ...bookingFields,
          },
        },
      });
    }
  }

  // ── Step renders ──────────────────────────────────────────────────────────

  function renderStep1() {
    if (servicesLoading) {
      return (
        <View style={s.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    const services = servicesData?.availableServices ?? [];
    return (
      <>
        <StepHeader
          title="Ce serviciu doresti?"
          subtitle="Selecteaza tipul de curatenie de care ai nevoie."
          s={s}
        />
        <View style={s.serviceList}>
          {services.map((svc) => {
            const selected = watchedValues.serviceType === svc.serviceType;
            const icon = SERVICE_ICONS[svc.serviceType] ?? '🧹';
            const isRecommended = svc.serviceType === 'STANDARD_CLEANING';
            return (
              <Pressable
                key={svc.id}
                style={[s.serviceCard, selected && s.serviceCardSelected]}
                onPress={() => {
                  setValue('serviceType', svc.serviceType);
                  setStepError(null);
                  refreshEstimate({ ...getValues(), serviceType: svc.serviceType });
                }}
              >
                {isRecommended && (
                  <View style={s.recommendedBadge}>
                    <Text style={s.recommendedBadgeText}>Recomandat</Text>
                  </View>
                )}
                <View style={s.serviceCardHeader}>
                  <View style={s.serviceCardLeft}>
                    <Text style={s.serviceIcon}>{icon}</Text>
                    <View style={s.serviceCardInfo}>
                      <Text style={[s.serviceName, selected && s.serviceNameSelected]}>
                        {svc.nameRo}
                      </Text>
                      <View style={s.servicePriceRow}>
                        <Text style={[s.servicePriceBold, selected && s.servicePriceBoldSelected]}>
                          {svc.basePricePerHour.toFixed(0)} RON
                        </Text>
                        <Text style={s.servicePriceSub}>/oră</Text>
                        <Text style={s.servicePriceSub}>
                          {'  ·  '}min. {svc.minHours} ore
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selected && (
                    <View style={s.serviceCheckCircle}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                {svc.includedItems?.length > 0 && (
                  <View style={s.serviceFeatures}>
                    {svc.includedItems.map((item) => (
                      <View key={item} style={s.serviceFeatureRow}>
                        <Feather name="check" size={12} color={colors.secondary} style={s.serviceFeatureIcon} />
                        <Text style={s.serviceFeatureText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </>
    );
  }

  function renderStep2() {
    const extras = servicesData?.availableExtras ?? [];
    const extrasMap = new Map(watchedValues.extras.map((e) => [e.extraId, e.quantity]));

    function getQty(extraId: string): number {
      return extrasMap.get(extraId) ?? 0;
    }

    function setQty(extraId: string, qty: number) {
      const current = getValues('extras');
      const existing = current.findIndex((e) => e.extraId === extraId);
      let updated: ExtraQty[];
      if (existing >= 0) {
        updated = current.map((e) => (e.extraId === extraId ? { ...e, quantity: qty } : e));
      } else {
        updated = [...current, { extraId, quantity: qty }];
      }
      const filtered = updated.filter((e) => e.quantity > 0);
      setValue('extras', filtered);
      refreshEstimate({ ...getValues(), extras: updated });
    }

    return (
      <>
        <StepHeader
          title="Detalii proprietate"
          subtitle="Ajuta-ne sa estimam corect durata si pretul."
          s={s}
        />
        <PlatformCard style={s.formCard}>
          {/* Property type cards */}
          <Text style={s.fieldLabel}>Tip proprietate</Text>
          <View style={s.propTypeRow}>
            {([
              { value: 'apartment', label: 'Apartament', icon: 'office-building' },
              { value: 'house',     label: 'Casa',        icon: 'home' },
              { value: 'office',    label: 'Birou',       icon: 'briefcase' },
            ] as const).map(({ value: type, label, icon }) => {
              const active = watchedValues.propertyType === type;
              return (
                <Pressable
                  key={type}
                  style={[s.propTypeCard, active && s.propTypeCardActive]}
                  onPress={() => { setValue('propertyType', type); refreshEstimate({ ...getValues(), propertyType: type }); }}
                >
                  {active && (
                    <View style={s.propTypeCheck}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                  <MaterialCommunityIcons
                    name={icon}
                    size={28}
                    color={active ? colors.primary : (dark ? '#9CA3AF' : colors.textSecondary)}
                  />
                  <Text style={[s.propTypeLabel, active && s.propTypeLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Rooms + bathrooms side by side */}
          <View style={s.counterGrid}>
            <View style={s.counterCol}>
              <Text style={s.fieldLabel}>Număr camere</Text>
              <Controller
                control={control}
                name="numRooms"
                render={({ field }) => (
                  <View style={s.counterControls}>
                    <Pressable
                      style={[s.stepperBtn, field.value <= 1 && s.stepperBtnDisabled]}
                      onPress={() => { if (field.value > 1) { field.onChange(field.value - 1); refreshEstimate({ ...getValues(), numRooms: field.value - 1 }); } }}
                      hitSlop={8}
                    >
                      <Text style={s.stepperBtnText}>{'−'}</Text>
                    </Pressable>
                    <Text style={s.counterValue}>{field.value}</Text>
                    <Pressable
                      style={[s.stepperBtn, field.value >= 8 && s.stepperBtnDisabled]}
                      onPress={() => { if (field.value < 8) { field.onChange(field.value + 1); refreshEstimate({ ...getValues(), numRooms: field.value + 1 }); } }}
                      hitSlop={8}
                    >
                      <Text style={s.stepperBtnText}>{'+'}</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
            <View style={s.counterDivider} />
            <View style={s.counterCol}>
              <Text style={s.fieldLabel}>Număr băi</Text>
              <Controller
                control={control}
                name="numBathrooms"
                render={({ field }) => (
                  <View style={s.counterControls}>
                    <Pressable
                      style={[s.stepperBtn, field.value <= 1 && s.stepperBtnDisabled]}
                      onPress={() => { if (field.value > 1) { field.onChange(field.value - 1); refreshEstimate({ ...getValues(), numBathrooms: field.value - 1 }); } }}
                      hitSlop={8}
                    >
                      <Text style={s.stepperBtnText}>{'−'}</Text>
                    </Pressable>
                    <Text style={s.counterValue}>{field.value}</Text>
                    <Pressable
                      style={[s.stepperBtn, field.value >= 4 && s.stepperBtnDisabled]}
                      onPress={() => { if (field.value < 4) { field.onChange(field.value + 1); refreshEstimate({ ...getValues(), numBathrooms: field.value + 1 }); } }}
                      hitSlop={8}
                    >
                      <Text style={s.stepperBtnText}>{'+'}</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          </View>

          {/* Surface */}
          <View style={[s.fieldGroup, { marginTop: spacing.sm }]}>
            <Text style={s.fieldLabel}>Suprafata (m²) *</Text>
            <Controller
              control={control}
              name="areaSqm"
              render={({ field }) => (
                <TextInput
                  style={s.input}
                  placeholder="Ex: 65"
                  placeholderTextColor={dark ? '#4B5563' : colors.textSecondary}
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={(v) => { field.onChange(v); refreshEstimate({ ...getValues(), areaSqm: v }); }}
                />
              )}
            />
          </View>

          {/* Pets */}
          <View style={[s.fieldGroup, { marginTop: spacing.sm }]}>
            <Text style={s.fieldLabel}>Animale de companie</Text>
            <Pressable
              style={[s.petsBtn, watchedValues.hasPets && s.petsBtnActive]}
              onPress={() => { const next = !watchedValues.hasPets; setValue('hasPets', next); refreshEstimate({ ...getValues(), hasPets: next }); }}
            >
              <Text style={s.petsEmoji}>🐾</Text>
              <Text style={[s.petsBtnText, watchedValues.hasPets && s.petsBtnTextActive]}>
                Am animale de companie
              </Text>
              {watchedValues.hasPets && (
                <View style={s.petsCheck}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>
        </PlatformCard>

        {extras.length > 0 && (
          <>
            <View style={s.extrasSectionHeader}>
              <Text style={s.extrasSectionTitle}>Servicii extra</Text>
              <Text style={s.extrasSectionSubtitle}>Adauga optiuni pentru o curatenie mai completa.</Text>
            </View>
            <View style={s.extrasGrid}>
              {extras.map((extra) => {
                const qty = getQty(extra.id);
                const isSelected = qty > 0;
                const iconName = EXTRA_ICON_MAP[extra.icon ?? ''] ?? 'star-outline';
                return (
                  <Pressable
                    key={extra.id}
                    style={[s.extraGridCard, isSelected && s.extraGridCardSelected]}
                    onPress={() => !extra.allowMultiple && setQty(extra.id, isSelected ? 0 : 1)}
                  >
                    <View style={s.extraGridTop}>
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={26}
                        color={isSelected ? colors.primary : (dark ? '#9CA3AF' : colors.textSecondary)}
                        style={s.extraGridEmoji}
                      />
                      <View style={s.extraGridAction}>
                        {extra.allowMultiple ? (
                          <View style={s.extraGridStepper}>
                            <Pressable
                              hitSlop={8}
                              style={[s.extraGridBtn, qty === 0 && s.extraGridBtnDisabled]}
                              onPress={() => qty > 0 && setQty(extra.id, qty - 1)}
                            >
                              <Feather name="minus" size={12} color={qty === 0 ? '#9CA3AF' : '#fff'} />
                            </Pressable>
                            <Text style={s.extraGridQty}>{qty}</Text>
                            <Pressable
                              hitSlop={8}
                              style={s.extraGridBtn}
                              onPress={() => setQty(extra.id, qty + 1)}
                            >
                              <Feather name="plus" size={12} color="#fff" />
                            </Pressable>
                          </View>
                        ) : (
                          <View style={[s.extraGridToggle, isSelected && s.extraGridToggleOn]}>
                            {isSelected
                              ? <Feather name="check" size={13} color="#fff" />
                              : <Feather name="plus" size={13} color={colors.primary} />}
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[s.extraGridName, isSelected && s.extraGridNameSelected]} numberOfLines={2}>
                      {extra.nameRo}
                    </Text>
                    <Text style={s.extraGridPrice}>+{extra.price.toFixed(0)} RON</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </>
    );
  }

  function renderStep3() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toISODate(today);

    const calDays = buildCalendarDays(calViewYear, calViewMonth);
    const selectedDate = watchedValues.scheduledDate;
    const selectedStart = watchedValues.scheduledStartTime;
    const isRecurring = watchedValues.isRecurring;

    const minDuration = estimate?.estimatedHours ?? 2;
    const minSlots = Math.ceil(minDuration * 2); // each slot = 30 min

    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth();
    const canGoPrev =
      calViewYear > nowYear || (calViewYear === nowYear && calViewMonth > nowMonth);

    function prevMonth() {
      if (!canGoPrev) return;
      if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear((y) => y - 1); }
      else setCalViewMonth((m) => m - 1);
    }
    function nextMonth() {
      if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear((y) => y + 1); }
      else setCalViewMonth((m) => m + 1);
    }

    const FREQ_OPTIONS: { value: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'; label: string }[] = [
      { value: 'WEEKLY', label: 'Săptămânal' },
      { value: 'BIWEEKLY', label: 'Bisăptămânal' },
      { value: 'MONTHLY', label: 'Lunar' },
    ];

    const DAY_LABELS_FULL = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    const recurrenceTypeLabel =
      FREQ_OPTIONS.find((f) => f.value === watchedValues.recurrenceType)?.label ?? 'recurent';

    function renderCalendar(onDayPress: (iso: string) => void, selectedIso: string) {
      return (
        <PlatformCard style={s.calCard}>
          <View style={s.calHeader}>
            <Pressable onPress={prevMonth} hitSlop={12} style={[s.calNavBtn, !canGoPrev && s.calNavBtnDisabled]}>
              <Feather name="chevron-left" size={20} color={canGoPrev ? (dark ? '#F9FAFB' : colors.textPrimary) : (dark ? '#374151' : colors.border)} />
            </Pressable>
            <Text style={s.calMonthLabel}>{MONTH_NAMES_RO[calViewMonth]} {calViewYear}</Text>
            <Pressable onPress={nextMonth} hitSlop={12} style={s.calNavBtn}>
              <Feather name="chevron-right" size={20} color={dark ? '#F9FAFB' : colors.textPrimary} />
            </Pressable>
          </View>
          <View style={s.calWeekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={s.calWeekLabel}>{d}</Text>
            ))}
          </View>
          <View style={s.calGrid}>
            {calDays.map((d, i) => {
              if (!d) return <View key={`empty-${i}`} style={s.calDay} />;
              const iso = toISODate(d);
              const isPast = iso <= todayIso;
              const isToday = iso === todayIso;
              const isSelected = iso === selectedIso;
              const hasSlot = watchedValues.timeSlots.some((sl) => sl.date === iso);
              return (
                <Pressable
                  key={iso}
                  style={[s.calDay, isToday && s.calDayToday, isSelected && s.calDaySelected, isPast && s.calDayPast]}
                  onPress={() => { if (isPast) return; onDayPress(iso); }}
                  disabled={isPast}
                >
                  <Text style={[s.calDayText, isSelected && s.calDayTextSelected]}>{d.getDate()}</Text>
                  {hasSlot && !isSelected && <View style={s.calDayDot} />}
                </Pressable>
              );
            })}
          </View>
        </PlatformCard>
      );
    }

    return (
      <>
        <StepHeader title="Data și ora" subtitle="Când dorești să vină echipa?" s={s} />

        {/* Duration banner */}
        {estimate && (
          <View style={s.durationBanner}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={s.durationBannerText}>
              <Text style={{ fontWeight: '700' }}>Durată estimată: ~{estimate.estimatedHours} ore{'  '}</Text>
              Alege un interval de minim {estimate.estimatedHours} ore
            </Text>
          </View>
        )}

        {/* Booking type toggle */}
        <View style={s.bookingTypeRow}>
          {/* One-time */}
          <Pressable
            style={[s.bookingTypeCard, !isRecurring && s.bookingTypeCardActiveBlue]}
            onPress={() => { setValue('isRecurring', false); setValue('recurrenceType', ''); }}
          >
            <Feather name="calendar" size={22} color={!isRecurring ? colors.primary : (dark ? '#9CA3AF' : colors.textSecondary)} />
            <Text style={[s.bookingTypeLabel, !isRecurring && { color: colors.primary }]}>O singură dată</Text>
            <Text style={s.bookingTypeSub}>Alegi data și ora exactă</Text>
          </Pressable>

          {/* Recurring */}
          <Pressable
            style={[s.bookingTypeCard, isRecurring && s.bookingTypeCardActiveGreen]}
            onPress={() => {
              setValue('isRecurring', true);
              if (!watchedValues.recurrenceType) setValue('recurrenceType', 'WEEKLY');
            }}
          >
            {!isRecurring && (
              <View style={s.bookingTypeBadge}>
                <Text style={s.bookingTypeBadgeText}>RECOMANDAT</Text>
              </View>
            )}
            <MaterialCommunityIcons
              name="repeat"
              size={22}
              color={isRecurring ? colors.secondary : (dark ? '#9CA3AF' : colors.textSecondary)}
            />
            <Text style={[s.bookingTypeLabel, isRecurring && { color: colors.secondary }]}>Abonament recurent</Text>
            <Text style={s.bookingTypeSub}>
              {maxDiscount > 0 ? `Economisești până la ${maxDiscount}%` : 'Plată automată lunară'}
            </Text>
          </Pressable>
        </View>

        {/* ── ONE-TIME PATH ─────────────────────────────────────────── */}
        {!isRecurring && (
          <>
            {renderCalendar((iso) => {
              setValue('scheduledDate', iso);
              setValue('scheduledStartTime', '');
              setValue('scheduledEndTime', '');
            }, selectedDate)}

            {/* Time range slider — shown after date picked */}
            {selectedDate && (() => {
              const TOTAL = 24;
              const startSlot = selectedStart
                ? Math.round((slotToMinutes(selectedStart) - 480) / 30)
                : 0;
              const endSlot = watchedValues.scheduledEndTime
                ? Math.round((slotToMinutes(watchedValues.scheduledEndTime) - 480) / 30)
                : Math.min(minSlots, TOTAL);

              sliderStartSlotRef.current = startSlot;
              sliderEndSlotRef.current = endSlot;
              sliderMinSlotsRef.current = minSlots;

              const trackW = sliderTrackWidth.current;
              const THUMB_R = 14;
              const startPx = (startSlot / TOTAL) * trackW;
              const endPx   = (endSlot / TOTAL) * trackW;

              const durSlots = endSlot - startSlot;
              const durH = Math.floor(durSlots / 2);
              const durM = (durSlots % 2) * 30;
              const durLabel = durM > 0 ? `${durH}h ${durM}min` : `${durH}h`;

              const startTimeStr = minutesToSlot(480 + startSlot * 30);
              const endTimeStr   = minutesToSlot(480 + endSlot * 30);

              const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ro-RO', {
                day: 'numeric', month: 'long', year: 'numeric',
              });

              return (
                <PlatformCard style={[s.formCard, { marginTop: spacing.sm }]}>
                  <Text style={s.sliderDateLabel}>Interval pentru {dateLabel}</Text>
                  <View style={s.sliderTimesRow}>
                    <View>
                      <Text style={s.sliderTimeLabel}>ORA INCEPUT</Text>
                      <Text style={s.sliderTimeValue}>{startTimeStr}</Text>
                    </View>
                    <View style={s.sliderDurationPill}>
                      <Feather name="clock" size={13} color={colors.secondary} />
                      <Text style={s.sliderDurationText}>{durLabel}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.sliderTimeLabel}>ORA SFÂRȘIT</Text>
                      <Text style={s.sliderTimeValue}>{endTimeStr}</Text>
                    </View>
                  </View>
                  <View
                    style={s.sliderContainer}
                    onLayout={(e) => { sliderTrackWidth.current = e.nativeEvent.layout.width; }}
                  >
                    <View style={s.sliderTrackBg} />
                    <View style={[s.sliderFill, { left: startPx, width: endPx - startPx }]} />
                    <View style={[s.sliderThumb, { left: startPx - THUMB_R }]} {...startPanResponder.panHandlers} />
                    <View style={[s.sliderThumb, { left: endPx - THUMB_R }]} {...endPanResponder.panHandlers} />
                  </View>
                  <View style={s.sliderMarkers}>
                    {['08:00', '11:00', '14:00', '17:00', '20:00'].map((t) => (
                      <Text key={t} style={s.sliderMarkerText}>{t}</Text>
                    ))}
                  </View>

                  {/* Add slot button */}
                  <Pressable
                    style={[s.addSlotBtn, watchedValues.timeSlots.length >= 5 && s.addSlotBtnDisabled]}
                    onPress={() => {
                      if (watchedValues.timeSlots.length >= 5) return;
                      const newSlot: TimeSlot = {
                        date: watchedValues.scheduledDate,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                      };
                      setValue('timeSlots', [...watchedValues.timeSlots, newSlot]);
                      setValue('scheduledDate', '');
                      setValue('scheduledStartTime', '');
                      setValue('scheduledEndTime', '');
                    }}
                    disabled={watchedValues.timeSlots.length >= 5}
                  >
                    <Feather name="plus" size={16} color={watchedValues.timeSlots.length >= 5 ? (dark ? '#4B5563' : colors.border) : colors.primary} />
                    <Text style={[s.addSlotBtnText, watchedValues.timeSlots.length >= 5 && s.addSlotBtnTextDisabled]}>
                      Adaugă interval ({watchedValues.timeSlots.length}/5)
                    </Text>
                  </Pressable>
                </PlatformCard>
              );
            })()}

            {/* Slot list */}
            {watchedValues.timeSlots.length > 0 && (
              <PlatformCard style={s.formCard}>
                <Text style={s.slotListHeader}>Intervale selectate</Text>
                {watchedValues.timeSlots.map((slot, idx) => {
                  const d = new Date(slot.date + 'T12:00:00');
                  const dateStr = d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
                  return (
                    <View key={idx} style={[s.slotRow, idx < watchedValues.timeSlots.length - 1 && s.slotRowBorder]}>
                      <Feather name="calendar" size={15} color={dark ? '#9CA3AF' : colors.textSecondary} />
                      <Text style={s.slotRowDate}>{dateStr}</Text>
                      <Text style={s.slotRowTime}>{slot.startTime}–{slot.endTime}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setValue('timeSlots', watchedValues.timeSlots.filter((_, i) => i !== idx))}
                      >
                        <Feather name="x" size={16} color={dark ? '#9CA3AF' : colors.textSecondary} />
                      </Pressable>
                    </View>
                  );
                })}
              </PlatformCard>
            )}
          </>
        )}

        {/* ── RECURRING PATH ─────────────────────────────────────────── */}
        {isRecurring && (
          <>
            {/* Frequency selector */}
            <PlatformCard style={s.formCard}>
              <Text style={s.fieldLabel}>Frecvență</Text>
              <View style={s.freqRow}>
                {FREQ_OPTIONS.map((opt) => {
                  const active = watchedValues.recurrenceType === opt.value;
                  const disc = recurringDiscounts.find((d) => d.recurrenceType === opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      style={[s.freqBtn, active && s.freqBtnActive]}
                      onPress={() => setValue('recurrenceType', opt.value)}
                    >
                      <Text style={[s.freqBtnLabel, active && s.freqBtnLabelActive]}>{opt.label}</Text>
                      {disc && disc.discountPct > 0 && (
                        <Text style={[s.freqBtnDiscount, active && { color: '#A7F3D0' }]}>-{disc.discountPct}%</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Day of week */}
              <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>Ziua preferată</Text>
              <View style={s.dayRow}>
                {DAY_LABELS_FULL.map((day, idx) => {
                  const active = watchedValues.recurrenceDayOfWeek === idx + 1;
                  return (
                    <Pressable
                      key={day}
                      style={[s.dayBtn, active && s.dayBtnActive]}
                      onPress={() => setValue('recurrenceDayOfWeek', idx + 1)}
                    >
                      <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>
                        {day.slice(0, 2)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Preferred time window */}
              <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>Interval orar preferat</Text>
              <View style={s.recurTimeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recurTimeSubLabel}>Ora de start</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.timeChipScroll}>
                    {(() => {
                      const maxStartMins = 20 * 60 - minSlots * 30;
                      const slots: string[] = [];
                      for (let m = 8 * 60; m <= maxStartMins; m += 30) slots.push(minutesToSlot(m));
                      return slots.map((t) => {
                        const active = watchedValues.preferredTimeStart === t;
                        return (
                          <Pressable
                            key={t}
                            style={[s.timeChipRecur, active && s.timeChipRecurActive]}
                            onPress={() => {
                              setValue('preferredTimeStart', t);
                              const autoEnd = minutesToSlot(Math.min(slotToMinutes(t) + minSlots * 30, 20 * 60));
                              setValue('preferredTimeEnd', autoEnd);
                            }}
                          >
                            <Text style={[s.timeChipText, active && s.timeChipTextActive]}>{t}</Text>
                          </Pressable>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>
              </View>
              {watchedValues.preferredTimeStart && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={s.recurTimeSubLabel}>Ora de sfârșit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.timeChipScroll}>
                    {(() => {
                      const minEndMins = slotToMinutes(watchedValues.preferredTimeStart) + minSlots * 30;
                      const slots: string[] = [];
                      for (let m = minEndMins; m <= 20 * 60; m += 30) slots.push(minutesToSlot(m));
                      return slots.map((t) => {
                        const active = watchedValues.preferredTimeEnd === t;
                        return (
                          <Pressable
                            key={t}
                            style={[s.timeChipRecur, active && s.timeChipRecurActive]}
                            onPress={() => setValue('preferredTimeEnd', t)}
                          >
                            <Text style={[s.timeChipText, active && s.timeChipTextActive]}>{t}</Text>
                          </Pressable>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>
              )}
            </PlatformCard>

            {/* Subscription pricing preview */}
            {watchedValues.recurrenceType !== '' && (
              <PlatformCard style={s.subPricingCard}>
                {subPricingLoading ? (
                  <View style={s.subPricingLoading}>
                    <ActivityIndicator size="small" color={colors.secondary} />
                    <Text style={s.subPricingLoadingText}>Se calculează prețul abonamentului...</Text>
                  </View>
                ) : subPricing ? (
                  <>
                    <Text style={s.subPricingTitle}>Abonament {recurrenceTypeLabel}</Text>
                    <View style={s.subPricingRow}>
                      <Text style={s.subPricingLabel}>Per sesiune (original)</Text>
                      <Text style={s.subPricingValue}>{subPricing.perSessionOriginal.toFixed(2)} RON</Text>
                    </View>
                    <View style={s.subPricingRow}>
                      <Text style={s.subPricingLabel}>Reducere</Text>
                      <Text style={[s.subPricingValue, { color: colors.secondary }]}>-{subPricing.discountPct}%</Text>
                    </View>
                    <View style={s.subPricingRow}>
                      <Text style={s.subPricingLabel}>Per sesiune (redus)</Text>
                      <Text style={s.subPricingValue}>{subPricing.perSessionDiscounted.toFixed(2)} RON</Text>
                    </View>
                    <View style={s.subPricingRow}>
                      <Text style={s.subPricingLabel}>Sesiuni/lună</Text>
                      <Text style={s.subPricingValue}>{subPricing.sessionsPerMonth}</Text>
                    </View>
                    <View style={s.subPricingSep} />
                    <View style={s.subPricingRow}>
                      <Text style={s.subPricingTotalLabel}>Total lunar</Text>
                      <Text style={s.subPricingTotalValue}>{subPricing.monthlyAmount.toFixed(2)} RON/lună</Text>
                    </View>
                    <Text style={s.subPricingNote}>Plata se procesează automat prin Stripe</Text>
                  </>
                ) : (
                  <View style={s.subPricingFallback}>
                    <MaterialCommunityIcons name="repeat" size={22} color={colors.secondary} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.subPricingFallbackTitle}>Abonament lunar cu plată automată</Text>
                      <Text style={s.subPricingFallbackSub}>Cel mai potrivit lucrător va fi alocat automat pe baza disponibilității.</Text>
                    </View>
                  </View>
                )}
              </PlatformCard>
            )}
          </>
        )}
      </>
    );
  }

  function renderStep4() {
    const addresses = addressesData?.myAddresses ?? [];
    const addingNew = watchedValues.selectedAddressId === null;

    if (isAuthenticated && addressesLoading) {
      return (
        <View style={s.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return (
      <>
        <StepHeader title="Adresa" subtitle="Unde efectuam curatenia?"
          s={s} />

        {/* Saved addresses — only for authenticated users */}
        {isAuthenticated && addresses.map((addr) => {
          const selected = watchedValues.selectedAddressId === addr.id;
          return (
            <Pressable key={addr.id} onPress={() => setValue('selectedAddressId', addr.id)}>
              <PlatformCard style={[s.addressCard, selected && s.addressCardSelected]}>
                <View style={s.addressRow}>
                  <View style={s.radioOuter}>
                    {selected && <View style={s.radioInner} />}
                  </View>
                  <View style={s.addressInfo}>
                    {addr.label ? <Text style={s.addressLabel}>{addr.label}</Text> : null}
                    <Text style={s.addressStreet}>
                      {addr.streetAddress}
                      {addr.floor ? `, et. ${addr.floor}` : ''}
                      {addr.apartment ? `, ap. ${addr.apartment}` : ''}
                    </Text>
                    <Text style={s.addressCity}>{addr.city}, {addr.county}</Text>
                    {addr.isDefault && <Text style={s.defaultTag}>Implicita</Text>}
                  </View>
                </View>
              </PlatformCard>
            </Pressable>
          );
        })}

        {/* Add new address option — for authenticated only */}
        {isAuthenticated && (
          <Pressable onPress={() => setValue('selectedAddressId', null)}>
            <PlatformCard style={[s.addressCard, addingNew && s.addressCardSelected]}>
              <View style={s.addressRow}>
                <View style={s.radioOuter}>
                  {addingNew && <View style={s.radioInner} />}
                </View>
                <Text style={s.addNewLabel}>+ Adauga adresa noua</Text>
              </View>
            </PlatformCard>
          </Pressable>
        )}

        {/* New address form — always visible for guests, optional for auth */}
        {(!isAuthenticated || addingNew) && (
          <PlatformCard style={s.formCard}>
            {!isAuthenticated && (
              <Text style={s.addressFormNote}>
                Introdu adresa unde doresti sa efectuam curatenia.
              </Text>
            )}
            {(
              [
                { name: 'newAddressStreet', label: 'Strada si numar *', placeholder: 'Ex: Str. Florilor nr. 10' },
                { name: 'newAddressCity', label: 'Oras *', placeholder: 'Ex: Cluj-Napoca' },
                { name: 'newAddressCounty', label: 'Judet *', placeholder: 'Ex: Cluj' },
                { name: 'newAddressFloor', label: 'Etaj', placeholder: 'Ex: 3' },
                { name: 'newAddressApartment', label: 'Apartament', placeholder: 'Ex: 12' },
              ] as Array<{ name: keyof WizardForm; label: string; placeholder: string }>
            ).map(({ name, label, placeholder }) => (
              <View key={name} style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{label}</Text>
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <TextInput
                      style={s.input}
                      placeholder={placeholder}
                      placeholderTextColor={dark ? '#4B5563' : colors.textSecondary}
                      value={String(field.value ?? '')}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </View>
            ))}
          </PlatformCard>
        )}
      </>
    );
  }

  function renderStep5() {
    const values = watchedValues;
    const addresses = addressesData?.myAddresses ?? [];
    const selectedAddr = addresses.find((a) => a.id === values.selectedAddressId);
    const services = servicesData?.availableServices ?? [];
    const service = services.find((s) => s.serviceType === values.serviceType);

    return (
      <>
        <StepHeader
          title={isAuthenticated ? 'Confirma rezervarea' : 'Datele tale de contact'}
          subtitle={
            isAuthenticated
              ? 'Verifica detaliile inainte de a trimite.'
              : 'Vom folosi aceste date pentru a te contacta in legatura cu rezervarea.'
          }
          s={s}
        />

        {/* Guest info form */}
        {!isAuthenticated && (
          <PlatformCard style={s.formCard}>
            <Controller
              control={control}
              name="guestName"
              render={({ field }) => (
                <FormField
                  label="Nume complet *"
                  placeholder="Ex: Ion Popescu"
                  value={field.value}
                  onChangeText={field.onChange}
                  autoCapitalize="words"
                  s={s}
                />
              )}
            />
            <Controller
              control={control}
              name="guestEmail"
              render={({ field }) => (
                <FormField
                  label="Email *"
                  placeholder="email@exemplu.ro"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  s={s}
                />
              )}
            />
            <Controller
              control={control}
              name="guestPhone"
              render={({ field }) => (
                <FormField
                  label="Numar de telefon *"
                  placeholder="07xx xxx xxx"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                  s={s}
                />
              )}
            />
          </PlatformCard>
        )}

        {/* Booking summary */}
        <PlatformCard style={s.formCard}>
          <SummaryRow label="Serviciu" value={service?.nameRo ?? values.serviceType} s={s} />
          <SummaryRow
            label="Proprietate"
            value={`${values.propertyType === 'apartment' ? 'Apartament' : values.propertyType === 'house' ? 'Casa' : 'Birou'}, ${values.numRooms} cam, ${values.numBathrooms} bai`} s={s}
          />
          {selectedAddr ? (
            <SummaryRow label="Adresa" value={`${selectedAddr.streetAddress}, ${selectedAddr.city}`} s={s} />
          ) : (
            <SummaryRow label="Adresa" value={`${values.newAddressStreet}, ${values.newAddressCity}`} s={s} />
          )}
          {values.isRecurring ? (
            <>
              <SummaryRow label="Tip" value="Abonament recurent" s={s} />
              <SummaryRow
                label="Frecvență"
                value={values.recurrenceType === 'WEEKLY' ? 'Săptămânal' : values.recurrenceType === 'BIWEEKLY' ? 'Bisăptămânal' : 'Lunar'}
                s={s}
              />
              <SummaryRow
                label="Ziua"
                value={['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'][values.recurrenceDayOfWeek - 1] ?? '-'}
                s={s}
              />
              <SummaryRow
                label="Interval"
                value={`${values.preferredTimeStart}–${values.preferredTimeEnd}`}
                s={s}
              />
              {subPricing && (
                <SummaryRow label="Total lunar" value={`${subPricing.monthlyAmount.toFixed(2)} RON/lună`} s={s} />
              )}
            </>
          ) : (
            <>
              {(values.timeSlots.length > 0 ? values.timeSlots : values.scheduledDate ? [{ date: values.scheduledDate, startTime: values.scheduledStartTime, endTime: values.scheduledEndTime }] : []).map((slot, i) => (
                <SummaryRow
                  key={i}
                  label={i === 0 ? 'Data și ora' : `Interval ${i + 1}`}
                  value={`${new Date(slot.date + 'T12:00:00').toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} · ${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ''}`}
                  s={s}
                />
              ))}
            </>
          )}
          {values.hasPets && <SummaryRow label="Animale de companie" value="Da" s={s} />}
        </PlatformCard>

        {/* Special instructions */}
        <PlatformCard style={s.formCard}>
          <Text style={s.fieldLabel}>Instructiuni speciale (optional)</Text>
          <Controller
            control={control}
            name="specialInstructions"
            render={({ field }) => (
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Ex: Codul de la interfon este 1234..."
                placeholderTextColor={dark ? '#4B5563' : colors.textSecondary}
                value={field.value}
                onChangeText={field.onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </PlatformCard>

        {estimate && (
          <PlatformCard style={s.estimateCard}>
            <Text style={s.estimateTitle}>Pret estimat</Text>
            <View style={s.estimateTotalRow}>
              <Text style={s.estimateTotalLabel}>Total</Text>
              <Text style={s.estimateTotalValue}>{formatPrice(estimate.total)}</Text>
            </View>
          </PlatformCard>
        )}

        {stepError ? <Text style={s.errorText}>{stepError}</Text> : null}

        <Button
          label={watchedValues.isRecurring && watchedValues.recurrenceType ? 'Finalizează abonamentul' : 'Trimite rezervarea'}
          onPress={handleSubmit(onSubmit)}
          loading={createLoading || addAddressLoading || createSubLoading}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm }}
        />
      </>
    );
  }

  // ── Order Summary Banner ──────────────────────────────────────────────────

  function OrderSummaryBanner() {
    const values = watchedValues;
    const service = servicesData?.availableServices?.find(
      (s) => s.serviceType === values.serviceType,
    );
    const savedAddresses = addressesData?.myAddresses ?? [];
    const selectedAddr = savedAddresses.find((a) => a.id === values.selectedAddressId);
    const addressLine = selectedAddr
      ? `${selectedAddr.streetAddress}, ${selectedAddr.city}`
      : values.newAddressStreet && values.newAddressCity
        ? `${values.newAddressStreet}, ${values.newAddressCity}`
        : null;

    const showBanner = !!values.serviceType && step >= 1 && step < TOTAL_STEPS;
    if (!showBanner) return null;

    const expandedHeight = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300],
    });

    const propertyLabel =
      values.propertyType === 'apartment' ? 'Apartament' : values.propertyType === 'house' ? 'Casa' : 'Birou';

    return (
      <View style={s.summaryBanner}>
        {/* Expanded content — slides in above the collapsed row */}
        <Animated.View style={[s.summaryExpanded, { maxHeight: expandedHeight }]}>
          <ScrollView
            scrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.summaryExpandedInner}
          >
            {/* Service */}
            <View style={s.summarySection}>
              <View style={s.summaryRow}>
                <Text style={s.summaryRowLabel}>
                  {service ? `${SERVICE_ICONS[service.serviceType] ?? '🧹'} ` : ''}{service?.nameRo ?? values.serviceType}
                </Text>
                {estimate && (
                  <Text style={s.summaryRowValue}>
                    {formatPrice(estimate.hourlyRate)}/h
                  </Text>
                )}
              </View>
            </View>

            {/* Property */}
            {step >= 2 && (
              <View style={s.summarySection}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryRowLabel}>
                    {propertyLabel}, {values.numRooms} cam, {values.numBathrooms} bai
                  </Text>
                </View>
                {values.hasPets && (
                  <Text style={s.summaryRowSub}>+ Animale de companie</Text>
                )}
              </View>
            )}

            {/* Duration / area */}
            {estimate && (
              <View style={s.summaryRow}>
                <Text style={s.summaryRowLabel}>Durata estimata</Text>
                <Text style={s.summaryRowValue}>
                  {estimate.pricingModel === 'PER_SQM'
                    ? `~${estimate.areaTotal} m²`
                    : `~${estimate.estimatedHours} ore`}
                </Text>
              </View>
            )}

            {/* Date/time */}
            {step >= 3 && (
              values.isRecurring && values.recurrenceType ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryRowLabel}>Program</Text>
                  <Text style={s.summaryRowValue}>
                    {['Lu','Ma','Mi','Jo','Vi','Sâ','Du'][values.recurrenceDayOfWeek - 1] ?? '-'}
                    {values.preferredTimeStart ? ` · ${values.preferredTimeStart}–${values.preferredTimeEnd}` : ''}
                  </Text>
                </View>
              ) : (values.timeSlots.length > 0 || values.scheduledDate) ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryRowLabel}>Data si ora</Text>
                  <Text style={s.summaryRowValue}>
                    {(() => {
                      const sl = values.timeSlots.length > 0 ? values.timeSlots[0] : { date: values.scheduledDate, startTime: values.scheduledStartTime, endTime: values.scheduledEndTime };
                      return `${new Date(sl.date + 'T12:00:00').toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} · ${sl.startTime}${sl.endTime ? `–${sl.endTime}` : ''}`;
                    })()}
                    {values.timeSlots.length > 1 ? ` +${values.timeSlots.length - 1}` : ''}
                  </Text>
                </View>
              ) : null
            )}

            {/* Address */}
            {step >= 4 && addressLine && (
              <View style={s.summaryRow}>
                <Text style={s.summaryRowLabel}>Adresa</Text>
                <Text style={[s.summaryRowValue, { flex: 1.5 }]} numberOfLines={1}>
                  {addressLine}
                </Text>
              </View>
            )}

            {/* Extras */}
            {values.extras.filter((e) => e.quantity > 0).length > 0 && estimate && (
              <View style={s.summarySection}>
                {estimate.extras.map((e) => (
                  <View key={e.extra.id} style={s.summaryRow}>
                    <Text style={s.summaryRowLabel}>
                      {e.extra.nameRo}{e.quantity > 1 ? ` ×${e.quantity}` : ''}
                    </Text>
                    <Text style={s.summaryRowValue}>+{formatPrice(e.lineTotal)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Separator */}
            {estimate && <View style={s.summarySep} />}

            {/* Subtotal */}
            {estimate && (
              <View style={s.summaryRow}>
                <Text style={s.summaryRowLabel}>Subtotal</Text>
                <Text style={s.summaryRowValue}>{formatPrice(estimate.subtotal)}</Text>
              </View>
            )}

            {/* Pets surcharge */}
            {estimate && estimate.petsSurcharge > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryRowLabel}>Animale</Text>
                <Text style={s.summaryRowValue}>+{formatPrice(estimate.petsSurcharge)}</Text>
              </View>
            )}

            {/* Total */}
            {estimate && (
              <>
                <View style={[s.summaryRow, { marginTop: 4 }]}>
                  <Text style={s.summaryTotalLabel}>Total estimat</Text>
                  <Text style={s.summaryTotalValue}>{formatPrice(estimate.total)}</Text>
                </View>
                <Text style={s.summaryDisclaimer}>
                  *Estimare — pretul final poate varia
                </Text>
              </>
            )}
          </ScrollView>
        </Animated.View>

        {/* Collapsed always-visible row */}
        <Pressable style={s.summaryCollapsed} onPress={toggleSummary}>
          <View style={s.summaryCollapsedLeft}>
            <Text style={s.summaryServiceName} numberOfLines={1}>
              {service ? `${SERVICE_ICONS[service.serviceType] ?? '🧹'} ` : ''}{service?.nameRo ?? values.serviceType}
            </Text>
            {step >= 2 && (
              <Text style={s.summaryServiceSub}>
                {values.numRooms} cam · {values.numBathrooms} bai
                {values.hasPets ? ' · Animale' : ''}
              </Text>
            )}
          </View>
          <View style={s.summaryCollapsedRight}>
            {values.isRecurring && subPricing ? (
              <Text style={[s.summaryPrice, { color: colors.secondary }]}>{subPricing.monthlyAmount.toFixed(0)} RON/lună</Text>
            ) : subPricingLoading && values.isRecurring ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : estimateLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : estimate ? (
              <Text style={s.summaryPrice}>{formatPrice(estimate.total)}</Text>
            ) : (
              <Text style={s.summaryPricePlaceholder}>Se calculeaza...</Text>
            )}
            <Feather
              name={summaryExpanded ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={dark ? '#9CA3AF' : colors.textSecondary}
              style={{ marginLeft: 6 }}
            />
          </View>
        </Pressable>
      </View>
    );
  }

  function renderCurrentStep() {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wizardHeader}>
        <View style={{ width: 32 }} />
        <Text style={s.wizardTitle}>Rezervare noua</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.closeBtn}>
          <Feather name="x" size={24} color={dark ? '#9CA3AF' : colors.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.stepContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}

          {stepError && step !== TOTAL_STEPS ? (
            <Text style={s.errorText}>{stepError}</Text>
          ) : null}
        </ScrollView>

        <OrderSummaryBanner />

        {step < TOTAL_STEPS && (
          <View style={s.footer}>
            {step > 1 ? (
              <Pressable onPress={goBack} style={s.footerBackBtn} hitSlop={8}>
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </Pressable>
            ) : null}
            <View style={s.footerStepWrap}>
              <Text style={s.stepIndicatorLabel}>Pasul</Text>
              <Text style={s.stepIndicatorValue}> {step} / {TOTAL_STEPS}</Text>
            </View>
            <Button
              label="Continua"
              onPress={goNext}
              style={s.footerBtn}
              size="lg"
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(dark: boolean) {
  const bg = dark ? '#0F0F11' : colors.background;
  const surface = dark ? '#1C1C1E' : colors.surface;
  const cardBg = dark ? '#1C1C1E' : '#fff';
  const border = dark ? '#2C2C2E' : colors.border;
  const borderLight = dark ? '#2C2C2E' : colors.borderLight;
  const textPrimary = dark ? '#F9FAFB' : colors.textPrimary;
  const textSecondary = dark ? '#9CA3AF' : colors.textSecondary;
  const backBtnBg = dark ? '#374151' : '#F3F4F6';
  const iconWrapBg = dark ? 'rgba(37,99,235,0.15)' : '#EFF6FF';
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: bg },
  flex: { flex: 1 },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: textSecondary },
  wizardTitle: { ...typography.heading3, color: textPrimary },
  stepContent: { padding: spacing.base, paddingBottom: spacing.md, gap: spacing.md },
  stepHeader: { gap: spacing.xs, marginBottom: spacing.xs },
  stepTitle: { ...typography.heading2, color: textPrimary },
  stepSubtitle: { ...typography.body, color: textSecondary },
  serviceList: { gap: spacing.md },
  serviceCard: {
    padding: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: surface,
    borderWidth: 2,
    borderColor: border,
    marginTop: 10,
    overflow: 'visible',
  },
  serviceCardSelected: { borderColor: colors.primary, backgroundColor: dark ? 'rgba(37,99,235,0.08)' : '#F0F7FF' },
  recommendedBadge: {
    position: 'absolute',
    top: -11,
    left: spacing.base,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  serviceCardInfo: { flex: 1, gap: 3 },
  serviceIcon: { fontSize: 30, marginTop: 1 },
  serviceName: { ...typography.bodyMedium, color: textPrimary },
  serviceNameSelected: { color: colors.primary },
  servicePriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  servicePriceBold: { fontSize: 15, fontWeight: '700', color: colors.primary },
  servicePriceBoldSelected: { color: colors.primary },
  servicePriceSub: { ...typography.caption, color: textSecondary },
  servicePrice: { ...typography.caption, color: textSecondary },
  serviceCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  serviceFeatures: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: border,
    gap: spacing.xs,
  },
  serviceFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceFeatureIcon: { marginTop: 1 },
  serviceFeatureText: { ...typography.small, color: textSecondary, flex: 1 },
  formCard: { paddingHorizontal: 0, paddingVertical: spacing.md, gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { ...typography.smallMedium, color: textSecondary },
  input: {
    borderWidth: 1,
    borderColor: border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: textPrimary,
    backgroundColor: surface,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  stepperLabel: { ...typography.body, color: textPrimary, flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { backgroundColor: border },
  stepperBtnText: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 20 },
  stepperValue: { ...typography.heading3, color: textPrimary, minWidth: 28, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: border,
  },
  segment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: surface },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.smallMedium, color: textPrimary },
  segmentTextActive: { color: '#fff' },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: surface,
  },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { ...typography.smallMedium, color: textPrimary },
  toggleTextOn: { color: '#fff' },
  // Property type cards
  propTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  propTypeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: border,
    backgroundColor: surface,
    gap: spacing.xs,
    position: 'relative',
    overflow: 'visible',
  },
  propTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: dark ? 'rgba(37,99,235,0.08)' : '#EFF6FF',
  },
  propTypeCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
propTypeLabel: { ...typography.small, color: textSecondary, textAlign: 'center' },
  propTypeLabelActive: { color: colors.primary, fontWeight: '600' },
  // Counter grid (rooms + bathrooms)
  counterGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: border,
    overflow: 'hidden',
  },
  counterCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  counterDivider: { width: 1, backgroundColor: border },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterValue: { ...typography.heading2, color: textPrimary, minWidth: 32, textAlign: 'center' },
  // Pets button
  petsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: border,
    backgroundColor: surface,
  },
  petsBtnActive: {
    borderColor: colors.primary,
    backgroundColor: dark ? 'rgba(37,99,235,0.08)' : '#EFF6FF',
  },
  petsEmoji: { fontSize: 20 },
  petsBtnText: { ...typography.body, color: textSecondary, flex: 1 },
  petsBtnTextActive: { color: colors.primary, fontWeight: '600' },
  petsCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCard: { padding: spacing.base, marginBottom: spacing.sm },
  addressCardSelected: { borderWidth: 2, borderColor: colors.primary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.primary },
  addressInfo: { flex: 1, gap: 2 },
  addressLabel: { ...typography.smallMedium, color: textPrimary },
  addressStreet: { ...typography.small, color: textPrimary },
  addressCity: { ...typography.caption, color: textSecondary },
  defaultTag: { ...typography.caption, color: colors.secondary, fontWeight: '600', marginTop: 2 },
  addNewLabel: { ...typography.bodyMedium, color: colors.primary },
  addressFormNote: { ...typography.small, color: textSecondary, marginBottom: spacing.sm },
  // Duration info banner
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: dark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  durationBannerText: { ...typography.small, color: dark ? '#93C5FD' : '#1D4ED8', flex: 1 },
  // Calendar
  calCard: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  calNavBtn: { padding: spacing.xs },
  calNavBtnDisabled: { opacity: 0.3 },
  calMonthLabel: { ...typography.bodyMedium, color: textPrimary },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: textSecondary,
    fontWeight: '600',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary },
  calDaySelected: { backgroundColor: colors.primary },
  calDayPast: { opacity: 0.3 },
  calDayText: { ...typography.body, color: textPrimary },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  // Time chips
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: border,
    minWidth: 68,
    alignItems: 'center',
  },
  timeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeChipText: { ...typography.smallMedium, color: textPrimary },
  timeChipTextSelected: { color: '#fff' },
  // Dual-range slider
  sliderDateLabel: { ...typography.bodyMedium, color: textPrimary, marginBottom: spacing.md },
  sliderTimesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sliderTimeLabel: { ...typography.caption, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sliderTimeValue: { fontSize: 28, fontWeight: '700', color: colors.primary, lineHeight: 34 },
  sliderDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark ? 'rgba(16,185,129,0.3)' : '#6EE7B7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sliderDurationText: { ...typography.smallMedium, color: colors.secondary },
  sliderContainer: {
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: dark ? '#374151' : '#E5E7EB',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderMarkerText: { ...typography.caption, color: textSecondary },
  extraCard: { padding: spacing.base, marginBottom: spacing.sm },
  extraRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  extraInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  extraIcon: { fontSize: 24 },
  extraName: { ...typography.bodyMedium, color: textPrimary },
  extraPrice: { ...typography.small, color: textSecondary },

  // ── Extras section in step 2 ──────────────────────────────────────────────
  extrasSectionHeader: { gap: 2, marginTop: spacing.xs },
  extrasSectionTitle: { ...typography.bodyMedium, color: textPrimary },
  extrasSectionSubtitle: { ...typography.small, color: textSecondary },
  extrasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  extraGridCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: surface,
    borderWidth: 1.5,
    borderColor: border,
    gap: spacing.xs,
  },
  extraGridCardSelected: {
    borderColor: colors.primary,
    backgroundColor: dark ? 'rgba(37,99,235,0.08)' : '#F0F7FF',
  },
  extraGridTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  extraGridEmoji: { fontSize: 22 },
  extraGridAction: { marginLeft: spacing.xs },
  extraGridStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extraGridBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraGridBtnDisabled: { backgroundColor: border },
  extraGridQty: { ...typography.smallMedium, color: textPrimary, minWidth: 16, textAlign: 'center' },
  extraGridToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraGridToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  extraGridName: { ...typography.small, color: textPrimary, fontWeight: '500' },
  extraGridNameSelected: { color: colors.primary },
  extraGridPrice: { ...typography.caption, color: colors.secondary, fontWeight: '600' },
  estimateLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  estimateLoadingText: { ...typography.small, color: textSecondary },
  estimateCard: {
    padding: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  estimateTitle: {
    ...typography.smallMedium,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  estimateLabel: { ...typography.small, color: textSecondary },
  estimateValue: { ...typography.smallMedium, color: textPrimary },
  estimateTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: borderLight,
    marginTop: spacing.xs,
  },
  estimateTotalLabel: { ...typography.bodyMedium, color: textPrimary },
  estimateTotalValue: { ...typography.heading3, color: colors.primary, fontWeight: '700' },
  bookSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryLabel: { ...typography.small, color: textSecondary, flex: 1 },
  summaryValue: { ...typography.smallMedium, color: textPrimary, flex: 2, textAlign: 'right' },
  miniEstimate: {
    backgroundColor: iconWrapBg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  miniEstimateText: { ...typography.bodyMedium, color: colors.primary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 0,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: borderLight,
    backgroundColor: bg,
  },
  footerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: backBtnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicatorLabel: {
    ...typography.small,
    color: textSecondary,
  },
  stepIndicatorValue: {
    ...typography.smallMedium,
    color: textPrimary,
  },
  footerBtn: { minWidth: 140 },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: iconWrapBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  loadingCenter: { alignItems: 'center', padding: spacing['3xl'] },
  errorText: { ...typography.small, color: colors.danger },

  // ── Order Summary Banner ──────────────────────────────────────────────────
  summaryBanner: {
    backgroundColor: surface,
    borderTopWidth: 1,
    borderTopColor: border,
  },
  summaryExpanded: {
    overflow: 'hidden',
    backgroundColor: cardBg,
    borderBottomWidth: 1,
    borderBottomColor: borderLight,
  },
  summaryExpandedInner: {
    padding: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  summarySection: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryRowLabel: {
    ...typography.small,
    color: textSecondary,
    flex: 1,
  },
  summaryRowValue: {
    ...typography.smallMedium,
    color: textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  summaryRowSub: {
    ...typography.caption,
    color: textSecondary,
    marginTop: 2,
  },
  summarySep: {
    height: 1,
    backgroundColor: borderLight,
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    ...typography.bodyMedium,
    color: textPrimary,
    flex: 1,
  },
  summaryTotalValue: {
    ...typography.heading3,
    color: colors.primary,
    fontWeight: '700',
  },
  summaryDisclaimer: {
    ...typography.caption,
    color: '#9CA3AF',
    marginTop: spacing.xs,
  },
  summaryCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  summaryCollapsedLeft: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  summaryServiceName: {
    ...typography.bodyMedium,
    color: textPrimary,
  },
  summaryServiceSub: {
    ...typography.caption,
    color: textSecondary,
  },
  summaryCollapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPrice: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  summaryPricePlaceholder: {
    ...typography.small,
    color: textSecondary,
    fontStyle: 'italic',
  },

  // ── Booking type toggle ───────────────────────────────────────────────────
  bookingTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bookingTypeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: border,
    backgroundColor: surface,
    gap: 4,
    position: 'relative',
    overflow: 'visible',
  },
  bookingTypeCardActiveBlue: {
    borderColor: colors.primary,
    backgroundColor: dark ? 'rgba(37,99,235,0.08)' : '#EFF6FF',
  },
  bookingTypeCardActiveGreen: {
    borderColor: colors.secondary,
    backgroundColor: dark ? 'rgba(16,185,129,0.08)' : '#ECFDF5',
  },
  bookingTypeLabel: {
    ...typography.smallMedium,
    color: textPrimary,
    marginTop: spacing.xs,
  },
  bookingTypeSub: {
    ...typography.caption,
    color: textSecondary,
  },
  bookingTypeBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bookingTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },

  // ── Frequency selector ────────────────────────────────────────────────────
  freqRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: border,
    backgroundColor: surface,
    alignItems: 'center',
    gap: 2,
  },
  freqBtnActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  freqBtnLabel: {
    ...typography.caption,
    color: textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  freqBtnLabelActive: { color: '#fff' },
  freqBtnDiscount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },

  // ── Day of week ───────────────────────────────────────────────────────────
  dayRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  dayBtn: {
    width: (Dimensions.get('window').width - spacing.base * 4 - 6 * 4) / 7,
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: border,
    backgroundColor: surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  dayBtnText: {
    ...typography.caption,
    color: textPrimary,
    fontWeight: '600',
  },
  dayBtnTextActive: { color: '#fff' },

  // ── Recurring time pickers ────────────────────────────────────────────────
  recurTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recurTimeSubLabel: {
    ...typography.caption,
    color: textSecondary,
    marginBottom: 6,
  },
  timeChipScroll: {
    gap: spacing.xs,
    paddingBottom: 2,
  },
  timeChipRecur: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: surface,
    borderWidth: 1.5,
    borderColor: border,
    minWidth: 68,
    alignItems: 'center',
  },
  timeChipRecurActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  timeChipTextActive: { color: '#fff' },

  // ── Subscription pricing card ─────────────────────────────────────────────
  subPricingCard: {
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    backgroundColor: dark ? 'rgba(16,185,129,0.08)' : '#F0FDF4',
    borderWidth: 1.5,
    borderColor: dark ? 'rgba(16,185,129,0.3)' : '#86EFAC',
  },
  subPricingTitle: {
    ...typography.bodyMedium,
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  subPricingLabel: { ...typography.small, color: textSecondary },
  subPricingValue: { ...typography.smallMedium, color: textPrimary },
  subPricingSep: { height: 1, backgroundColor: dark ? 'rgba(16,185,129,0.2)' : '#BBF7D0', marginVertical: spacing.xs },
  subPricingTotalLabel: { ...typography.bodyMedium, color: textPrimary, fontWeight: '700' },
  subPricingTotalValue: { ...typography.bodyMedium, color: colors.secondary, fontWeight: '700' },
  subPricingNote: { ...typography.caption, color: textSecondary, marginTop: 4 },
  subPricingLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  subPricingLoadingText: { ...typography.small, color: textSecondary },
  subPricingFallback: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  subPricingFallbackTitle: { ...typography.bodyMedium, color: textPrimary },
  subPricingFallbackSub: { ...typography.small, color: textSecondary },

  // ── Multi-slot (one-time) ─────────────────────────────────────────────────
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addSlotBtnDisabled: { borderColor: border },
  addSlotBtnText: { ...typography.smallMedium, color: colors.primary },
  addSlotBtnTextDisabled: { color: dark ? '#4B5563' : colors.border },
  slotListHeader: { ...typography.smallMedium, color: textSecondary, marginBottom: spacing.xs },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  slotRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  slotRowDate: { ...typography.body, color: textPrimary, flex: 1 },
  slotRowTime: { ...typography.smallMedium, color: colors.primary },

  // ── Calendar day dot (slot indicator) ────────────────────────────────────
  calDayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    position: 'absolute',
    bottom: 3,
  },
});
}
