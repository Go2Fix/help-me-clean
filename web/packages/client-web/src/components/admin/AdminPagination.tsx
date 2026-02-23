import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface AdminPaginationProps {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
}

export default function AdminPagination({
  page,
  totalCount,
  pageSize,
  onPageChange,
  noun = 'rezultate',
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount <= pageSize) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6">
      <p className="text-sm text-gray-500">
        {from}-{to} din {totalCount} {noun}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="text-sm text-gray-700">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Urmator</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
