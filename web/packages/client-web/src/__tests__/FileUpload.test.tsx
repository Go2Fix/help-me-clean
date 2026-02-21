import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '@/components/ui/FileUpload';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

function createFile(name: string, sizeBytes: number, type = 'image/png'): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

describe('FileUpload', () => {
  let onFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onFileSelect = vi.fn();
  });

  it('renders default label text', () => {
    render(<FileUpload onFileSelect={onFileSelect} />);
    expect(
      screen.getByText('Trage fisierul aici sau click pentru a selecta'),
    ).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<FileUpload onFileSelect={onFileSelect} label="Incarca document" />);
    expect(screen.getByText('Incarca document')).toBeInTheDocument();
  });

  it('shows max size hint', () => {
    render(<FileUpload onFileSelect={onFileSelect} />);
    expect(screen.getByText('Max 10MB - imagini sau PDF')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    const { container } = render(<FileUpload onFileSelect={onFileSelect} loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error for oversized file', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelect={onFileSelect} maxSizeMB={1} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const oversizedFile = createFile('large.png', 2 * 1024 * 1024);
    await user.upload(input, oversizedFile);

    expect(screen.getByText('Fisierul depaseste limita de 1MB.')).toBeInTheDocument();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('calls onFileSelect when valid file is selected', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelect={onFileSelect} maxSizeMB={10} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const validFile = createFile('photo.png', 500);
    await user.upload(input, validFile);

    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'photo.png' }));
  });

  it('shows selected file name after selection', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelect={onFileSelect} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const validFile = createFile('document.pdf', 100);
    await user.upload(input, validFile);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('applies disabled styling when disabled', () => {
    const { container } = render(<FileUpload onFileSelect={onFileSelect} disabled />);
    const dropZone = container.querySelector('.opacity-50');
    expect(dropZone).toBeInTheDocument();
  });
});
