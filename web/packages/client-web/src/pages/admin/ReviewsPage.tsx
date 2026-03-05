import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Trash2, MessageSquare, Clock, Sparkles, MessageCircle, Scale, CheckCircle, XCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatDate } from '@/utils/format';
import { ALL_REVIEWS, DELETE_REVIEW, APPROVE_REVIEW, REJECT_REVIEW } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const reviewTypeVariant: Record<string, 'default' | 'info'> = {
  CLIENT_REVIEW: 'info',
  COMPANY_REVIEW: 'default',
};

const statusBadgeClass: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-800',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReviewPhoto {
  id: string;
  photoUrl: string;
  sortOrder: number;
}

interface Review {
  id: string;
  rating: number;
  ratingPunctuality: number | null;
  ratingQuality: number | null;
  ratingCommunication: number | null;
  ratingValue: number | null;
  comment: string | null;
  reviewType: string;
  status: string;
  photos: ReviewPhoto[];
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

function CategoryRatingRow({ label, icon: Icon, value }: { label: string; icon: typeof Star; value: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`h-3.5 w-3.5 ${s <= value ? 'fill-accent text-accent' : 'text-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const className = statusBadgeClass[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'admin']);

  const ratingOptions = [
    { value: '', label: t('admin:reviews.allRatings') },
    { value: '1', label: t('admin:reviews.star', { count: 1 }) },
    { value: '2', label: t('admin:reviews.stars', { count: 2 }) },
    { value: '3', label: t('admin:reviews.stars', { count: 3 }) },
    { value: '4', label: t('admin:reviews.stars', { count: 4 }) },
    { value: '5', label: t('admin:reviews.stars', { count: 5 }) },
  ];

  const typeOptions = [
    { value: '', label: t('admin:reviews.allTypes') },
    { value: 'CLIENT_REVIEW', label: t('admin:reviews.typeLabels.CLIENT_REVIEW') },
    { value: 'COMPANY_REVIEW', label: t('admin:reviews.typeLabels.COMPANY_REVIEW') },
  ];

  const statusOptions = [
    { value: '', label: t('admin:reviews.allStatuses') },
    { value: 'PUBLISHED', label: t('admin:reviews.statusLabels.PUBLISHED') },
    { value: 'PENDING', label: t('admin:reviews.statusLabels.PENDING') },
    { value: 'REJECTED', label: t('admin:reviews.statusLabels.REJECTED') },
  ];

  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [_statusFilter, setStatusFilter] = useState('');
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

  const [approveReview, { loading: approving }] = useMutation(APPROVE_REVIEW, {
    refetchQueries: [{ query: ALL_REVIEWS, variables }],
  });

  const [rejectReview, { loading: rejecting }] = useMutation(REJECT_REVIEW, {
    refetchQueries: [{ query: ALL_REVIEWS, variables }],
  });

  const allReviews: Review[] = data?.allReviews?.reviews ?? [];
  // Client-side status filter (backend doesn't support it yet)
  const reviews = _statusFilter
    ? allReviews.filter((r) => r.status === _statusFilter)
    : allReviews;
  const totalCount: number = data?.allReviews?.totalCount ?? 0;

  const handleDelete = async () => {
    if (!deleteModal.reviewId) return;
    await deleteReview({ variables: { id: deleteModal.reviewId } });
    setDeleteModal({ open: false, reviewId: '' });
  };

  const handleApprove = async (reviewId: string) => {
    await approveReview({ variables: { id: reviewId } });
    if (detailReview?.id === reviewId) {
      setDetailReview((prev) => prev ? { ...prev, status: 'PUBLISHED' } : null);
    }
  };

  const handleReject = async (reviewId: string) => {
    await rejectReview({ variables: { id: reviewId } });
    if (detailReview?.id === reviewId) {
      setDetailReview((prev) => prev ? { ...prev, status: 'REJECTED' } : null);
    }
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
            <h1 className="text-2xl font-bold text-gray-900">{t('admin:reviews.title')}</h1>
            <p className="text-gray-500 mt-1">{t('admin:reviews.subtitle')}</p>
          </div>
          {totalCount > 0 && (
            <Badge variant="info">{t('admin:reviews.totalCount', { count: totalCount })}</Badge>
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
          <div className="w-full sm:w-44">
            <Select
              options={statusOptions}
              value={_statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin:reviews.empty.title')}</h3>
            <p className="text-gray-500">{t('admin:reviews.empty.description')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('admin:reviews.tableHeaders.rating')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('admin:reviews.tableHeaders.bookingCode')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('admin:reviews.tableHeaders.type')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('admin:reviews.tableHeaders.status')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    {t('admin:reviews.tableHeaders.reviewer')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    {t('admin:reviews.tableHeaders.date')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('admin:reviews.tableHeaders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
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

                      {/* Booking Code */}
                      <td className="px-4 sm:px-6 py-4">
                        {review.booking ? (
                          <span className="text-sm font-medium text-primary">
                            {review.booking.referenceCode}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 sm:px-6 py-4">
                        <Badge variant={reviewTypeVariant[review.reviewType] ?? 'default'}>
                          {t(`admin:reviews.typeLabels.${review.reviewType}`, { defaultValue: review.reviewType })}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 sm:px-6 py-4">
                        <StatusBadge
                          status={review.status}
                          label={t(`admin:reviews.statusLabels.${review.status}`, { defaultValue: review.status })}
                        />
                      </td>

                      {/* Reviewer (hidden on mobile) */}
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-900">
                          {review.reviewer?.fullName ?? '-'}
                        </span>
                      </td>

                      {/* Date (hidden on mobile) */}
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
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
          noun={t('admin:reviews.noun')}
        />
      )}

      {/* Review Detail Modal */}
      <Modal
        open={!!detailReview}
        onClose={() => setDetailReview(null)}
        title={t('admin:reviews.detail.title')}
      >
        {detailReview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StarRatingFull rating={detailReview.rating} />
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={detailReview.status}
                  label={t(`admin:reviews.statusLabels.${detailReview.status}`, { defaultValue: detailReview.status })}
                />
                <Badge variant={reviewTypeVariant[detailReview.reviewType] ?? 'default'}>
                  {t(`admin:reviews.typeLabels.${detailReview.reviewType}`, { defaultValue: detailReview.reviewType })}
                </Badge>
              </div>
            </div>

            {/* Category ratings */}
            {(detailReview.ratingPunctuality || detailReview.ratingQuality || detailReview.ratingCommunication || detailReview.ratingValue) && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-2">{t('admin:reviews.detail.categories')}</p>
                <CategoryRatingRow label={t('admin:reviews.detail.punctuality')} icon={Clock} value={detailReview.ratingPunctuality} />
                <CategoryRatingRow label={t('admin:reviews.detail.quality')} icon={Sparkles} value={detailReview.ratingQuality} />
                <CategoryRatingRow label={t('admin:reviews.detail.communication')} icon={MessageCircle} value={detailReview.ratingCommunication} />
                <CategoryRatingRow label={t('admin:reviews.detail.valueForMoney')} icon={Scale} value={detailReview.ratingValue} />
              </div>
            )}

            {detailReview.comment && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('admin:reviews.detail.comment')}</p>
                <p className="text-sm text-gray-900">{detailReview.comment}</p>
              </div>
            )}

            {/* Photos */}
            {detailReview.photos && detailReview.photos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">{t('admin:reviews.detail.photos')}</p>
                <div className="flex gap-2">
                  {detailReview.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.photoUrl}
                      alt={t('admin:reviews.detail.photoAlt')}
                      className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('admin:reviews.detail.reviewer')}</p>
                <p className="text-sm text-gray-900">{detailReview.reviewer?.fullName ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('admin:reviews.detail.date')}</p>
                <p className="text-sm text-gray-900">{formatDate(detailReview.createdAt)}</p>
              </div>
            </div>

            {detailReview.booking && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('admin:reviews.detail.bookingCode')}</p>
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
              <Button variant="ghost" onClick={() => setDetailReview(null)}>{t('admin:reviews.detail.close')}</Button>
              {detailReview.status !== 'PUBLISHED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={approving}
                  onClick={() => handleApprove(detailReview.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('admin:reviews.detail.publish')}
                </Button>
              )}
              {detailReview.status !== 'REJECTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={rejecting}
                  onClick={() => handleReject(detailReview.id)}
                >
                  <XCircle className="h-4 w-4" />
                  {t('admin:reviews.detail.reject')}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteModal({ open: true, reviewId: detailReview.id });
                  setDetailReview(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('admin:reviews.detail.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, reviewId: '' })}
        title={t('admin:reviews.deleteModal.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('admin:reviews.deleteModal.confirmText')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, reviewId: '' })}
            >
              {t('admin:reviews.deleteModal.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              {t('admin:reviews.deleteModal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
