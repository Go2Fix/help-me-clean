import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentCard from '@/components/ui/DocumentCard';

vi.mock('@go2fix/shared', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

const baseProps = {
  id: 'doc-1',
  documentType: 'ID_CARD',
  documentTypeLabel: 'Carte de identitate',
  fileName: 'buletin.pdf',
  fileUrl: 'uploads/companies/123/buletin.pdf',
  status: 'PENDING' as const,
  uploadedAt: '2024-06-15T10:30:00Z',
};

describe('DocumentCard', () => {
  it('renders file name and type label', () => {
    render(<DocumentCard {...baseProps} />);
    expect(screen.getByText('buletin.pdf')).toBeInTheDocument();
    expect(screen.getByText('Carte de identitate')).toBeInTheDocument();
  });

  it('renders PENDING status badge', () => {
    render(<DocumentCard {...baseProps} status="PENDING" />);
    expect(screen.getByText('În așteptare')).toBeInTheDocument();
  });

  it('renders APPROVED status badge', () => {
    render(<DocumentCard {...baseProps} status="APPROVED" />);
    expect(screen.getByText('Aprobat')).toBeInTheDocument();
  });

  it('renders REJECTED status badge with rejection reason', () => {
    render(
      <DocumentCard
        {...baseProps}
        status="REJECTED"
        rejectionReason="Bad quality"
      />,
    );
    expect(screen.getByText('Respins')).toBeInTheDocument();
    expect(screen.getByText('Motiv respingere:')).toBeInTheDocument();
    expect(screen.getByText('Bad quality')).toBeInTheDocument();
  });

  it('renders preview link pointing to backend proxy endpoint', () => {
    render(<DocumentCard {...baseProps} />);
    const link = screen.getByText('Vizualizează');
    expect(link.closest('a')).toHaveAttribute('href', 'http://localhost:8080/api/documents/doc-1');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('shows delete button for PENDING docs when onDelete provided', () => {
    render(<DocumentCard {...baseProps} status="PENDING" onDelete={vi.fn()} />);
    expect(screen.getByTitle('Șterge document')).toBeInTheDocument();
  });

  it('does not show delete button for APPROVED docs', () => {
    render(<DocumentCard {...baseProps} status="APPROVED" onDelete={vi.fn()} />);
    expect(screen.queryByTitle('Șterge document')).not.toBeInTheDocument();
  });

  it('shows approve and reject buttons when handlers provided and status is PENDING', () => {
    render(
      <DocumentCard
        {...baseProps}
        status="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Aprobă/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Respinge/i })).toBeInTheDocument();
  });

  it('does not show approve/reject buttons when status is APPROVED', () => {
    render(
      <DocumentCard
        {...baseProps}
        status="APPROVED"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Aprobă/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Respinge/i })).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<DocumentCard {...baseProps} status="PENDING" onDelete={onDelete} />);
    await user.click(screen.getByTitle('Șterge document'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('doc-1');
  });

  it('calls onApprove when approve button clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<DocumentCard {...baseProps} status="PENDING" onApprove={onApprove} />);
    await user.click(screen.getByRole('button', { name: /Aprobă/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith('doc-1');
  });

  it('calls onReject when reject button clicked', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<DocumentCard {...baseProps} status="PENDING" onReject={onReject} />);
    await user.click(screen.getByRole('button', { name: /Respinge/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith('doc-1');
  });
});
