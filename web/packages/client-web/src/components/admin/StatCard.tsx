import Card from '@/components/ui/Card';

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}

export default function StatCard({ icon: Icon, label, value, color, onClick }: StatCardProps) {
  const colors = colorMap[color] ?? colorMap.primary;

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : undefined}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.text}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}
