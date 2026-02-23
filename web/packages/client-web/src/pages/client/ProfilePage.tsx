import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { User, Save, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AvatarUpload from '@/components/ui/AvatarUpload';
import {
  UPDATE_PROFILE,
  UPLOAD_AVATAR,
  DELETE_MY_ACCOUNT,
} from '@/graphql/operations';

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, 'Numele trebuie sa aiba cel putin 2 caractere'),
  phone: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

type ProfileFormValues = {
  fullName: string;
  phone?: string;
  preferredLanguage?: string;
};

// ─── Language options ────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: 'ro', label: 'Romana' },
  { value: 'en', label: 'English' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, logout, refetchUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      preferredLanguage: 'ro',
    },
  });

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || 'ro',
      });
    }
  }, [user, reset]);

  const [updateProfile, { loading: updating, data: updateData }] =
    useMutation(UPDATE_PROFILE);

  const [uploadAvatar, { loading: uploadingAvatar }] = useMutation(UPLOAD_AVATAR, {
    onCompleted: () => {
      refetchUser();
    },
  });

  // ─── Delete account ────────────────────────────────────────────────────────

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT, {
    onCompleted: () => {
      logout();
    },
  });

  // ─── Profile submit ────────────────────────────────────────────────────────

  const saved = !!updateData;

  // Auth guard
  if (authLoading) {
    return <LoadingSpinner text="Se verifica autentificarea..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: '/cont/setari' }} replace />;
  }

  const onSubmit = async (values: ProfileFormValues) => {
    await updateProfile({
      variables: {
        input: {
          fullName: values.fullName,
          phone: values.phone || undefined,
          preferredLanguage: values.preferredLanguage || undefined,
        },
      },
    });
    refetchUser();
  };

  const handleAvatarUpload = async (file: File) => {
    await uploadAvatar({
      variables: { file },
    });
  };

  return (
    <div className="py-2 sm:py-8">
      <div className="max-w-2xl mx-auto sm:px-2">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profilul meu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioneaza informatiile contului tau.
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
              <AvatarUpload
                currentUrl={user?.avatarUrl}
                onUpload={handleAvatarUpload}
                loading={uploadingAvatar}
                size="xl"
              />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-gray-900">
                  Poza de profil
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Incarca o imagine pentru profilul tau. Recomandat: 400x400 pixeli.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Formate acceptate: JPG, PNG, WEBP. Marime maxima: 10MB
                </p>
              </div>
            </div>
          </Card>

          {/* Profile Form */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Informatii personale
                </h2>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Nume complet"
                placeholder="Numele tau complet"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Input
                label="Numar de telefon"
                type="tel"
                placeholder="+40 7XX XXX XXX"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Select
                label="Limba preferata"
                options={LANGUAGE_OPTIONS}
                error={errors.preferredLanguage?.message}
                {...register('preferredLanguage')}
              />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="submit"
                  loading={updating}
                  disabled={!isDirty && !updating}
                >
                  <Save className="h-4 w-4" />
                  Salveaza modificarile
                </Button>
                {saved && !isDirty && (
                  <span className="flex items-center gap-1.5 text-sm text-secondary font-medium">
                    <Check className="h-4 w-4" />
                    Salvat cu succes
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Delete Account */}
          <Card className="border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Sterge contul
                </h2>
                <p className="text-sm text-gray-500">
                  Actiune permanenta si ireversibila.
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Odata sters, contul tau nu va mai putea fi recuperat. Toate datele personale vor fi sterse definitiv.
                </p>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Sterge contul meu
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-3">
                  Scrie <span className="font-bold">STERGE</span> pentru a confirma stergerea contului:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Scrie STERGE aici"
                  className="mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Anuleaza
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                    loading={deletingAccount}
                    disabled={deleteConfirmText !== 'STERGE'}
                    onClick={() => deleteMyAccount()}
                  >
                    <Trash2 className="h-4 w-4" />
                    Confirma stergerea
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
