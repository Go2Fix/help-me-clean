import { useState, useRef } from 'react';
import { User, Camera, Loader2 } from 'lucide-react';
import { cn } from '@go2fix/shared';

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export default function AvatarUpload({
  currentUrl,
  onUpload,
  loading = false,
  size = 'lg',
  disabled = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const iconSizeClasses = {
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Doar imagini sunt permise');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Imaginea depaseste limita de 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      await onUpload(file);
      setError('');
    } catch (err) {
      setError('Eroare la incarcarea imaginii');
      setPreview(null);
      console.error('Upload error:', err);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        disabled={disabled || loading}
        className={cn(
          sizeClasses[size],
          'relative rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50',
          'border-2 border-gray-200 hover:border-blue-500 transition-all duration-200',
          'group shadow-sm hover:shadow-md',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          !disabled && !loading && 'cursor-pointer'
        )}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className={cn(iconSizeClasses[size], 'text-gray-400')} />
          </div>
        )}

        {/* Overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 opacity-0 transition-opacity',
            'flex items-center justify-center',
            !disabled && !loading && 'group-hover:opacity-100'
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || loading}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-500 text-center max-w-[200px]">
          {error}
        </p>
      )}

      {!error && !loading && (
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Click pentru a schimba imaginea
        </p>
      )}
    </div>
  );
}
