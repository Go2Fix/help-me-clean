import { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTE_MAP } from '@/i18n/routes';
import { useMutation } from '@apollo/client';
import {
  Upload,
  Trash2,
  ArrowRight,
  Info,
  CheckCircle2,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  MY_COMPANY,
  UPLOAD_COMPANY_DOCUMENT,
  DELETE_COMPANY_DOCUMENT,
} from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyDocument {
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

const REQUIRED_DOCS: RequiredDoc[] = [
  {
    type: 'certificat_constatator',
    label: 'Certificat Constatator',
    description: 'Certificatul constatator al firmei (PDF, max 10MB)',
  },
  {
    type: 'asigurare_raspundere_civila',
    label: 'Asigurare RCA',
    description: 'Polita de asigurare de raspundere civila (PDF, max 10MB)',
  },
  {
    type: 'cui_document',
    label: 'Document CUI',
    description: 'Certificat de inregistrare fiscala (PDF, max 10MB)',
  },
];

const STEPS = [
  { label: 'Inregistrare', index: 0 },
  { label: 'Documente', index: 1 },
  { label: 'Verificare', index: 2 },
  { label: 'Activ', index: 3 },
];

const ACTIVE_STEP = 1;

// ─── Stepper ─────────────────────────────────────────────────────────────────

function OnboardingStepper() {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => {
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
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-16 sm:w-24 mx-2 mb-5 transition-all',
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

// ─── Hidden file input trigger ────────────────────────────────────────────────

interface FileInputButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  label: string;
  variant?: 'outline' | 'primary';
  icon?: React.ReactNode;
}

function FileInputButton({
  onFileSelect,
  disabled = false,
  label,
  variant = 'outline',
  icon,
}: FileInputButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <Button
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {icon}
        {label}
      </Button>
    </>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  index: number;
  doc: RequiredDoc;
  uploaded?: CompanyDocument;
  onUpload: (file: File) => void;
  onDelete: () => void;
  uploading: boolean;
  deleting: boolean;
}

function DocumentCard({
  index,
  doc,
  uploaded,
  onUpload,
  onDelete,
  uploading,
  deleting,
}: DocumentCardProps) {
  const status = uploaded?.status;

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

          {!uploaded && (
            <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
          )}

          {uploaded && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 truncate max-w-[200px]">
                {uploaded.fileName}
              </span>
              {status === 'PENDING' && (
                <Badge variant="warning">In asteptare</Badge>
              )}
              {status === 'APPROVED' && (
                <Badge variant="success">Aprobat</Badge>
              )}
              {status === 'REJECTED' && (
                <>
                  <Badge variant="danger">Respins</Badge>
                  {uploaded.rejectionReason && (
                    <p className="w-full text-xs text-red-600 mt-1">
                      Motiv: {uploaded.rejectionReason}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {uploaded && (status === 'PENDING' || status === 'REJECTED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-red-500 px-2"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {(!uploaded || status === 'REJECTED') && (
            <FileInputButton
              onFileSelect={onUpload}
              disabled={uploading}
              label={uploaded ? 'Incarca din nou' : 'Incarca'}
              variant={uploaded ? 'outline' : 'primary'}
              icon={<Upload className="w-3.5 h-3.5" />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentUploadPage() {
  const { company } = useCompany();
  const navigate = useNavigate();

  const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_COMPANY_DOCUMENT, {
    refetchQueries: [{ query: MY_COMPANY }],
  });

  const [deleteDocument, { loading: deleting }] = useMutation(DELETE_COMPANY_DOCUMENT, {
    refetchQueries: [{ query: MY_COMPANY }],
  });

  const allDocsUploaded = REQUIRED_DOCS.every(doc =>
    company?.documents?.some((d: CompanyDocument) => d.documentType === doc.type)
  );

  const uploadedCount = REQUIRED_DOCS.filter(doc =>
    company?.documents?.some((d: CompanyDocument) => d.documentType === doc.type)
  ).length;

  const progressPercent = Math.round((uploadedCount / REQUIRED_DOCS.length) * 100);

  const handleUpload = async (file: File, documentType: string) => {
    if (!company?.id) return;
    try {
      await uploadDocument({
        variables: { companyId: company.id, documentType, file },
      });
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument({ variables: { id: docId } });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleContinue = () => {
    if (allDocsUploaded) {
      navigate('/firma');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Stepper */}
        <OnboardingStepper />

        {/* Company name pill + heading */}
        <div className="text-center mb-8">
          {company?.companyName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4 border border-blue-100">
              <FileText className="w-3.5 h-3.5" />
              {company.companyName}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Incarca documentele obligatorii
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Pentru aprobare, avem nevoie de urmatoarele documente in format PDF.
            Echipa noastra le va verifica in 1–2 zile lucratoare.
          </p>
        </div>

        {/* GDPR notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 mb-6">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Documentele tale sunt stocate securizat și procesate conform{' '}
            <Link to={ROUTE_MAP.gdpr.ro} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Notei de Informare GDPR
            </Link>
            . Accesul este restricționat exclusiv echipei de verificare Go2Fix.
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {uploadedCount} din {REQUIRED_DOCS.length} documente incarcate
            </span>
            <span className="text-xs font-bold text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Document cards */}
        <div className="space-y-3 mb-8">
          {REQUIRED_DOCS.map((doc, index) => {
            const uploaded = company?.documents?.find(
              (d: CompanyDocument) => d.documentType === doc.type
            );
            return (
              <DocumentCard
                key={doc.type}
                index={index}
                doc={doc}
                uploaded={uploaded}
                onUpload={(file) => handleUpload(file, doc.type)}
                onDelete={() => uploaded && handleDelete(uploaded.id)}
                uploading={uploading}
                deleting={deleting}
              />
            );
          })}
        </div>

        {/* CTA section */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!allDocsUploaded}
            className="w-full sm:w-auto px-12"
          >
            {allDocsUploaded ? (
              <>
                Trimite pentru verificare
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              `Trimite pentru verificare (${REQUIRED_DOCS.length - uploadedCount} ramas${REQUIRED_DOCS.length - uploadedCount === 1 ? '' : 'e'})`
            )}
          </Button>
          <p className="text-xs text-gray-400">
            Vei fi notificat prin email in 1–2 zile lucratoare
          </p>
        </div>

        {/* Info callout */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Ce se intampla dupa ce trimiti documentele?
            </p>
            <ul className="space-y-1.5">
              {[
                'Echipa noastra revizuieste documentele in 1–2 zile lucratoare',
                'Primesti confirmare pe email la fiecare etapa',
                'Obtii acces complet la platforma dupa aprobare',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-blue-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
