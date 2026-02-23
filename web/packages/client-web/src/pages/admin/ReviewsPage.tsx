import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatDate } from '@/utils/format';
import { ALL_REVIEWS, DELETE_REVIEW } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const reviewTypeBadge: Record<string, { label: string; variant: 'default' | 'info' }> = {
  CLIENT_REVIEW: { label: 'Client', variant: 'info' },
  COMPANY_REVIEW: { label: 'Companie', variant: 'default' },
};

const ratingOptions = [
  { value: '', label: 'Toate' },
  { value: '1', label: '1 stea' },
  { value: '2', label: '2 stele' },
  { value: '3', label: '3 stele' },
  { value: '4', label: '4 stele' },
  { value: '5', label: '5 stele' },
];

const typeOptions = [
  { value: '', label: 'Toate tipurile' },
  { value: 'CLIENT_REVIEW', label: 'Client' },
  { value: 'COMPANY_REVIEW', label: 'Companie' },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewType: string;
  createdAt: string;
  booking: { id: string; referenceCode: string } | null;
  reviewer: { id: string; fullName: string } | null;
}

// ─── Stars Component ────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-accent text-accent" />
      <span className="text-sm font-medium text-gray-900">{rating}</span>
    </div>
  );
}

function StarRatingFull({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? 'h-4 w-4 fill-accent text-accent'
              : 'h-4 w-4 text-gray-300'
          }
        />
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; reviewId: string }>({
    open: false,
    reviewId: '',
  });
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  const variables = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    rating: ratingFilter ? parseInt(ratingFilter, 10) : undefined,
    reviewType: typeFilter || undefined,
  };

  const { data, loading } = useQuery(ALL_REVIEWS, { variables });

  const [deleteReview, { loading: deleting }] = useMutation(DELETE_REVIEW, {
    refetchQueries: [{ query: ALL_REVIEWS, variables }],
  });

  const reviews: Review[] = data?.allReviews?.reviews ?? [];
  const totalCount: number = data?.allReviews?.totalCount ?? 0;

  const handleDelete = async () => {
    if (!deleteModal.reviewId) return;
    await deleteReview({ variables: { id: deleteModal.reviewId } });
    setDeleteModal({ open: false, reviewId: '' });
  };

  const handleFilterChange = (
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value);
    setPage(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recenzii</h1>
            <p className="text-gray-500 mt-1">Moderare recenzii ale platformei.</p>
          </div>
          {totalCount > 0 && (
            <Badge variant="info">{totalCount} recenzii</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <Card padding={false}>
        {/* Inline filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-3 border-b border-gray-200">
          <div className="w-full sm:w-40">
            <Select
              options={ratingOptions}
              value={ratingFilter}
              onChange={(e) => handleFilterChange(setRatingFilter, e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu exista recenzii.</h3>
            <p className="text-gray-500">Recenziile vor aparea aici dupa ce clientii evalueaza serviciile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Rating
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Cod Rezervare
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Tip
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    Recenzor
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    Data
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Actiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const typeBadge = reviewTypeBadge[review.reviewType] ?? {
                    label: review.reviewType,
                    variant: 'default' as const,
                  };

                  return (
                    <tr
                      key={review.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDetailReview(review)}
                    >
                      {/* Rating */}
                      <td className="px-4 sm:px-6 py-4">
                        <StarRating rating={review.rating} />
                      </td>

                      {/* Cod Rezervare */}
                      <td className="px-4 sm:px-6 py-4">
                        {review.booking ? (
                          <span className="text-sm font-medium text-primary">
                            {review.booking.referenceCode}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Tip */}
                      <td className="px-4 sm:px-6 py-4">
                        <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      </td>

                      {/* Recenzor (hidden on mobile) */}
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-900">
                          {review.reviewer?.fullName ?? '-'}
                        </span>
                      </td>

                      {/* Data (hidden on mobile) */}
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </td>

                      {/* Actiuni */}
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ open: true, reviewId: review.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && (
        <AdminPagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          noun="recenzii"
        />
      )}

      {/* Review Detail Modal */}
      <Modal
        open={!!detailReview}
        onClose={() => setDetailReview(null)}
        title="Detalii recenzie"
      >
        {detailReview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StarRatingFull rating={detailReview.rating} />
              <Badge variant={(reviewTypeBadge[detailReview.reviewType] ?? { variant: 'default' as const }).variant}>
                {(reviewTypeBadge[detailReview.reviewType] ?? { label: detailReview.reviewType }).label}
              </Badge>
            </div>

            {detailReview.comment && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Comentariu</p>
                <p className="text-sm text-gray-900">{detailReview.comment}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Recenzor</p>
                <p className="text-sm text-gray-900">{detailReview.reviewer?.fullName ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Data</p>
                <p className="text-sm text-gray-900">{formatDate(detailReview.createdAt)}</p>
              </div>
            </div>

            {detailReview.booking && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Cod Rezervare</p>
                <button
                  onClick={() => {
                    setDetailReview(null);
                    navigate(`/admin/comenzi/${detailReview.booking!.id}`);
                  }}
                  className="text-sm text-primary hover:underline font-medium cursor-pointer"
                >
                  {detailReview.booking.referenceCode}
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setDetailReview(null)}>Inchide</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteModal({ open: true, reviewId: detailReview.id });
                  setDetailReview(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Sterge
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, reviewId: '' })}
        title="Sterge recenzie"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Esti sigur ca vrei sa stergi aceasta recenzie?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, reviewId: '' })}
            >
              Anuleaza
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              Sterge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
