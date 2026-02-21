import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  RotateCcw,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@go2fix/shared';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ALL_REFUND_REQUESTS,
  PROCESS_REFUND,
  ADMIN_ISSUE_REFUND,
} from '@/graphql/operations';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRON(amount: number): string {
  return (amount / 100).toFixed(2) + ' lei';
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: string;
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    referenceCode: string;
    serviceName: string;
  } | null;
  requestedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  approvedBy: {
    id: string;
    fullName: string;
  } | null;
}

// ─── Status Maps ────────────────────────────────────────────────────────────

type StatusTab = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

const tabs: { key: StatusTab; label: string }[] = [
  { key: 'REQUESTED', label: 'Solicitate' },
  { key: 'APPROVED', label: 'Aprobate' },
  { key: 'PROCESSED', label: 'Procesate' },
  { key: 'REJECTED', label: 'Respinse' },
];

const refundStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PROCESSED: 'success',
  REJECTED: 'danger',
};

const refundStatusLabel: Record<string, string> = {
  REQUESTED: 'Solicitata',
  APPROVED: 'Aprobata',
  PROCESSED: 'Procesata',
  REJECTED: 'Respinsa',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('REQUESTED');
  const [directModalOpen, setDirectModalOpen] = useState(false);

  // Direct refund modal form state
  const [directBookingId, setDirectBookingId] = useState('');
  const [directAmount, setDirectAmount] = useState('');
  const [directReason, setDirectReason] = useState('');

  const { data, loading, refetch } = useQuery(ALL_REFUND_REQUESTS, {
    variables: {
      status: activeTab,
      first: 50,
    },
  });

  const [processRefund, { loading: processing }] = useMutation(PROCESS_REFUND, {
    onCompleted: () => refetch(),
  });

  const [issueRefund, { loading: issuing }] = useMutation(ADMIN_ISSUE_REFUND, {
    onCompleted: () => {
      setDirectModalOpen(false);
      setDirectBookingId('');
      setDirectAmount('');
      setDirectReason('');
      refetch();
    },
  });

  const refunds: RefundRequest[] = data?.allRefundRequests ?? [];

  const handleApprove = (refundRequestId: string) => {
    processRefund({ variables: { refundRequestId, approved: true } });
  };

  const handleReject = (refundRequestId: string) => {
    processRefund({ variables: { refundRequestId, approved: false } });
  };

  const handleDirectRefund = () => {
    if (!directBookingId || !directAmount || !directReason) return;
    issueRefund({
      variables: {
        bookingId: directBookingId,
        amount: Math.round(parseFloat(directAmount) * 100),
        reason: directReason,
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rambursari</h1>
            <p className="text-gray-500 mt-1">
              Gestioneaza cererile de rambursare de pe platforma.
            </p>
          </div>
          <Button onClick={() => setDirectModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Rambursare directa
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Refunds List */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <RotateCcw className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">
            {tabs.find((t) => t.key === activeTab)?.label ?? 'Rambursari'}
          </h3>
          {refunds.length > 0 && (
            <Badge variant="info">{refunds.length}</Badge>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Se incarca rambursarile..." />
        ) : refunds.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            Nu exista rambursari {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Cod Rezervare</th>
                  <th className="pb-3 font-medium">Utilizator</th>
                  <th className="pb-3 font-medium text-right">Suma</th>
                  <th className="pb-3 font-medium">Motiv</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                  {activeTab === 'REQUESTED' && (
                    <th className="pb-3 font-medium text-right">Actiuni</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-gray-600">
                      {new Date(refund.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="py-3 font-medium text-gray-900">
                      {refund.booking?.referenceCode ?? '-'}
                    </td>
                    <td className="py-3 text-gray-600">
                      {refund.requestedBy?.fullName ?? '-'}
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {formatRON(refund.amount)}
                    </td>
                    <td className="py-3 text-gray-600 max-w-[200px] truncate">
                      {refund.reason}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant={refundStatusVariant[refund.status] ?? 'default'}>
                        {refundStatusLabel[refund.status] ?? refund.status}
                      </Badge>
                    </td>
                    {activeTab === 'REQUESTED' && (
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApprove(refund.id)}
                            disabled={processing}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Aproba
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(refund.id)}
                            disabled={processing}
                          >
                            <X className="h-3.5 w-3.5" />
                            Respinge
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Direct Refund Modal */}
      <Modal
        open={directModalOpen}
        onClose={() => setDirectModalOpen(false)}
        title="Rambursare directa"
      >
        <div className="space-y-4">
          <Input
            label="ID Rezervare"
            value={directBookingId}
            onChange={(e) => setDirectBookingId(e.target.value)}
            placeholder="ex. uuid-rezervare"
          />
          <Input
            label="Suma (lei)"
            type="number"
            step="0.01"
            min="0"
            value={directAmount}
            onChange={(e) => setDirectAmount(e.target.value)}
            placeholder="ex. 150.00"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motiv
            </label>
            <textarea
              value={directReason}
              onChange={(e) => setDirectReason(e.target.value)}
              rows={3}
              placeholder="Descrie motivul rambursarii..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDirectModalOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleDirectRefund}
              loading={issuing}
              disabled={!directBookingId || !directAmount || !directReason}
            >
              Emite rambursare
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
