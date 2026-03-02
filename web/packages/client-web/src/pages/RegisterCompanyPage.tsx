import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { CheckCircle, Copy, Check, CheckCheck, Loader2, Search, Mail } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { cn } from '@go2fix/shared';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmailOtpModal from '@/components/auth/EmailOtpModal';
import { APPLY_AS_COMPANY, CLAIM_COMPANY, MY_COMPANY, SERVICE_CATEGORIES } from '@/graphql/operations';
import { ROUTE_MAP } from '@/i18n/routes';

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterCompanyPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, refreshToken, refetchUser } = useAuth();
  const [applyAsCompany, { loading }] = useMutation(APPLY_AS_COMPANY);
  const [claimCompany] = useMutation(CLAIM_COMPANY, {
    refetchQueries: [{ query: MY_COMPANY }],
  });

  const { data: catData } = useQuery(SERVICE_CATEGORIES);
  const categories = (catData?.serviceCategories ?? []).filter(
    (c: { isActive: boolean }) => c.isActive,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [cuiLoading, setCuiLoading] = useState(false);
  const [cuiStatus, setCuiStatus] = useState<'idle' | 'found' | 'not-found'>('idle');

  const [submitted, setSubmitted] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    cui: '',
    companyType: '',
    legalRepresentative: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    county: '',
    description: '',
    // Fiscal details for invoice generation
    regNumber: '',
    bankName: '',
    iban: '',
  });
  const [isVatPayer, setIsVatPayer] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCuiLookup = async () => {
    const cuiNum = parseInt(form.cui.replace(/\D/g, ''), 10);
    if (!cuiNum) return;
    setCuiLoading(true);
    setCuiStatus('idle');
    try {
      const backendBase =
        (import.meta.env.VITE_GRAPHQL_ENDPOINT as string)?.replace('/query', '') ||
        'http://localhost:8080';
      const res = await fetch(`${backendBase}/api/company-lookup?cui=${cuiNum}`);
      const json = await res.json();
      if (json?.found && json.companyName) {
        setForm((prev) => ({
          ...prev,
          companyName: json.companyName || prev.companyName,
          address: json.streetAddress || prev.address,
          city: json.city || prev.city,
          county: json.county || prev.county,
          contactPhone: json.contactPhone || prev.contactPhone,
        }));
        setCuiStatus('found');
      } else {
        setCuiStatus('not-found');
      }
    } catch {
      setCuiStatus('not-found');
    } finally {
      setCuiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.companyName.trim() || !form.cui.trim() || !form.companyType || !form.contactEmail.trim()) {
      setError('Te rugăm să completezi câmpurile obligatorii.');
      return;
    }

    try {
      const { data } = await applyAsCompany({
        variables: {
          input: {
            ...form,
            isVatPayer,
            ...(selectedCategoryIds.length > 0 ? { categoryIds: selectedCategoryIds } : {}),
          },
        },
      });
      const token = data?.applyAsCompany?.claimToken ?? null;
      setClaimToken(token);

      if (isAuthenticated && !token) {
        await refreshToken();
        await refetchUser();
        navigate('/firma/documente-obligatorii');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Înregistrarea a eșuat. Te rugăm să încerci din nou.');
    }
  };

  const handleClaimAfterAuth = async () => {
    if (!claimToken) return;
    setClaimLoading(true);
    setClaimError('');
    try {
      await claimCompany({ variables: { claimToken } });
      await refreshToken();
      await refetchUser();
      setClaimed(true);
      setTimeout(() => navigate('/firma/documente-obligatorii'), 1500);
    } catch (err) {
      console.error('Claim error:', err);
      setClaimError('Nu am putut asocia firma cu contul tău. Poți încerca din dashboard.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setClaimError('Autentificarea Google a eșuat.');
      return;
    }
    setClaimError('');
    setClaimLoading(true);
    try {
      await loginWithGoogle(response.credential);
      await handleClaimAfterAuth();
    } catch (err) {
      console.error('Google auth error:', err);
      setClaimError('Autentificarea a eșuat. Te rugăm să încerci din nou.');
      setClaimLoading(false);
    }
  };

  const claimUrl = claimToken
    ? `${window.location.origin}/claim-firma/${claimToken}`
    : null;

  const handleCopyLink = async () => {
    if (!claimUrl) return;
    await navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Success: claimed ────────────────────────────────────────────────────────

  if (submitted && claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contul a fost asociat!</h1>
          <p className="text-gray-500 mb-6">
            Firma ta a fost asociată cu contul Google. Vei fi redirecționat către dashboard...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-secondary">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary" />
            Se redirecționează...
          </div>
        </div>
      </div>
    );
  }

  // ─── Success: unclaimed (Google login prompt) ────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-black tracking-tight text-gray-900">
                Go2<span className="text-primary">Clean</span>
              </span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Cerere trimisă cu succes!</h1>
            <p className="text-gray-500 text-sm mb-6">
              Conectează-te cu Google pentru a asocia această cerere cu contul tău.
              Astfel vei putea urmări statusul cererii și gestiona firma din dashboard.
            </p>

            {claimLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setClaimError('Autentificarea Google a eșuat.')}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="320"
                />
                <div className="flex items-center gap-3 w-full max-w-[320px]">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">sau</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  type="button"
                  onClick={() => setEmailOtpOpen(true)}
                  className="flex items-center justify-center gap-2 w-full max-w-[320px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Continuă cu email
                </button>
              </div>
            )}

            <EmailOtpModal
              open={emailOtpOpen}
              onClose={() => setEmailOtpOpen(false)}
              onSuccess={handleClaimAfterAuth}
              role="COMPANY_ADMIN"
              title="Autentificare prin email"
            />

            {claimError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-sm text-red-700">
                {claimError}
              </div>
            )}

            {claimUrl && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">
                  Sau salvează acest link pentru mai târziu:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={claimUrl}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-secondary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiat' : 'Copiază'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration Form ────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left Panel ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] bg-secondary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -right-12 w-80 h-80 bg-emerald-700/20 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-black tracking-tight text-white">Go2Fix</span>
          </Link>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Crește-ți afacerea<br />cu Go2Fix
          </h2>
          <p className="text-emerald-100 mb-8 leading-relaxed">
            Accesează mii de clienți care caută servicii de curățenie profesionale.
          </p>
          <ul className="space-y-3">
            {[
              'Clienți verificați, plăți garantate',
              'Dashboard complet pentru gestionarea comenzilor',
              'Facturare automată și transparență totală',
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-emerald-50 text-sm">
                <CheckCheck className="h-5 w-5 text-white shrink-0 mt-0.5" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-8 pt-8 border-t border-white/20">
          <div>
            <p className="text-2xl font-bold text-white">50+</p>
            <p className="text-xs text-emerald-100 mt-0.5">firme partenere</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-2xl font-bold text-white">500+</p>
            <p className="text-xs text-emerald-100 mt-0.5">comenzi / lună</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">

        {/* Top bar */}
        <div className="flex items-center justify-end px-8 py-4 border-b border-gray-100 shrink-0">
          <span className="text-sm text-gray-500 mr-2">Ai deja cont?</span>
          <Link to="/autentificare" className="text-sm font-medium text-primary hover:underline">
            Intră în cont →
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 px-8 lg:px-16 py-8">
          <div className="max-w-xl w-full mx-auto">

            {/* Logo (mobile only) */}
            <div className="lg:hidden mb-6">
              <Link to="/">
                <span className="text-xl font-black tracking-tight text-gray-900">
                  Go2<span className="text-primary">Clean</span>
                </span>
              </Link>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Înregistrează-ți firma
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Completează datele firmei pentru a deveni partener Go2Fix.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* ── CUI Hero Section ────────────────────────────────────────── */}
              <div className={cn(
                'rounded-2xl border p-5 transition-colors',
                cuiStatus === 'found'
                  ? 'border-secondary/40 bg-secondary/5'
                  : 'border-gray-200 bg-gray-50',
              )}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cod unic de înregistrare (CUI)</p>
                    <p className="text-xs text-gray-500">Preluăm automat datele firmei din registrul ANAF</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 12345678 sau RO12345678"
                    value={form.cui}
                    onChange={(e) => { updateField('cui', e.target.value); setCuiStatus('idle'); }}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleCuiLookup}
                    disabled={!form.cui.trim() || cuiLoading}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 disabled:opacity-40 transition cursor-pointer"
                  >
                    {cuiLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Search className="h-4 w-4" /> Verifică</>
                    }
                  </button>
                </div>

                {/* Found company card */}
                {cuiStatus === 'found' && (
                  <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-white border border-secondary/20">
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{form.companyName}</p>
                      {(form.address || form.city) && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {[form.address, form.city, form.county].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {form.contactPhone && (
                        <p className="text-xs text-gray-400 mt-0.5">{form.contactPhone}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-secondary shrink-0">ANAF ✓</span>
                  </div>
                )}

                {cuiStatus === 'not-found' && (
                  <p className="mt-2 text-xs text-red-500">
                    CUI-ul nu a fost găsit în baza de date ANAF. Continuă completând manual datele.
                  </p>
                )}
              </div>

              {/* ── Company Details ──────────────────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalii firmă</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nume firmă *"
                    placeholder="SC Firma SRL"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Tip firmă <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.companyType}
                      onChange={(e) => updateField('companyType', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Selectează tipul firmei</option>
                      <option value="SRL">SRL</option>
                      <option value="PFA">PFA</option>
                      <option value="II">II (Întreprindere Individuală)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Reprezentant legal"
                      placeholder="Ion Popescu"
                      value={form.legalRepresentative}
                      onChange={(e) => updateField('legalRepresentative', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Contact ──────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email contact *"
                    type="email"
                    placeholder="contact@firma.ro"
                    value={form.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                  />
                  <Input
                    label="Telefon contact"
                    placeholder="+40 7XX XXX XXX"
                    value={form.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Address ──────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Adresă sediu</p>
                <Input
                  label="Stradă, număr"
                  placeholder="Str. Exemplu, Nr. 1, Et. 2, Ap. 5"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Oraș"
                    placeholder="București"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                  <Input
                    label="Județ / Sector"
                    placeholder="Ilfov sau Sector 1"
                    value={form.county}
                    onChange={(e) => updateField('county', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prezentare</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descriere firmă
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Descrierea firmei și a serviciilor oferite..."
                  />
                </div>
              </div>

              {/* ── Fiscal Details ────────────────────────────────────────── */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date fiscale</p>
                  <p className="text-xs text-gray-500 mt-1">Necesare pentru emiterea facturilor către clienți. Pot fi completate și ulterior.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nr. Registrul Comerțului (J)"
                    placeholder="Ex: J40/1234/2020"
                    value={form.regNumber}
                    onChange={(e) => updateField('regNumber', e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Plătitor TVA
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
                      <input
                        type="checkbox"
                        id="isVatPayer"
                        checked={isVatPayer}
                        onChange={(e) => setIsVatPayer(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                      />
                      <label htmlFor="isVatPayer" className="text-sm text-gray-700 cursor-pointer select-none">
                        Firma este plătitoare de TVA
                      </label>
                    </div>
                  </div>
                  <Input
                    label="Bancă"
                    placeholder="Ex: BCR, BRD, ING..."
                    value={form.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                  />
                  <Input
                    label="IBAN"
                    placeholder="RO49AAAA1B31007593840000"
                    value={form.iban}
                    onChange={(e) => updateField('iban', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Service Categories ────────────────────────────────────── */}
              {categories.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Servicii</p>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Categorii de servicii oferite
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Selecteaza categoriile de servicii pe care le ofera firma ta.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((cat: { id: string; nameRo: string }) => {
                        const selected = selectedCategoryIds.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition',
                              selected
                                ? 'border-primary/30 bg-primary/5 text-primary'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                setSelectedCategoryIds((prev) =>
                                  selected
                                    ? prev.filter((id) => id !== cat.id)
                                    : [...prev, cat.id],
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                            />
                            <span className="text-sm font-medium">{cat.nameRo}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                Prin trimiterea acestei cereri, confirmi că ai citit și ești de acord cu{' '}
                <Link to={ROUTE_MAP.gdpr.ro} target="_blank" rel="noopener noreferrer" className="underline text-gray-600 hover:text-gray-800">
                  Nota de Informare GDPR
                </Link>
                {' '}privind prelucrarea datelor firmei tale.
              </p>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Trimite cererea →
              </Button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
