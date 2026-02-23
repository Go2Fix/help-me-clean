import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AVAILABLE_SERVICES } from '@/graphql/operations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceDefinition {
  id: string;
  serviceType: string;
  nameRo: string;
  descriptionRo: string;
  basePricePerHour: number;
  minHours: number;
  icon: string;
}

// ─── Icon map ────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  STANDARD_CLEANING: '🏠',
  DEEP_CLEANING: '✨',
  OFFICE_CLEANING: '🏢',
  POST_CONSTRUCTION: '🔨',
  MOVE_IN_OUT_CLEANING: '📦',
  WINDOW_CLEANING: '🪟',
  CARPET_CLEANING: '🧹',
  UPHOLSTERY_CLEANING: '🛋️',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(AVAILABLE_SERVICES, {
    fetchPolicy: 'cache-first',
  });

  const services: ServiceDefinition[] = data?.availableServices ?? [];

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Serviciile noastre
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Oferim o gama completa de servicii de curatenie profesionala.
            Alege serviciul potrivit pentru nevoile tale si rezerva online in
            cateva minute.
          </p>
        </div>

        {/* Loading */}
        {loading && <LoadingSpinner text="Se incarca serviciile..." />}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-danger mb-4">
              Nu am putut incarca serviciile. Te rugam sa incerci din nou.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reincearca
            </Button>
          </div>
        )}

        {/* Services Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="flex flex-col hover:shadow-md transition-shadow group"
              >
                <div className="text-4xl mb-4">
                  {SERVICE_ICONS[service.serviceType] ||
                    service.icon ||
                    '🧹'}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                  {service.nameRo}
                </h2>
                <p className="text-sm text-gray-500 mb-6 flex-1">
                  {service.descriptionRo}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-primary">
                    {service.basePricePerHour} lei
                  </span>
                  <span className="text-sm text-gray-400">/ora</span>
                </div>
                <p className="text-xs text-gray-400 mb-5">
                  Minim {service.minHours}{' '}
                  {service.minHours === 1 ? 'ora' : 'ore'}
                </p>
                <Button
                  onClick={() =>
                    navigate(`/rezervare?service=${service.serviceType}`)
                  }
                  className="w-full"
                >
                  Rezerva
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && services.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              Momentan nu sunt servicii disponibile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
