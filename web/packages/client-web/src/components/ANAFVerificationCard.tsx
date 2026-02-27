import {
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface ANAFVerificationData {
  status: string;
  denumire?: string | null;
  adresa?: string | null;
  dataInfiintare?: string | null;
  scpTva?: boolean | null;
  inactive?: boolean | null;
  verifiedAt?: string | null;
  rawError?: string | null;
  nameMatchScore?: number | null;
  isActive?: boolean | null;
}

interface ANAFVerificationCardProps {
  anafData: ANAFVerificationData | null | undefined;
  submittedName: string;
  submittedAddress: string;
  onReVerify: () => void;
  reVerifyLoading: boolean;
}

type OverallStatus = 'unknown' | 'error' | 'not_found' | 'inactive' | 'discrepancy' | 'verified';

const getOverallStatus = (anafData: ANAFVerificationData | null | undefined): OverallStatus => {
  if (!anafData || anafData.status === 'unknown') return 'unknown';
  if (anafData.status === 'error') return 'error';
  if (anafData.status === 'not_found') return 'not_found';
  if (anafData.status === 'verified') {
    if (anafData.inactive === true) return 'inactive';
    if (typeof anafData.nameMatchScore === 'number' && anafData.nameMatchScore < 0.5) return 'discrepancy';
    return 'verified';
  }
  return 'unknown';
};

const formatVerifiedAt = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
};

interface ComparisonRowProps {
  label: string;
  submitted: string;
  anafValue: string | null | undefined;
  showWarning: boolean;
}

const ComparisonRow = ({ label, submitted, anafValue, showWarning }: ComparisonRowProps) => (
  <div
    className={cn(
      'rounded-lg border p-3',
      showWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50',
    )}
  >
    <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Depus</p>
        <p className="text-sm text-gray-700 font-medium">{submitted || '—'}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">ANAF</p>
        <p
          className={cn(
            'text-sm font-medium',
            showWarning ? 'text-amber-800' : 'text-gray-700',
          )}
        >
          {anafValue || '—'}
        </p>
        {showWarning && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700">Posibilă discrepanță</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ANAFVerificationCard = ({
  anafData,
  submittedName,
  submittedAddress,
  onReVerify,
  reVerifyLoading,
}: ANAFVerificationCardProps) => {
  const overallStatus = getOverallStatus(anafData);

  const statusConfig: Record<
    OverallStatus,
    { label: string; variant: 'default' | 'success' | 'warning' | 'danger'; Icon: React.ElementType }
  > = {
    unknown: { label: 'Neverificat', variant: 'default', Icon: Clock },
    error: { label: 'Eroare ANAF', variant: 'warning', Icon: AlertCircle },
    not_found: { label: 'CUI negăsit', variant: 'danger', Icon: XCircle },
    inactive: { label: 'Firmă inactivă', variant: 'danger', Icon: XCircle },
    discrepancy: { label: 'Discrepanță detectată', variant: 'warning', Icon: AlertTriangle },
    verified: { label: 'Verificat ANAF', variant: 'success', Icon: CheckCircle2 },
  };

  const { label: statusLabel, variant: statusBadgeVariant, Icon: StatusIcon } = statusConfig[overallStatus];

  const nameScore = typeof anafData?.nameMatchScore === 'number' ? anafData.nameMatchScore : 1;
  const nameHasWarning = anafData?.status === 'verified' && nameScore < 0.7;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Verificare ANAF</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusLabel}
          </Badge>
          <button
            onClick={onReVerify}
            disabled={reVerifyLoading}
            title="Reverifica ANAF"
            className={cn(
              'p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer',
              reVerifyLoading && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('h-4 w-4', reVerifyLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      {overallStatus === 'unknown' && (
        <p className="text-sm text-gray-400">Verificarea ANAF nu a fost efectuată încă.</p>
      )}

      {overallStatus === 'error' && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            ANAF indisponibil. Apasă ↺ pentru a reîncerca.
          </p>
          {anafData?.rawError && (
            <p className="text-xs text-amber-700 mt-1 font-mono break-all">{anafData.rawError}</p>
          )}
        </div>
      )}

      {overallStatus === 'not_found' && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">
            CUI-ul nu a fost găsit în baza ANAF. Verificați că CUI-ul introdus este corect.
          </p>
        </div>
      )}

      {(overallStatus === 'verified' || overallStatus === 'inactive' || overallStatus === 'discrepancy') &&
        anafData && (
          <div className="space-y-3">
            {/* Comparison rows */}
            <ComparisonRow
              label="Denumire"
              submitted={submittedName}
              anafValue={anafData.denumire}
              showWarning={nameHasWarning}
            />
            <ComparisonRow
              label="Adresă"
              submitted={submittedAddress}
              anafValue={anafData.adresa}
              showWarning={false}
            />

            {/* Status pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs text-gray-500 font-medium">Status fiscal</p>
                {anafData.inactive === true ? (
                  <Badge variant="danger">Inactiv</Badge>
                ) : (
                  <Badge variant="success">Activ</Badge>
                )}
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs text-gray-500 font-medium">Plătitor TVA</p>
                {anafData.scpTva === true ? (
                  <Badge variant="success">Da</Badge>
                ) : (
                  <Badge variant="default">Nu</Badge>
                )}
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs text-gray-500 font-medium">Data înființării</p>
                <span className="text-sm text-gray-700 font-medium">
                  {anafData.dataInfiintare ?? '—'}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Footer */}
      {anafData?.verifiedAt && (
        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
          Ultima verificare: {formatVerifiedAt(anafData.verifiedAt)}
        </p>
      )}
    </Card>
  );
};

export default ANAFVerificationCard;
