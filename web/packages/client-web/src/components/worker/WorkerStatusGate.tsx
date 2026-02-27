import { useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { MY_WORKER_PROFILE } from '@/graphql/operations';

// ─── Overlay Container ───────────────────────────────────────────────────────

function StatusOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-white/70">
      <div className="w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
        {children}
      </div>
    </div>
  );
}

// ─── Gate 1: Personality Test ────────────────────────────────────────────────

function PersonalityTestOverlay({ onStartTest }: { onStartTest: () => void }) {
  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Completează testul de personalitate
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Pentru a fi activat ca curățitor, trebuie să completezi testul de personalitate.
          Testul conține 28 de întrebări și durează aproximativ 5-6 minute.
        </p>
        <button
          onClick={onStartTest}
          className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition"
        >
          Începe testul
        </button>
      </div>
    </StatusOverlay>
  );
}

// ─── Gate 2: Document Upload ─────────────────────────────────────────────────

function DocumentUploadOverlay({ onGoToDocuments }: { onGoToDocuments: () => void }) {
  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Încarcă documentele necesare
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Pentru a fi activat, trebuie să încarci documentele cerute
          (cazier judiciar, contract de muncă) și o fotografie de profil (portret).
        </p>
        <button
          onClick={onGoToDocuments}
          className="w-full bg-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition"
        >
          Încarcă documente
        </button>
      </div>
    </StatusOverlay>
  );
}

// ─── Gate 3: Pending Approval ────────────────────────────────────────────────

function PendingApprovalOverlay() {
  const navigate = useNavigate();

  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Profilul tău este în curs de verificare
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          Am primit documentele tale și le vom verifica în cel mai scurt timp.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          De obicei, verificarea durează 1-2 zile lucrătoare.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          Înapoi la pagina principală
        </button>
      </div>
    </StatusOverlay>
  );
}

// ─── Gate 4: Suspended ───────────────────────────────────────────────────────

function SuspendedOverlay() {
  return (
    <StatusOverlay>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cont suspendat</h2>
        <p className="text-sm text-gray-500">
          Contul tău a fost suspendat. Contactează administratorul pentru detalii.
        </p>
      </div>
    </StatusOverlay>
  );
}

// ─── Main Gate Component ─────────────────────────────────────────────────────

interface WorkerStatusGateProps {
  children: ReactNode;
}

export default function WorkerStatusGate({ children }: WorkerStatusGateProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data, loading } = useQuery(MY_WORKER_PROFILE);

  const profile = data?.myWorkerProfile;

  // Exempt paths from gating (allow access to these pages regardless of status)
  const exemptPaths = ['/worker/test-personalitate', '/worker/documente-obligatorii'];
  const isExempt = exemptPaths.some((p) => pathname.includes(p));

  // Check document completion
  const requiredDocTypes = ['cazier_judiciar', 'contract_munca'];
  const uploadedDocs = profile?.documents || [];
  const allDocsUploaded = requiredDocTypes.every((type) =>
    uploadedDocs.some((d: { documentType: string }) => d.documentType === type),
  );

  // Check profile image
  const hasProfileImage = !!profile?.user?.avatarUrl;

  // Auto-redirect to document upload if PENDING_REVIEW + personality done + missing docs/image
  useEffect(() => {
    if (
      profile?.status === 'PENDING_REVIEW' &&
      profile?.personalityAssessment &&
      (!allDocsUploaded || !hasProfileImage) &&
      !pathname.includes('/worker/documente-obligatorii') &&
      !loading
    ) {
      navigate('/worker/documente-obligatorii', { replace: true });
    }
  }, [profile, allDocsUploaded, hasProfileImage, pathname, loading, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No profile = error state (shouldn't happen after accepting invitation)
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profil negăsit</h2>
          <p className="text-sm text-gray-500">
            Nu am găsit profilul de curățitor. Contactează administratorul.
          </p>
        </div>
      </div>
    );
  }

  // Skip overlays for exempt paths
  if (isExempt) {
    return <>{children}</>;
  }

  // Gate 1: Personality test not completed
  if (profile.status === 'PENDING_REVIEW' && !profile.personalityAssessment) {
    return (
      <PersonalityTestOverlay onStartTest={() => navigate('/worker/test-personalitate')} />
    );
  }

  // Gate 2: Documents or profile image not uploaded
  if (
    profile.status === 'PENDING_REVIEW' &&
    profile.personalityAssessment &&
    (!allDocsUploaded || !hasProfileImage)
  ) {
    return (
      <DocumentUploadOverlay onGoToDocuments={() => navigate('/worker/documente-obligatorii')} />
    );
  }

  // Gate 3: Pending approval (personality + docs + profile image done)
  if (
    profile.status === 'PENDING_REVIEW' &&
    profile.personalityAssessment &&
    allDocsUploaded &&
    hasProfileImage
  ) {
    return <PendingApprovalOverlay />;
  }

  // Gate 4: Suspended
  if (profile.status === 'SUSPENDED') {
    return <SuspendedOverlay />;
  }

  // ACTIVE or INVITED status — allow normal access
  return <>{children}</>;
}
