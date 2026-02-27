import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Clock, XCircle, ShieldBan, Phone, Mail, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';

const CONTACT_PHONE = '+40 312 345 678';
const CONTACT_EMAIL = 'contact@go2fix.ro';

function ContactInfo() {
  return (
    <div className="mt-6 pt-5 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
        Ai nevoie de ajutor?
      </p>
      <div className="space-y-2">
        <a
          href={`tel:${CONTACT_PHONE}`}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <Phone className="h-4 w-4" />
          {CONTACT_PHONE}
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <Mail className="h-4 w-4" />
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}

function StatusOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-white/70">
      <div className="w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
        {children}
      </div>
    </div>
  );
}

function NoCompanyOverlay() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Nicio firma inregistrata
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Pentru a utiliza panoul de administrare, trebuie sa inregistrezi o firma.
          Procesul dureaza doar cateva minute.
        </p>
        <Button onClick={() => navigate('/inregistrare-firma')} className="w-full">
          Inregistreaza firma
        </Button>
        <button
          onClick={logout}
          className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconecteaza-te
        </button>
        <ContactInfo />
      </div>
    </StatusOverlay>
  );
}

function PendingOverlay() {
  const { logout } = useAuth();

  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Aplicatia ta este in curs de verificare
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Echipa noastra verifica documentele si datele firmei tale. Vei primi o
          notificare cand procesul este finalizat.
        </p>
        <p className="text-gray-400 text-xs mb-4">
          De obicei, verificarea dureaza 1-2 zile lucratoare.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconecteaza-te
        </button>
        <ContactInfo />
      </div>
    </StatusOverlay>
  );
}

function RejectedOverlay({ reason }: { reason?: string }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Aplicatia firmei a fost respinsa
        </h2>
        {reason && (
          <div className="mt-3 mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-700 text-left">
            <p className="font-medium mb-1">Motiv:</p>
            <p>{reason}</p>
          </div>
        )}
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Poti incerca sa aplici din nou sau sa ne contactezi pentru mai multe detalii.
        </p>
        <Button onClick={() => navigate('/inregistrare-firma')} className="w-full">
          Aplica din nou
        </Button>
        <button
          onClick={logout}
          className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconecteaza-te
        </button>
        <ContactInfo />
      </div>
    </StatusOverlay>
  );
}

function SuspendedOverlay() {
  const { logout } = useAuth();

  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <ShieldBan className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Contul firmei a fost suspendat
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-4">
          Accesul la panoul de administrare a fost restricionat. Te rugam sa ne
          contactezi pentru a afla motivul si pasii urmatori.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconecteaza-te
        </button>
        <ContactInfo />
      </div>
    </StatusOverlay>
  );
}

const EXCLUDED_PATHS = ['/inregistrare-firma', '/claim-firma', '/autentificare'];
const REQUIRED_DOCS = ['certificat_constatator', 'asigurare_raspundere_civila', 'cui_document'];

export default function CompanyStatusGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { company, loading, error } = useCompany();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Check if all required documents uploaded
  const allDocsUploaded = company?.documents &&
    REQUIRED_DOCS.every(type =>
      company.documents?.some((doc: { documentType: string }) => doc.documentType === type)
    );

  // Redirect to document upload if pending and documents incomplete
  useEffect(() => {
    if (
      company?.status === 'PENDING_REVIEW' &&
      !allDocsUploaded &&
      !pathname.includes('/documente-obligatorii') &&
      !loading
    ) {
      navigate('/firma/documente-obligatorii', { replace: true });
    }
  }, [company, allDocsUploaded, pathname, navigate, loading]);

  if (!isAuthenticated || EXCLUDED_PATHS.some(p => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </>
    );
  }

  if (error || !company) {
    return (
      <>
        {children}
        <NoCompanyOverlay />
      </>
    );
  }

  switch (company.status) {
    case 'PENDING_REVIEW':
      // On document upload page: allow access so company can upload docs
      if (pathname.includes('/documente-obligatorii')) {
        return <>{children}</>;
      }
      return (
        <>
          {children}
          <PendingOverlay />
        </>
      );
    case 'REJECTED':
      return (
        <>
          {children}
          <RejectedOverlay reason={company.rejectionReason} />
        </>
      );
    case 'SUSPENDED':
      return (
        <>
          {children}
          <SuspendedOverlay />
        </>
      );
    case 'APPROVED':
      return <>{children}</>;
    default:
      return <>{children}</>;
  }
}
