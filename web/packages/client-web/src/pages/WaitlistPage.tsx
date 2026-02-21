import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@apollo/client';
import { CheckCircle, Users, Bell, Star, Zap } from 'lucide-react';
import { cn } from '@go2fix/shared';
import SEOHead from '@/components/seo/SEOHead';
import { trackWaitlistSignup } from '@/lib/analytics';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { JOIN_WAITLIST, WAITLIST_STATS } from '@/graphql/operations';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hmc_waitlist_email';

type LeadType = 'CLIENT' | 'COMPANY';

// ─── Form state types ─────────────────────────────────────────────────────────

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  city: string;
}

interface CompanyForm {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  message: string;
}

interface ClientErrors {
  name?: string;
  email?: string;
}

interface CompanyErrors {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 py-3 text-sm font-semibold transition-all duration-200 border-b-2 focus:outline-none cursor-pointer',
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      )}
    >
      {children}
    </button>
  );
}

interface SuccessCardProps {
  city: string;
  leadType: LeadType;
}

function SuccessCard({ city, leadType }: SuccessCardProps) {
  const { t } = useTranslation('waitlist');
  const cityLabel = city && city !== t('cities.other') ? city : t('cities.other');
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle className="w-9 h-9 text-emerald-500" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{t('success.title')}</h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
        {leadType === 'CLIENT'
          ? t('success.clientMsg', { city: cityLabel })
          : t('success.companyMsg')}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-4 py-2 rounded-xl">
        <CheckCircle className="w-3.5 h-3.5" />
        {t('success.confirmEmail')}
      </div>
    </div>
  );
}

function AlreadyRegisteredCard() {
  const { t } = useTranslation('waitlist');
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Bell className="w-9 h-9 text-blue-600" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{t('alreadyRegistered.title')}</h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
        {t('alreadyRegistered.msg')}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-4 py-2 rounded-xl">
        <CheckCircle className="w-3.5 h-3.5" />
        {t('alreadyRegistered.badge')}
      </div>
    </div>
  );
}

// ─── Client form ──────────────────────────────────────────────────────────────

interface ClientFormSectionProps {
  loading: boolean;
  onSubmit: (form: ClientForm) => void;
  serverError: string;
}

function ClientFormSection({ loading, onSubmit, serverError }: ClientFormSectionProps) {
  const { t } = useTranslation('waitlist');

  const CITY_OPTIONS = [
    { value: 'București', label: 'București' },
    { value: 'Cluj-Napoca', label: 'Cluj-Napoca' },
    { value: 'Timișoara', label: 'Timișoara' },
    { value: 'Iași', label: 'Iași' },
    { value: 'Brașov', label: 'Brașov' },
    { value: 'Constanța', label: 'Constanța' },
    { value: 'Galați', label: 'Galați' },
    { value: 'Craiova', label: 'Craiova' },
    { value: 'Ploiești', label: 'Ploiești' },
    { value: t('cities.other'), label: t('cities.other') },
  ];

  const [form, setForm] = useState<ClientForm>({ name: '', email: '', phone: '', city: '' });
  const [errors, setErrors] = useState<ClientErrors>({});

  const update = (field: keyof ClientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ClientErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: ClientErrors = {};
    if (!form.name.trim()) next.name = t('validation.nameRequired');
    if (!form.email.trim()) next.email = t('validation.emailRequired');
    else if (!isValidEmail(form.email)) next.email = t('validation.emailInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label={t('clientForm.name')}
        name="name"
        type="text"
        placeholder={t('clientForm.placeholder_name')}
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label={t('clientForm.email')}
        name="email"
        type="email"
        placeholder={t('clientForm.placeholder_email')}
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label={t('clientForm.phone')}
        name="phone"
        type="tel"
        placeholder={t('clientForm.placeholder_phone')}
        value={form.phone}
        onChange={(e) => update('phone', e.target.value)}
      />
      <Select
        label={t('clientForm.city')}
        name="city"
        placeholder={t('clientForm.placeholder_city')}
        options={CITY_OPTIONS}
        value={form.city}
        onChange={(e) => update('city', e.target.value)}
      />

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{serverError}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full mt-2"
      >
        {loading ? t('clientForm.submitting') : t('clientForm.submit')}
      </Button>
    </form>
  );
}

// ─── Company form ─────────────────────────────────────────────────────────────

interface CompanyFormSectionProps {
  loading: boolean;
  onSubmit: (form: CompanyForm) => void;
  serverError: string;
}

function CompanyFormSection({ loading, onSubmit, serverError }: CompanyFormSectionProps) {
  const { t } = useTranslation('waitlist');

  const [form, setForm] = useState<CompanyForm>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    city: '',
    message: '',
  });
  const [errors, setErrors] = useState<CompanyErrors>({});

  const update = (field: keyof CompanyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof CompanyErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: CompanyErrors = {};
    if (!form.name.trim()) next.name = t('validation.contactRequired');
    if (!form.companyName.trim()) next.companyName = t('validation.companyRequired');
    if (!form.email.trim()) next.email = t('validation.emailRequired');
    else if (!isValidEmail(form.email)) next.email = t('validation.emailInvalid');
    if (!form.phone.trim()) next.phone = t('validation.phoneRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label={t('companyForm.contact')}
        name="name"
        type="text"
        placeholder={t('companyForm.placeholder_contact')}
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label={t('companyForm.companyName')}
        name="companyName"
        type="text"
        placeholder={t('companyForm.placeholder_company')}
        value={form.companyName}
        onChange={(e) => update('companyName', e.target.value)}
        error={errors.companyName}
        required
      />
      <Input
        label={t('companyForm.email')}
        name="email"
        type="email"
        placeholder={t('companyForm.placeholder_email')}
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label={t('companyForm.phone')}
        name="phone"
        type="tel"
        placeholder={t('companyForm.placeholder_phone')}
        value={form.phone}
        onChange={(e) => update('phone', e.target.value)}
        error={errors.phone}
        required
      />
      <Input
        label={t('companyForm.city')}
        name="city"
        type="text"
        placeholder={t('companyForm.placeholder_city')}
        value={form.city}
        onChange={(e) => update('city', e.target.value)}
      />

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="message">
          {t('companyForm.message')}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder={t('companyForm.placeholder_message')}
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{serverError}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full mt-2"
      >
        {loading ? t('companyForm.submitting') : t('companyForm.submit')}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const { t } = useTranslation('waitlist');
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<LeadType>('CLIENT');
  const [submitted, setSubmitted] = useState(false);
  const [submittedCity, setSubmittedCity] = useState('');
  const [submittedLeadType, setSubmittedLeadType] = useState<LeadType>('CLIENT');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [serverError, setServerError] = useState('');

  const [joinWaitlist, { loading }] = useMutation(JOIN_WAITLIST);

  const { data: statsData } = useQuery(WAITLIST_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  const totalCount: number = statsData?.waitlistStats?.totalCount ?? 247;

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAlreadyRegistered(true);
    }
  }, []);

  const handleClientSubmit = async (form: ClientForm) => {
    setServerError('');
    try {
      await joinWaitlist({
        variables: {
          input: {
            leadType: 'CLIENT',
            name: form.name.trim(),
            email: form.email.trim(),
            ...(form.phone.trim() && { phone: form.phone.trim() }),
            ...(form.city && { city: form.city }),
          },
        },
      });
      localStorage.setItem(STORAGE_KEY, form.email.trim());
      setSubmittedCity(form.city);
      setSubmittedLeadType('CLIENT');
      setSubmitted(true);
      trackWaitlistSignup('CLIENT');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('validation.genericError');
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('există')) {
        setServerError(t('validation.alreadyRegistered'));
      } else {
        setServerError(t('validation.genericError'));
      }
    }
  };

  const handleCompanySubmit = async (form: CompanyForm) => {
    setServerError('');
    try {
      await joinWaitlist({
        variables: {
          input: {
            leadType: 'COMPANY',
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            companyName: form.companyName.trim(),
            ...(form.city.trim() && { city: form.city.trim() }),
            ...(form.message.trim() && { message: form.message.trim() }),
          },
        },
      });
      localStorage.setItem(STORAGE_KEY, form.email.trim());
      setSubmittedCity(form.city);
      setSubmittedLeadType('COMPANY');
      setSubmitted(true);
      trackWaitlistSignup('COMPANY');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('validation.genericError');
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('există')) {
        setServerError(t('validation.alreadyRegistered'));
      } else {
        setServerError(t('validation.genericError'));
      }
    }
  };

  const showForm = !submitted && !alreadyRegistered;

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.waitlist[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.waitlist.ro, en: ROUTE_MAP.waitlist.en }}
      />

      <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-white py-12 px-4">
        <div className="max-w-lg mx-auto">

          {/* ─── Hero section ──────────────────────────────────────────────── */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <Badge variant="warning" className="px-3.5 py-1.5 text-xs font-semibold">
                {t('badge')}
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              {t('title')}
            </h1>

            <p className="text-gray-500 text-base leading-relaxed max-w-sm mx-auto">
              {t('subtitle')}{' '}
              <span className="font-semibold text-gray-700">{t('discount')}</span>{' '}
              {t('discountSuffix')}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-6">
              <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-xs">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                {t('features.notification')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-xs">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {t('features.discount')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-xs">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                {t('features.priority')}
              </span>
            </div>
          </div>

          {/* ─── Form card ─────────────────────────────────────────────────── */}
          <Card className="shadow-md border-gray-100" padding={false}>
            {submitted ? (
              <SuccessCard city={submittedCity} leadType={submittedLeadType} />
            ) : alreadyRegistered ? (
              <AlreadyRegisteredCard />
            ) : (
              <div>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 pt-2">
                  <TabButton active={activeTab === 'CLIENT'} onClick={() => { setActiveTab('CLIENT'); setServerError(''); }}>
                    {t('tabs.client')}
                  </TabButton>
                  <TabButton active={activeTab === 'COMPANY'} onClick={() => { setActiveTab('COMPANY'); setServerError(''); }}>
                    {t('tabs.company')}
                  </TabButton>
                </div>

                {/* Form body */}
                <div className="p-6">
                  {activeTab === 'CLIENT' ? (
                    <ClientFormSection
                      loading={loading}
                      onSubmit={handleClientSubmit}
                      serverError={serverError}
                    />
                  ) : (
                    <CompanyFormSection
                      loading={loading}
                      onSubmit={handleCompanySubmit}
                      serverError={serverError}
                    />
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* ─── Social proof ──────────────────────────────────────────────── */}
          {showForm && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4 text-blue-600" />
              <span>
                {t('socialProof')}{' '}
                <span className="font-semibold text-gray-900">{totalCount.toLocaleString(lang === 'en' ? 'en-GB' : 'ro-RO')}</span>{' '}
                {t('socialProofSuffix')}
              </span>
            </div>
          )}

          {/* ─── Privacy note ──────────────────────────────────────────────── */}
          {showForm && (
            <p className="mt-4 text-center text-xs text-gray-400 px-4">
              {t('privacy')}{' '}
              <a href={ROUTE_MAP.terms[lang]} className="underline hover:text-gray-600 transition-colors">
                {t('terms')}
              </a>{' '}
              {t('and')}{' '}
              <a href={ROUTE_MAP.privacy[lang]} className="underline hover:text-gray-600 transition-colors">
                {t('privacyPolicy')}
              </a>
              . {t('noSpam')}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
