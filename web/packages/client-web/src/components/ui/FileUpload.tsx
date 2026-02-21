import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@go2fix/shared';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function FileUpload({
  onFileSelect,
  accept = 'image/*,application/pdf',
  maxSizeMB = 10,
  label = 'Trage fisierul aici sau click pentru a selecta',
  loading = false,
  disabled = false,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): boolean => {
    setError('');
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Fisierul depaseste limita de ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (validate(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || loading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const clear = () => {
    setSelectedFile(null);
    setError('');
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !loading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer',
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        ) : (
          <Upload className="h-8 w-8 text-gray-400" />
        )}
        <p className="text-sm text-gray-500 text-center">{label}</p>
        <p className="text-xs text-gray-400">Max {maxSizeMB}MB - imagini sau PDF</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {selectedFile && !error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <span className="truncate">{selectedFile.name}</span>
          <button
            onClick={clear}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
