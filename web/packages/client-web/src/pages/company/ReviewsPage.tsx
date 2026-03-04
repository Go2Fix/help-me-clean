import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, MessageSquare, BarChart3, Trophy, Clock, Sparkles, Scale } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import AdminPagination from '@/components/admin/AdminPagination';
import { formatDate } from '@/utils/format';
import { COMPANY_WORKER_REVIEWS } from '@/graphql/operations';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

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
  createdAt: string;
  booking: { id: string; referenceCode: string } | null;
  reviewer: { id: string; fullName: string } | null;
  worker: { id: string; fullName: string } | null;
}

// ─── Stars Components ───────────────────────────────────────────────────────

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

export default function CompanyReviewsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'company']);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState('');
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  const ratingOptions = [
    { value: '', label: t('company:reviews.filter.all') },
    { value: '1', label: t('company:reviews.filter.star1') },
    { value: '2', label: t('company:reviews.filter.star2') },
    { value: '3', label: t('company:reviews.filter.star3') },
    { value: '4', label: t('company:reviews.filter.star4') },
    { value: '5', label: t('company:reviews.filter.star5') },
  ];

  const variables = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    rating: ratingFilter ? parseInt(ratingFilter, 10) : undefined,
  };

  const { data, loading } = useQuery(COMPANY_WORKER_REVIEWS, { variables });

  const reviews: Review[] = data?.companyWorkerReviews?.reviews ?? [];
  const totalCount: number = data?.companyWorkerReviews?.totalCount ?? 0;

  // Compute KPIs from current page data (when no filter, page 0 gives a good sample)
  // For accurate totals we use totalCount from backend
  const kpis = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, fiveStarCount: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / reviews.length;
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    return { avg: Math.round(avg * 10) / 10, fiveStarCount };
  }, [reviews]);

  const handleFilterChange = (value: string) => {
    setRatingFilter(value);
    setPage(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('company:reviews.title')}</h1>
            <p className="text-gray-500 mt-1">{t('company:reviews.subtitle')}</p>
          </div>
          {totalCount > 0 && (
            <Badge variant="info">{t('company:reviews.count', { count: totalCount })}</Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {!loading && totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('company:reviews.kpi.total')}</p>
                <p className="text-xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('company:reviews.kpi.avgRating')}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-gray-900">{kpis.avg}</p>
                  <Star className="h-4 w-4 fill-accent text-accent" />
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Trophy className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('company:reviews.kpi.fiveStar')}</p>
                <p className="text-xl font-bold text-gray-900">{kpis.fiveStarCount}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card padding={false}>
        {/* Inline filter */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-3 border-b border-gray-200">
          <div className="w-full sm:w-40">
            <Select
              options={ratingOptions}
              value={ratingFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('company:reviews.empty')}</h3>
            <p className="text-gray-500">{t('company:reviews.emptyDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('company:reviews.colRating')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('company:reviews.colWorker')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    {t('company:reviews.colBooking')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    {t('company:reviews.colReviewer')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    {t('company:reviews.colDate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setDetailReview(review)}
                  >
                    {/* Rating */}
                    <td className="px-4 sm:px-6 py-4">
                      <StarRating rating={review.rating} />
                    </td>

                    {/* Lucrator */}
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {review.worker?.fullName ?? '-'}
                      </span>
                    </td>

                    {/* Cod Rezervare */}
                    <td className="px-4 sm:px-6 py-4">
                      {review.booking ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/firma/comenzi/${review.booking!.id}`);
                          }}
                          className="text-sm font-medium text-primary hover:underline cursor-pointer"
                        >
                          {review.booking.referenceCode}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                  </tr>
                ))}
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
          noun={t('company:reviews.title').toLowerCase()}
        />
      )}

      {/* Review Detail Modal */}
      <Modal
        open={!!detailReview}
        onClose={() => setDetailReview(null)}
        title={t('company:reviews.modal.title')}
      >
        {detailReview && (
          <div className="space-y-4">
            <StarRatingFull rating={detailReview.rating} />

            {(detailReview.ratingPunctuality || detailReview.ratingQuality || detailReview.ratingCommunication || detailReview.ratingValue) && (
              <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                {[
                  { label: t('company:reviews.modal.punctuality'), icon: Clock, value: detailReview.ratingPunctuality },
                  { label: t('company:reviews.modal.quality'), icon: Sparkles, value: detailReview.ratingQuality },
                  { label: t('company:reviews.modal.communication'), icon: MessageSquare, value: detailReview.ratingCommunication },
                  { label: t('company:reviews.modal.value'), icon: Scale, value: detailReview.ratingValue },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <r.icon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600">{r.label}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={s <= (r.value ?? 0) ? 'h-3.5 w-3.5 fill-accent text-accent' : 'h-3.5 w-3.5 text-gray-300'} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailReview.comment && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('company:reviews.modal.comment')}</p>
                <p className="text-sm text-gray-900">{detailReview.comment}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('company:reviews.modal.reviewer')}</p>
                <p className="text-sm text-gray-900">{detailReview.reviewer?.fullName ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('company:reviews.modal.worker')}</p>
                <p className="text-sm text-gray-900">{detailReview.worker?.fullName ?? '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('company:reviews.modal.date')}</p>
                <p className="text-sm text-gray-900">{formatDate(detailReview.createdAt)}</p>
              </div>
              {detailReview.booking && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{t('company:reviews.modal.bookingCode')}</p>
                  <button
                    onClick={() => {
                      setDetailReview(null);
                      navigate(`/firma/comenzi/${detailReview.booking!.id}`);
                    }}
                    className="text-sm text-primary hover:underline font-medium cursor-pointer"
                  >
                    {detailReview.booking.referenceCode}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setDetailReview(null)}>{t('company:reviews.modal.close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
