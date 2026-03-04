import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTE_MAP } from '@/i18n/routes';
import { useMutation, useQuery } from '@apollo/client';
import {
  Upload,
  Trash2,
  Info,
  CheckCircle2,
  FileText,
  AlertCircle,
  Check,
  User,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  MY_WORKER_PROFILE,
  UPLOAD_WORKER_DOCUMENT,
  DELETE_WORKER_DOCUMENT,
  UPLOAD_WORKER_AVATAR,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkerDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface RequiredDoc {
  type: string;
  label: string;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVE_STEP = 2;

// ─── Stepper ─────────────────────────────────────────────────────────────────

interface OnboardingStepperProps {
  steps: { label: string; index: number }[];
}

function OnboardingStepper({ steps }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, i) => {
        const isCompleted = i < ACTIVE_STEP;
        const isActive = i === ACTIVE_STEP;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'h-px w-12 sm:w-20 mx-2 mb-5 transition-all',
                  i < ACTIVE_STEP ? 'bg-emerald-400' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Profile Image Upload ─────────────────────────────────────────────────────

interface ProfileImageUploadProps {
  avatarUrl?: string;
  workerId: string;
  onUploadComplete: () => void;
}

function ProfileImageUpload({ avatarUrl, workerId, onUploadComplete }: ProfileImageUploadProps) {
  const { t } = useTranslation(['dashboard', 'worker']);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadAvatar, { loading: uploading }] = useMutation(UPLOAD_WORKER_AVATAR);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('worker:documents.avatar.errorType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('worker:documents.avatar.errorSize'));
      return;
    }

    setError('');
    try {
      await uploadAvatar({
        variables: { workerId, file },
        refetchQueries: [{ query: MY_WORKER_PROFILE }],
      });
      onUploadComplete();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('worker:documents.avatar.errorGeneric'));
    }
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
      <div className="flex items-start gap-4">
        {/* Preview or placeholder */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t('worker:documents.avatar.title')}
              className="w-24 h-24 rounded-xl object-cover border-2 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-lg">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">
                {avatarUrl ? t('worker:documents.avatar.title') : t('worker:documents.avatar.titleUpload')}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {t('worker:documents.avatar.description')}
              </p>
            </div>
            {avatarUrl && (
              <Badge variant="success" className="flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('worker:documents.avatar.uploaded')}
              </Badge>
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="mt-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              variant={avatarUrl ? 'outline' : 'primary'}
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading
                ? t('worker:documents.avatar.uploading')
                : avatarUrl
                ? t('worker:documents.avatar.changePhoto')
                : t('worker:documents.avatar.uploadPhoto')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  index: number;
  doc: RequiredDoc;
  uploaded?: WorkerDocument;
  workerId: string;
  onUploadComplete: () => void;
}

function DocumentCard({ index, doc, uploaded, workerId, onUploadComplete }: DocumentCardProps) {
  const { t } = useTranslation(['dashboard', 'worker']);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_WORKER_DOCUMENT);
  const [deleteDocument, { loading: deleting }] = useMutation(DELETE_WORKER_DOCUMENT);
  const [error, setError] = useState('');

  const status = uploaded?.status;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError(t('worker:documents.documentCard.errorType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('worker:documents.documentCard.errorSize'));
      return;
    }

    setError('');
    try {
      await uploadDocument({
        variables: { workerId, documentType: doc.type, file },
        refetchQueries: [{ query: MY_WORKER_PROFILE }],
      });
      onUploadComplete();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('worker:documents.documentCard.errorUpload'));
    }
  };

  const handleDelete = async () => {
    if (!uploaded || !confirm(t('worker:documents.documentCard.confirmDelete', { label: doc.label }))) return;
    try {
      await deleteDocument({
        variables: { id: uploaded.id },
        refetchQueries: [{ query: MY_WORKER_PROFILE }],
      });
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('worker:documents.documentCard.errorDelete'));
    }
  };

  const cardClass = [
    'rounded-xl border-2 p-5 transition-all',
    !uploaded
      ? 'border-dashed border-gray-200 bg-white'
      : status === 'APPROVED'
      ? 'border-emerald-200 bg-emerald-50/30'
      : status === 'REJECTED'
      ? 'border-red-200 bg-red-50/30'
      : 'border-amber-200 bg-amber-50/30',
  ].join(' ');

  const circleClass = [
    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
    !uploaded
      ? 'bg-gray-100 text-gray-500'
      : status === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-600'
      : status === 'REJECTED'
      ? 'bg-red-100 text-red-600'
      : 'bg-amber-100 text-amber-600',
  ].join(' ');

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-4">
        {/* Index or status icon */}
        <div className={circleClass}>
          {status === 'APPROVED' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : status === 'REJECTED' ? (
            <AlertCircle className="w-5 h-5" />
          ) : uploaded ? (
            <FileText className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{doc.label}</p>

          {!uploaded && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}

          {uploaded && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 truncate max-w-[200px]">
                {uploaded.fileName}
              </span>
              {status === 'PENDING' && (
                <Badge variant="warning">{t('worker:documents.documentCard.pending')}</Badge>
              )}
              {status === 'APPROVED' && (
                <Badge variant="success">{t('worker:documents.documentCard.approved')}</Badge>
              )}
              {status === 'REJECTED' && (
                <>
                  <Badge variant="danger">{t('worker:documents.documentCard.rejected')}</Badge>
                  {uploaded.rejectionReason && (
                    <p className="text-xs text-red-600 w-full mt-1">
                      {t('worker:documents.documentCard.rejectionReason', { reason: uploaded.rejectionReason })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-2 p-2 rounded-lg bg-red-50 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading || deleting}
            />
            <Button
              variant={uploaded ? 'outline' : 'primary'}
              size="sm"
              disabled={uploading || deleting || status === 'APPROVED'}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading
                ? t('worker:documents.documentCard.uploading')
                : uploaded
                ? t('worker:documents.documentCard.reupload')
                : t('worker:documents.documentCard.upload')}
            </Button>

            {uploaded && status !== 'APPROVED' && (
              <Button
                variant="ghost"
                size="sm"
                disabled={uploading || deleting}
                onClick={handleDelete}
                type="button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting
                  ? t('worker:documents.documentCard.deleting')
                  : t('worker:documents.documentCard.delete')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DocumentUploadPage() {
  const { t } = useTranslation(['dashboard', 'worker']);
  const navigate = useNavigate();
  const { data, refetch } = useQuery(MY_WORKER_PROFILE);

  const profile = data?.myWorkerProfile;
  const documents = profile?.documents || [];
  const avatarUrl = profile?.user?.avatarUrl;
  const workerId = profile?.id;

  const REQUIRED_DOCS: RequiredDoc[] = [
    {
      type: 'cazier_judiciar',
      label: t('worker:documents.requiredDocs.cazier_judiciar.label'),
      description: t('worker:documents.requiredDocs.cazier_judiciar.description'),
    },
    {
      type: 'contract_munca',
      label: t('worker:documents.requiredDocs.contract_munca.label'),
      description: t('worker:documents.requiredDocs.contract_munca.description'),
    },
  ];

  const STEPS = [
    { label: t('worker:documents.steps.invitation'), index: 0 },
    { label: t('worker:documents.steps.test'), index: 1 },
    { label: t('worker:documents.steps.documents'), index: 2 },
    { label: t('worker:documents.steps.review'), index: 3 },
    { label: t('worker:documents.steps.active'), index: 4 },
  ];

  // Check completion
  const hasAvatar = !!avatarUrl;
  const uploadedDocTypes = documents.map((d: WorkerDocument) => d.documentType);
  const allDocsUploaded = REQUIRED_DOCS.every((doc) => uploadedDocTypes.includes(doc.type));
  const isComplete = hasAvatar && allDocsUploaded;

  const uploadedCount = uploadedDocTypes.filter((type: string) =>
    REQUIRED_DOCS.some((doc) => doc.type === type),
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">{t('worker:documents.pageTitle')}</h1>
        <p className="text-gray-500">{t('worker:documents.pageSubtitle')}</p>
      </div>

      {/* Stepper */}
      <OnboardingStepper steps={STEPS} />

      {/* GDPR notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 mb-6">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {t('worker:documents.gdpr', {
            gdprLink: (
              <Link
                key="gdpr"
                to={ROUTE_MAP.gdpr.ro}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                {t('worker:documents.gdprLink')}
              </Link>
            ),
          })}
        </span>
      </div>

      {/* Progress */}
      {!isComplete && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {hasAvatar
                  ? t('worker:documents.progressCount', { uploaded: uploadedCount, total: REQUIRED_DOCS.length })
                  : t('worker:documents.progressStart')}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {t('worker:documents.progressHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {isComplete && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">{t('worker:documents.allUploaded')}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{t('worker:documents.allUploadedHint')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Image */}
      {workerId && (
        <ProfileImageUpload
          avatarUrl={avatarUrl}
          workerId={workerId}
          onUploadComplete={() => refetch()}
        />
      )}

      {/* Documents */}
      <div className="space-y-4 mb-8">
        {REQUIRED_DOCS.map((doc, i) => {
          const uploaded = documents.find((d: WorkerDocument) => d.documentType === doc.type);
          return (
            <DocumentCard
              key={doc.type}
              index={i}
              doc={doc}
              uploaded={uploaded}
              workerId={workerId}
              onUploadComplete={() => refetch()}
            />
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button variant="ghost" onClick={() => navigate('/worker')}>
          {t('worker:documents.backToDashboard')}
        </Button>
        {isComplete && (
          <Button onClick={() => navigate('/worker')}>
            {t('worker:documents.continue')}
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
