import {
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
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
  PENDING: { label: 'In asteptare', variant: 'warning', icon: Clock },
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

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white">
      <div className="p-2.5 rounded-xl bg-gray-100 shrink-0">
        <FileText className="h-5 w-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <Badge variant={config.variant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{documentTypeLabel}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(uploadedAt)}</p>
        {status === 'REJECTED' && rejectionReason && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 text-xs text-red-600">
            Motiv: {rejectionReason}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={documentUrl}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
          title="Previzualizeaza"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {onDelete && (status === 'PENDING' || status === 'REJECTED') && (
          <button
            onClick={() => onDelete(id)}
            disabled={deleteLoading}
            className={cn(
              'p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer',
              deleteLoading && 'opacity-50 cursor-not-allowed',
            )}
            title="Sterge"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {onApprove && status === 'PENDING' && (
          <button
            onClick={() => onApprove(id)}
            disabled={reviewLoading}
            className={cn(
              'p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer',
              reviewLoading && 'opacity-50 cursor-not-allowed',
            )}
            title="Aproba"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        {onReject && status === 'PENDING' && (
          <button
            onClick={() => onReject(id)}
            disabled={reviewLoading}
            className={cn(
              'p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer',
              reviewLoading && 'opacity-50 cursor-not-allowed',
            )}
            title="Respinge"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
