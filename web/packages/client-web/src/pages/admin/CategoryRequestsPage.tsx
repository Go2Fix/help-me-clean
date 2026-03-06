import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Tag, Building2, ChevronRight } from 'lucide-react';
import {
  PENDING_CATEGORY_REQUESTS,
  REVIEW_CATEGORY_REQUEST,
} from '@/graphql/operations';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CategoryRequest {
  id: string;
  requestType: 'ACTIVATE' | 'DEACTIVATE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
  company: { id: string; companyName: string };
  category: { id: string; nameRo: string; nameEn: string; icon?: string };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CategoryRequestsPage() {
  const { i18n } = useTranslation();
  const [rejectModal, setRejectModal] = useState<{ requestId: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data, loading, refetch } = useQuery<{ pendingCategoryRequests: CategoryRequest[] }>(
    PENDING_CATEGORY_REQUESTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [reviewRequest, { loading: reviewing }] = useMutation(REVIEW_CATEGORY_REQUEST, {
    onCompleted: () => { void refetch(); },
  });

  const handleApprove = async (requestId: string) => {
    await reviewRequest({ variables: { requestId, action: 'APPROVE' } });
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await reviewRequest({
      variables: { requestId: rejectModal.requestId, action: 'REJECT', note: rejectNote },
    });
    setRejectModal(null);
    setRejectNote('');
  };

  const requests = data?.pendingCategoryRequests ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cereri Categorii</h1>
        <p className="text-gray-500 mt-1">Gestionați cererile companiilor pentru categorii de servicii</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Tag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>Nu există cereri în așteptare</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{req.company.companyName}</span>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    {req.category.icon} {i18n.language === 'en' ? req.category.nameEn : req.category.nameRo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.requestType === 'ACTIVATE'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {req.requestType === 'ACTIVATE' ? 'Activare' : 'Dezactivare'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(req.createdAt).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => void handleApprove(req.id)}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Aprobă
                </button>
                <button
                  onClick={() => setRejectModal({ requestId: req.id })}
                  disabled={reviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Respinge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Respinge cererea</h3>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Motivul respingerii (opțional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectNote(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={reviewing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Respinge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
