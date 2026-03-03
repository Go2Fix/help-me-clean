import { useNavigate } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';
import Button from '@/components/ui/Button';

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <SearchX className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Pagina nu a fost găsită
        </h2>
        <p className="text-gray-500 mb-8">
          Ne pare rău, pagina pe care o cauți nu există sau a fost mutată.
        </p>
        <Button size="lg" onClick={() => navigate('/')}>
          <Home className="h-5 w-5" />
          Înapoi la pagina principală
        </Button>
      </div>
    </div>
  );
}
