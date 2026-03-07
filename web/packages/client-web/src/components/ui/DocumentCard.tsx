import {
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Badge from './Badge';
import { cn } from '@go2fix/shared';

const apiBase =
  (import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined)?.replace('/query', '') ??
  'http://localhost:8080';

interface DocumentCardProps {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  rejectionReason?: string | null;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  deleteLoading?: boolean;
  reviewLoading?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: 'warning' | 'success' | 'danger'; icon: React.ElementType }
> = {
  PENDING: { label: 'În așteptare', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Aprobat', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Respins', variant: 'danger', icon: XCircle },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function DocumentCard({
  id,
  documentTypeLabel,
  fileName,
  status,
  uploadedAt,
  rejectionReason,
  onDelete,
  onApprove,
  onReject,
  deleteLoading,
  reviewLoading,
}: DocumentCardProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  const StatusIcon = config.icon;

  const documentUrl = `${apiBase}/api/documents/${id}`;
  const hasPendingActions = status === 'PENDING' && (onApprove || onReject);

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white">
      <div className="p-2.5 rounded-xl bg-gray-100 shrink-0">
        <FileText className="h-5 w-5 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{documentTypeLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(uploadedAt)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={config.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {onDelete && (status === 'PENDING' || status === 'REJECTED') && (
              <button
                onClick={() => onDelete(id)}
                disabled={deleteLoading}
                className={cn(
                  'p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition cursor-pointer',
                  deleteLoading && 'opacity-50 cursor-not-allowed',
                )}
                title="Șterge document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {status === 'REJECTED' && rejectionReason && (
          <div className="mt-2 flex items-start gap-1.5 p-2.5 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600">
              <span className="font-medium">Motiv respingere:</span> {rejectionReason}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Vizualizează
          </a>

          {hasPendingActions && (
            <span className="text-gray-200 text-xs">|</span>
          )}

          {onApprove && status === 'PENDING' && (
            <button
              onClick={() => onApprove(id)}
              disabled={reviewLoading}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer',
                reviewLoading && 'opacity-50 cursor-not-allowed',
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprobă
            </button>
          )}

          {onReject && status === 'PENDING' && (
            <button
              onClick={() => onReject(id)}
              disabled={reviewLoading}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition cursor-pointer',
                reviewLoading && 'opacity-50 cursor-not-allowed',
              )}
            >
              <XCircle className="h-3.5 w-3.5" />
              Respinge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
