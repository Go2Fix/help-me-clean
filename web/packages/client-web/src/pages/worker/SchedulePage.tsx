import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MY_ASSIGNED_JOBS } from '@/graphql/operations';

interface Job {
  id: string;
  referenceCode: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationHours: number;
  status: string;
  address: { streetAddress: string; city: string } | null;
  client: { fullName: string } | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  ASSIGNED: { label: 'Asignata', variant: 'info' },
  CONFIRMED: { label: 'Confirmata', variant: 'warning' },
  IN_PROGRESS: { label: 'In lucru', variant: 'success' },
  COMPLETED: { label: 'Finalizata', variant: 'default' },
};

export default function SchedulePage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(MY_ASSIGNED_JOBS);
  const jobs: Job[] = data?.myAssignedJobs ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Program</h1>
        <p className="text-gray-500 mt-1">Toate comenzile tale viitoare</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-400">Nu ai comenzi programate.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const badge = STATUS_BADGE[job.status] ?? { label: job.status, variant: 'default' as const };
            return (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/worker/job/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {job.serviceName}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ref: {job.referenceCode}
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {new Date(job.scheduledDate).toLocaleDateString('ro-RO')} &middot; {job.scheduledStartTime} &middot; {job.estimatedDurationHours}h
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {job.address ? `${job.address.streetAddress}, ${job.address.city}` : '--'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4 text-gray-400" />
                    {job.client?.fullName ?? '--'}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
