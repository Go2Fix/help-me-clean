import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { createApolloClient } from '@go2fix/shared';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CompanyProvider } from '@/context/CompanyContext';
import { PlatformProvider, usePlatform } from '@/context/PlatformContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { PageAlternateProvider } from '@/context/PageAlternateContext';
import { ROUTE_MAP } from '@/i18n/routes';
import ErrorBoundary from '@/components/ErrorBoundary';
import PhoneGate from '@/components/PhoneGate';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import BookingLayout from '@/components/layout/BookingLayout';
import ClientLayout from '@/components/layout/ClientLayout';
import CompanyLayout from '@/components/layout/CompanyLayout';
import WorkerLayout from '@/components/layout/WorkerLayout';
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
import GdprPage from '@/pages/GdprPage';
import BlogListPage from '@/pages/blog/BlogListPage';
import BlogPostPage from '@/pages/blog/BlogPostPage';
import CategoryLandingPage from '@/pages/CategoryLandingPage';

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
import ClientSubscriptionsPage from '@/pages/client/SubscriptionsPage';
import SubscriptionDetailPage from '@/pages/client/SubscriptionDetailPage';
import SupportPage from '@/pages/client/SupportPage';

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
import CompanySubscriptionsPage from '@/pages/company/SubscriptionsPage';
import CompanySubscriptionDetailPage from '@/pages/company/SubscriptionDetailPage';
import CompanyReviewsPage from '@/pages/company/ReviewsPage';

// Worker pages
import AcceptInvitePage from '@/pages/worker/AcceptInvitePage';
import WorkerDashboardPage from '@/pages/worker/DashboardPage';
import WorkerOrdersPage from '@/pages/worker/OrdersPage';
import WorkerSchedulePage from '@/pages/worker/SchedulePage';
import WorkerJobDetailPage from '@/pages/worker/JobDetailPage';
import WorkerSettingsPage from '@/pages/worker/SettingsPage';
import PersonalityTestPage from '@/pages/worker/PersonalityTestPage';
import WorkerDocumentUploadPage from '@/pages/worker/DocumentUploadPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import CompaniesPage from '@/pages/admin/CompaniesPage';
import CompanyDetailPage from '@/pages/admin/CompanyDetailPage';
import AdminBookingsPage from '@/pages/admin/BookingsPage';
import AdminBookingDetailPage from '@/pages/admin/BookingDetailPage';
import UsersPage from '@/pages/admin/UsersPage';
import UserDetailPage from '@/pages/admin/UserDetailPage';
import AdminSettingsPage from '@/pages/admin/SettingsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import ReviewsPage from '@/pages/admin/ReviewsPage';
import AdminPaymentsPage from '@/pages/admin/PaymentsPage';
import AdminInvoicesPage from '@/pages/admin/AdminInvoicesPage';
import AdminSubscriptionsPage from '@/pages/admin/SubscriptionsPage';
import AdminSubscriptionDetailPage from '@/pages/admin/AdminSubscriptionDetailPage';
import AdminPayoutsPage from '@/pages/admin/AdminPayoutsPage';
import AdminRefundsPage from '@/pages/admin/RefundsPage';

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
  WORKER: '/worker',
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
        <Route path="/servicii/:categorySlug" element={<CategoryLandingPage />} />
        <Route path="/claim-firma/:token" element={<ClaimCompanyPage />} />
        <Route path="/lista-asteptare" element={<WaitlistPage />} />
        <Route path="/despre-noi" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pentru-firme" element={<ForCompaniesPage />} />
        <Route path="/termeni" element={<TermsPage />} />
        <Route path="/confidentialitate" element={<PrivacyPage />} />
        <Route path="/gdpr" element={<GdprPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Route>

      {/* ── English public routes (/en/ prefix) ── */}
      <Route path="/en" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services/:categorySlug" element={<CategoryLandingPage />} />
        <Route path="about-us" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="for-companies" element={<ForCompaniesPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="gdpr" element={<GdprPage />} />
        <Route path="blog" element={<BlogListPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
      </Route>

      {/* Client routes - Sidebar layout, auth + CLIENT role */}
      <Route
        path="/cont"
        element={
          <ProtectedRoute>
            <RoleRoute role="CLIENT">
              <PhoneGate>
                <ClientLayout />
              </PhoneGate>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboardPage />} />
        <Route path="comenzi" element={<MyBookingsPage />} />
        <Route path="comenzi/:id" element={<ClientBookingDetailPage />} />
        <Route path="recurente/:id" element={<RecurringGroupDetailPage />} />
        <Route path="abonamente" element={<ClientSubscriptionsPage />} />
        <Route path="abonamente/:id" element={<SubscriptionDetailPage />} />
        <Route path="mesaje" element={<ChatPage />} />
        <Route path="adrese" element={<AddressesPage />} />
        <Route path="plati" element={<PaymentMethodsPage />} />
        <Route path="plati/istoric" element={<PaymentHistoryPage />} />
        <Route path="facturi" element={<ClientInvoicesPage />} />
        <Route path="setari" element={<ProfilePage />} />
        <Route path="ajutor" element={<SupportPage />} />
      </Route>

      {/* Company routes - Sidebar layout, auth + COMPANY_ADMIN role */}
      <Route
        path="/firma"
        element={
          <ProtectedRoute>
            <RoleRoute role="COMPANY_ADMIN">
              <PhoneGate>
                <CompanyProvider>
                  <CompanyLayout />
                </CompanyProvider>
              </PhoneGate>
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
        <Route path="echipa" element={<TeamPage />} />
        <Route path="echipa/:id" element={<WorkerDetailPage />} />
        <Route path="recenzii" element={<CompanyReviewsPage />} />
        <Route path="plati" element={<CompanyPayoutsPage />} />
        <Route path="abonamente" element={<CompanySubscriptionsPage />} />
        <Route path="abonamente/:id" element={<CompanySubscriptionDetailPage />} />
        <Route path="facturi" element={<CompanyInvoicesPage />} />
        <Route path="setari" element={<CompanySettingsPage />} />
      </Route>

      {/* Worker routes - Sidebar layout, auth + WORKER role */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute>
            <RoleRoute role="WORKER">
              <PhoneGate>
                <WorkerLayout />
              </PhoneGate>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<WorkerDashboardPage />} />
        <Route path="test-personalitate" element={<PersonalityTestPage />} />
        <Route path="documente-obligatorii" element={<WorkerDocumentUploadPage />} />
        <Route path="comenzi" element={<WorkerOrdersPage />} />
        <Route path="comenzi/:id" element={<WorkerJobDetailPage />} />
        <Route path="program" element={<WorkerSchedulePage />} />
        <Route path="mesaje" element={<ChatPage />} />
        <Route path="profil" element={<WorkerSettingsPage />} />
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
        <Route path="abonamente" element={<AdminSubscriptionsPage />} />
        <Route path="abonamente/:id" element={<AdminSubscriptionDetailPage />} />
        <Route path="utilizatori" element={<UsersPage />} />
        <Route path="utilizatori/:id" element={<UserDetailPage />} />
        <Route path="plati" element={<AdminPaymentsPage />} />
        <Route path="viramente" element={<AdminPayoutsPage />} />
        <Route path="rambursari" element={<AdminRefundsPage />} />
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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('pendingReferralCode', ref.toUpperCase());
    }
  }, []);

  return (
    <ApolloProvider client={client}>
      <PlatformProvider>
        <AuthProvider>
          <PageAlternateProvider>
            <LanguageProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </LanguageProvider>
          </PageAlternateProvider>
        </AuthProvider>
      </PlatformProvider>
    </ApolloProvider>
  );
}

export default App;
