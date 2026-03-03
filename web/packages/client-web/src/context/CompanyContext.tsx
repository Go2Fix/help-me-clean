import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useQuery } from '@apollo/client';
import { MY_COMPANY } from '@/graphql/operations';
import { useAuth } from '@/context/AuthContext';

interface Company {
  id: string;
  companyName: string;
  cui: string;
  companyType: string;
  legalRepresentative: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  county: string;
  description?: string;
  logoUrl?: string;
  status: string;
  rejectionReason?: string;
  ratingAvg: number;
  totalJobsCompleted: number;
  createdAt: string;
  documents?: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    uploadedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>;
}

interface CompanyContextValue {
  company: Company | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data, loading, error, refetch } = useQuery(MY_COMPANY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  return (
    <CompanyContext.Provider
      value={{
        company: data?.myCompany ?? null,
        loading: isAuthenticated && (loading || !data),
        error: !!error,
        refetch,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
