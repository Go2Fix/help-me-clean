import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { createApolloClient } from '@go2fix/shared';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CompanyProvider } from '@/context/CompanyContext';
import { PlatformProvider, usePlatform } from '@/context/PlatformContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { PageAlternateProvider } from '@/context/PageAlternateContext';
import { ROUTE_MAP } from '@/i18n/routes';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import BookingLayout from '@/components/layout/BookingLayout';
import ClientLayout from '@/components/layout/ClientLayout';
import CompanyLayout from '@/components/layout/CompanyLayout';
import CleanerLayout from '@/components/layout/CleanerLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Public pages
import HomePage from '@/pages/HomePage';
import BookingPage from '@/pages/BookingPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import RegisterCompanyPage from '@/pages/RegisterCompanyPage';
import ClaimCompanyPage from '@/pages/ClaimCompanyPage';
import WaitlistPage from '@/pages/WaitlistPage';
import AboutPage from '@/pages/AboutPage';
import ForCompaniesPage from '@/pages/ForCompaniesPage';
import ContactPage from '@/pages/ContactPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import BlogListPage from '@/pages/blog/BlogListPage';
import BlogPostPage from '@/pages/blog/BlogPostPage';

// Client pages
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import MyBookingsPage from '@/pages/client/MyBookingsPage';
import ClientBookingDetailPage from '@/pages/client/BookingDetailPage';
import ChatPage from '@/pages/client/ChatPage';
import ProfilePage from '@/pages/client/ProfilePage';
import AddressesPage from '@/pages/client/AddressesPage';
import PaymentMethodsPage from '@/pages/client/PaymentMethodsPage';
import PaymentHistoryPage from '@/pages/client/PaymentHistoryPage';
import ClientInvoicesPage from '@/pages/client/InvoicesPage';
import RecurringGroupDetailPage from '@/pages/client/RecurringGroupDetailPage';

// Company pages
import CompanyDashboardPage from '@/pages/company/DashboardPage';
import DocumentUploadPage from '@/pages/company/DocumentUploadPage';
import CompanyOrdersPage from '@/pages/company/OrdersPage';
import CompanyOrderDetailPage from '@/pages/company/OrderDetailPage';
import TeamPage from '@/pages/company/TeamPage';
import WorkerDetailPage from '@/pages/company/WorkerDetailPage';
import CompanySettingsPage from '@/pages/company/SettingsPage';
import CompanyMessagesPage from '@/pages/company/MessagesPage';
import CompanyCalendarPage from '@/pages/company/CalendarPage';
import CompanyPayoutsPage from '@/pages/company/PayoutsPage';
import CompanyInvoicesPage from '@/pages/company/CompanyInvoicesPage';

// Cleaner pages
import AcceptInvitePage from '@/pages/cleaner/AcceptInvitePage';
import CleanerDashboardPage from '@/pages/cleaner/DashboardPage';
import CleanerOrdersPage from '@/pages/cleaner/OrdersPage';
import CleanerCalendarPage from '@/pages/cleaner/CalendarPage';
import CleanerJobDetailPage from '@/pages/cleaner/JobDetailPage';
import CleanerSettingsPage from '@/pages/cleaner/SettingsPage';
import PersonalityTestPage from '@/pages/cleaner/PersonalityTestPage';
import CleanerDocumentUploadPage from '@/pages/cleaner/DocumentUploadPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import CompaniesPage from '@/pages/admin/CompaniesPage';
import CompanyDetailPage from '@/pages/admin/CompanyDetailPage';
import AdminBookingsPage from '@/pages/admin/BookingsPage';
import AdminBookingDetailPage from '@/pages/admin/BookingDetailPage';
import UsersPage from '@/pages/admin/UsersPage';
import UserDetailPage from '@/pages/admin/UserDetailPage';
import AdminSettingsPage from '@/pages/admin/SettingsPage';
import AdminMessagesPage from '@/pages/admin/MessagesPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import ReviewsPage from '@/pages/admin/ReviewsPage';
import AdminPaymentsPage from '@/pages/admin/PaymentsPage';
import AdminInvoicesPage from '@/pages/admin/AdminInvoicesPage';

// ─── Apollo Client ───────────────────────────────────────────────────────────

const httpEndpoint =
  import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8080/query';
const wsEndpoint = httpEndpoint.replace(/^http/, 'ws');

const client = createApolloClient(httpEndpoint, wsEndpoint);

// ─── Platform Gate ───────────────────────────────────────────────────────────

function BookingGateRoute() {
  const { isPreRelease, loading } = usePlatform();
  const { lang } = useLanguage();
  if (loading) return null;
  if (isPreRelease) return <Navigate to={ROUTE_MAP.waitlist[lang]} replace />;
  return <BookingPage />;
}

// ─── Route Guards ────────────────────────────────────────────────────────────

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/cont',
  COMPANY_ADMIN: '/firma',
  CLEANER: '/worker',
  GLOBAL_ADMIN: '/admin',
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, role }: { children: React.ReactNode; role: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== role) {
    const home = user ? (ROLE_HOME[user.role] || '/') : '/autentificare';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Standalone — no Header/Footer (split-screen layout) */}
      <Route path="/autentificare" element={<LoginPage />} />
      <Route path="/inregistrare-firma" element={<RegisterCompanyPage />} />
      <Route path="/invitare" element={<AcceptInvitePage />} />

      {/* ── Booking flow (Header only, no Footer) ── */}
      <Route element={<BookingLayout />}>
        <Route path="/rezervare" element={<BookingGateRoute />} />
        <Route path="/en/booking" element={<BookingGateRoute />} />
      </Route>

      {/* ── Romanian public routes (no prefix) ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/servicii" element={<Navigate to="/#servicii" replace />} />
        <Route path="/claim-firma/:token" element={<ClaimCompanyPage />} />
        <Route path="/lista-asteptare" element={<WaitlistPage />} />
        <Route path="/despre-noi" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pentru-firme" element={<ForCompaniesPage />} />
        <Route path="/termeni" element={<TermsPage />} />
        <Route path="/confidentialitate" element={<PrivacyPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Route>

      {/* ── English public routes (/en/ prefix) ── */}
      <Route path="/en" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about-us" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="for-companies" element={<ForCompaniesPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="blog" element={<BlogListPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
      </Route>

      {/* Client routes - Sidebar layout, auth + CLIENT role */}
      <Route
        path="/cont"
        element={
          <ProtectedRoute>
            <RoleRoute role="CLIENT">
              <ClientLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboardPage />} />
        <Route path="comenzi" element={<MyBookingsPage />} />
        <Route path="comenzi/:id" element={<ClientBookingDetailPage />} />
        <Route path="recurente/:id" element={<RecurringGroupDetailPage />} />
        <Route path="mesaje" element={<ChatPage />} />
        <Route path="mesaje/:roomId" element={<ChatPage />} />
        <Route path="adrese" element={<AddressesPage />} />
        <Route path="plati" element={<PaymentMethodsPage />} />
        <Route path="plati/istoric" element={<PaymentHistoryPage />} />
        <Route path="facturi" element={<ClientInvoicesPage />} />
        <Route path="setari" element={<ProfilePage />} />
      </Route>

      {/* Company routes - Sidebar layout, auth + COMPANY_ADMIN role */}
      <Route
        path="/firma"
        element={
          <ProtectedRoute>
            <RoleRoute role="COMPANY_ADMIN">
              <CompanyProvider>
                <CompanyLayout />
              </CompanyProvider>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<CompanyDashboardPage />} />
        <Route path="documente-obligatorii" element={<DocumentUploadPage />} />
        <Route path="comenzi" element={<CompanyOrdersPage />} />
        <Route path="comenzi/:id" element={<CompanyOrderDetailPage />} />
        <Route path="program" element={<CompanyCalendarPage />} />
        <Route path="mesaje" element={<CompanyMessagesPage />} />
        <Route path="mesaje/:roomId" element={<CompanyMessagesPage />} />
        <Route path="echipa" element={<TeamPage />} />
        <Route path="echipa/:id" element={<WorkerDetailPage />} />
        <Route path="plati" element={<CompanyPayoutsPage />} />
        <Route path="facturi" element={<CompanyInvoicesPage />} />
        <Route path="setari" element={<CompanySettingsPage />} />
      </Route>

      {/* Cleaner routes - Sidebar layout, auth + CLEANER role */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute>
            <RoleRoute role="CLEANER">
              <CleanerLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<CleanerDashboardPage />} />
        <Route path="test-personalitate" element={<PersonalityTestPage />} />
        <Route path="documente-obligatorii" element={<CleanerDocumentUploadPage />} />
        <Route path="comenzi" element={<CleanerOrdersPage />} />
        <Route path="comenzi/:id" element={<CleanerJobDetailPage />} />
        <Route path="program" element={<CleanerCalendarPage />} />
        <Route path="mesaje" element={<ChatPage />} />
        <Route path="mesaje/:roomId" element={<ChatPage />} />
        <Route path="profil" element={<CleanerSettingsPage />} />
      </Route>

      {/* Admin routes - Sidebar layout, auth + GLOBAL_ADMIN role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute role="GLOBAL_ADMIN">
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="companii" element={<CompaniesPage />} />
        <Route path="companii/:id" element={<CompanyDetailPage />} />
        <Route path="comenzi" element={<AdminBookingsPage />} />
        <Route path="comenzi/:id" element={<AdminBookingDetailPage />} />
        <Route path="mesaje" element={<AdminMessagesPage />} />
        <Route path="mesaje/:roomId" element={<AdminMessagesPage />} />
        <Route path="utilizatori" element={<UsersPage />} />
        <Route path="utilizatori/:id" element={<UserDetailPage />} />
        <Route path="plati" element={<AdminPaymentsPage />} />
        <Route path="facturi" element={<AdminInvoicesPage />} />
        <Route path="rapoarte" element={<ReportsPage />} />
        <Route path="recenzii" element={<ReviewsPage />} />
        <Route path="setari" element={<AdminSettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ApolloProvider client={client}>
      <PlatformProvider>
        <AuthProvider>
          <PageAlternateProvider>
            <LanguageProvider>
              <AppRoutes />
            </LanguageProvider>
          </PageAlternateProvider>
        </AuthProvider>
      </PlatformProvider>
    </ApolloProvider>
  );
}

export default App;
