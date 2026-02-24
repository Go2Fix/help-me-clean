import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Star, Briefcase, CalendarCheck, FileText, User as UserIcon, MapPin } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import DocumentCard from '@/components/ui/DocumentCard';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { useAuth } from '@/context/AuthContext';
import {
  MY_WORKER_PROFILE,
  MY_WORKER_STATS,
  MY_WORKER_SERVICE_AREAS,
  ACCEPT_INVITATION,
  UPLOAD_WORKER_DOCUMENT,
  DELETE_WORKER_DOCUMENT,
  UPLOAD_WORKER_AVATAR,
} from '@/graphql/operations';

const REQUIRED_WORKER_DOCS: { type: string; label: string }[] = [
  { type: 'cazier_judiciar', label: 'Cazier Judiciar' },
  { type: 'contract_munca', label: 'Contract de Munca' },
];

interface WorkerDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  rejectionReason?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profileData, loading: profileLoading } = useQuery(MY_WORKER_PROFILE);
  const { data: statsData, loading: statsLoading } = useQuery(MY_WORKER_STATS);
  const { data: areasData } = useQuery(MY_WORKER_SERVICE_AREAS);

  const profile = profileData?.myWorkerProfile;
  const stats = statsData?.myWorkerStats;
  const serviceAreas: { id: string; name: string; cityName: string }[] = areasData?.myWorkerServiceAreas ?? [];
  const loading = profileLoading || statsLoading;

  // Accept invitation
  const [inviteToken, setInviteToken] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [acceptInvitation, { loading: accepting }] = useMutation(ACCEPT_INVITATION, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }, { query: MY_WORKER_STATS }],
  });

  const [uploadDocument, { loading: uploading }] = useMutation(UPLOAD_WORKER_DOCUMENT, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [deleteDocument, { loading: deleting }] = useMutation(DELETE_WORKER_DOCUMENT, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [uploadAvatar, { loading: uploadingAvatar }] = useMutation(UPLOAD_WORKER_AVATAR, {
    refetchQueries: [{ query: MY_WORKER_PROFILE }],
  });
  const [uploadingType, setUploadingType] = useState('');

  const handleUploadDoc = async (file: File, documentType: string) => {
    if (!profile) return;
    setUploadingType(documentType);
    try {
      await uploadDocument({
        variables: { workerId: profile.id, documentType, file },
      });
    } catch {
      // Error handled by Apollo
    } finally {
      setUploadingType('');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteDocument({ variables: { id: docId } });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id) return;
    try {
      await uploadAvatar({
        variables: { workerId: profile.id, file },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setInviteError('Te rugam sa introduci codul invitatie.');
      return;
    }
    setInviteError('');
    setInviteSuccess('');
    try {
      const { data } = await acceptInvitation({ variables: { token: inviteToken.trim() } });
      const companyName = data?.acceptInvitation?.company?.companyName;
      setInviteSuccess(
        companyName
          ? `Ai fost adaugat la ${companyName}!`
          : 'Invitatia a fost acceptata cu succes!',
      );
      setInviteToken('');
    } catch {
      setInviteError('Codul de invitatie nu este valid sau a expirat.');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* User Info */}
          <Card className="mb-6">
            <div className="flex items-center gap-4">
              {profile?.user?.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt={user?.fullName ?? profile?.fullName ?? 'Profile'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                  {getInitials(user?.fullName ?? profile?.fullName ?? '??')}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">
                  {user?.fullName ?? profile?.fullName ?? '--'}
                </h2>
                <p className="text-sm text-gray-500">{user?.email ?? profile?.email ?? '--'}</p>
                {profile?.phone && (
                  <p className="text-sm text-gray-400 mt-0.5">{profile.phone}</p>
                )}
                {profile?.company?.companyName && (
                  <Badge variant="info" className="mt-2">{profile.company.companyName}</Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Avatar Upload */}
          {profile && (
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Poza de profil</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Incarca o imagine pentru profilul tau. Aceasta va fi afisata clientilor si echipei.
              </p>
              <div className="flex items-center gap-8">
                <AvatarUpload
                  currentUrl={profile.user?.avatarUrl}
                  onUpload={handleAvatarUpload}
                  loading={uploadingAvatar}
                  size="xl"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Alege o fotografie profesionala
                  </p>
                  <p className="text-xs text-gray-400">
                    Recomandat: 400x400 pixeli. Formate acceptate: JPG, PNG, WEBP. Max 10MB
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total lucrari</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalJobsCompleted ?? 0}</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/10">
                    <CalendarCheck className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Luna aceasta</p>
                    <p className="text-xl font-bold text-gray-900">{stats.thisMonthJobs ?? 0}</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <Star className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rating</p>
                    <p className="text-xl font-bold text-accent">
                      {stats.averageRating ? Number(stats.averageRating).toFixed(1) : '--'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Service Areas */}
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Zone de lucru</h2>
            </div>
            {serviceAreas.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nu ai zone de lucru asignate. Contacteaza administratorul firmei pentru a-ti seta zonele.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-sm font-medium text-blue-700"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {area.name}, {area.cityName}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* My Documents */}
          {profile && (
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Documentele mele</h2>
              </div>
              {profile.status === 'PENDING_REVIEW' && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Incarca documentele necesare pentru a fi activat de administrator.
                </div>
              )}
              <div className="space-y-4">
                {REQUIRED_WORKER_DOCS.map((reqDoc) => {
                  const docs: WorkerDocument[] = profile.documents ?? [];
                  const existingDoc = docs.find((d: WorkerDocument) => d.documentType === reqDoc.type);
                  return (
                    <div key={reqDoc.type}>
                      {existingDoc ? (
                        <DocumentCard
                          id={existingDoc.id}
                          documentType={existingDoc.documentType}
                          documentTypeLabel={reqDoc.label}
                          fileName={existingDoc.fileName}
                          fileUrl={existingDoc.fileUrl}
                          status={existingDoc.status}
                          uploadedAt={existingDoc.uploadedAt}
                          rejectionReason={existingDoc.rejectionReason}
                          onDelete={handleDeleteDoc}
                          deleteLoading={deleting}
                        />
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                          <p className="text-sm font-medium text-gray-700 mb-3">{reqDoc.label}</p>
                          <FileUpload
                            onFileSelect={(file) => handleUploadDoc(file, reqDoc.type)}
                            loading={uploading && uploadingType === reqDoc.type}
                            disabled={uploading}
                            label={`Incarca ${reqDoc.label}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Accept Invitation */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Accepta invitatie</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ai primit un cod de invitatie de la o firma? Introdu-l mai jos pentru a te alatura echipei.
            </p>
            <form onSubmit={handleAcceptInvitation} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Codul de invitatie"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                />
              </div>
              <Button type="submit" loading={accepting}>
                Accepta
              </Button>
            </form>
            {inviteError && (
              <p className="text-sm text-red-500 mt-2">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-secondary mt-2">{inviteSuccess}</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
