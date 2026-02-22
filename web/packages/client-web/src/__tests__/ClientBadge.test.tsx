import { render, screen } from '@testing-library/react';
import ClientBadge from '@/components/ui/ClientBadge';

describe('ClientBadge', () => {
  it('shows Romanian label "Finalizata" for COMPLETED status', () => {
    render(<ClientBadge status="COMPLETED" />);
    expect(screen.getByText('Finalizata')).toBeInTheDocument();
  });

  it('shows Romanian label "In desfasurare" for IN_PROGRESS status', () => {
    render(<ClientBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In desfasurare')).toBeInTheDocument();
  });

  it('shows Romanian label "Anulata" for CANCELLED status', () => {
    render(<ClientBadge status="CANCELLED" />);
    expect(screen.getByText('Anulata')).toBeInTheDocument();
  });

  it('shows Romanian label "Alocata" for ASSIGNED status', () => {
    render(<ClientBadge status="ASSIGNED" />);
    expect(screen.getByText('Alocata')).toBeInTheDocument();
  });

  it('shows Romanian label "Confirmata" for CONFIRMED status', () => {
    render(<ClientBadge status="CONFIRMED" />);
    expect(screen.getByText('Confirmata')).toBeInTheDocument();
  });

  it('shows raw status text for unknown status', () => {
    render(<ClientBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
  });

  it('applies green color classes for COMPLETED', () => {
    render(<ClientBadge status="COMPLETED" />);
    const badge = screen.getByText('Finalizata');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('applies purple color classes for IN_PROGRESS', () => {
    render(<ClientBadge status="IN_PROGRESS" />);
    const badge = screen.getByText('In desfasurare');
    expect(badge.className).toContain('bg-purple-100');
    expect(badge.className).toContain('text-purple-800');
  });

  it('applies red color classes for CANCELLED', () => {
    render(<ClientBadge status="CANCELLED" />);
    const badge = screen.getByText('Anulata');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('applies blue color classes for ASSIGNED', () => {
    render(<ClientBadge status="ASSIGNED" />);
    const badge = screen.getByText('Alocata');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('applies indigo color classes for CONFIRMED', () => {
    render(<ClientBadge status="CONFIRMED" />);
    const badge = screen.getByText('Confirmata');
    expect(badge.className).toContain('bg-indigo-100');
    expect(badge.className).toContain('text-indigo-800');
  });

  it('applies gray fallback classes for unknown status', () => {
    render(<ClientBadge status="SOMETHING_ELSE" />);
    const badge = screen.getByText('SOMETHING_ELSE');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('applies custom className', () => {
    render(<ClientBadge status="CONFIRMED" className="extra" />);
    const badge = screen.getByText('Confirmata');
    expect(badge.className).toContain('extra');
  });

  it('renders as a span element', () => {
    render(<ClientBadge status="CONFIRMED" />);
    const badge = screen.getByText('Confirmata');
    expect(badge.tagName).toBe('SPAN');
  });
});
