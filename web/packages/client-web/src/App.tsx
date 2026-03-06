import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { identifyUser, resetUser } from '@/lib/analytics';
import { createApolloClient } from '@go2fix/shared';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CompanyProvider } from '@/context/CompanyContext';
import { PlatformProvider, usePlatform } from '@/context/PlatformContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { PageAlternateProvider } from '@/context/PageAlternateContext';
import { ROUTE_MAP } from '@/i18n/routes';
import ErrorBoundary from '@/components/ErrorBoundary';
import PhoneGate from '@/components/PhoneGate';

// Layouts (eager — needed immediately for all routes)
import PublicLayout from '@/components/layout/PublicLayout';
import BookingLayout from '@/components/layout/BookingLayout';
import ClientLayout from '@/components/layout/ClientLayout';
import CompanyLayout from '@/components/layout/CompanyLayout';
import WorkerLayout from '@/components/layout/WorkerLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// ─── Lazy page imports ────────────────────────────────────────────────────────

// Public pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const RegisterCompanyPage = lazy(() => import('@/pages/RegisterCompanyPage'));
const ClaimCompanyPage = lazy(() => import('@/pages/ClaimCompanyPage'));
const WaitlistPage = lazy(() => import('@/pages/WaitlistPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ForCompaniesPage = lazy(() => import('@/pages/ForCompaniesPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const GdprPage = lazy(() => import('@/pages/GdprPage'));
const BlogListPage = lazy(() => import('@/pages/blog/BlogListPage'));
const BlogPostPage = lazy(() => import('@/pages/blog/BlogPostPage'));
const CategoryLandingPage = lazy(() => import('@/pages/CategoryLandingPage'));
const VsHomerunPage = lazy(() => import('@/pages/VsHomerunPage'));
const VsNecesitPage = lazy(() => import('@/pages/VsNecesitPage'));

// Client pages
const ClientDashboardPage = lazy(() => import('@/pages/client/ClientDashboardPage'));
const MyBookingsPage = lazy(() => import('@/pages/client/MyBookingsPage'));
const ClientBookingDetailPage = lazy(() => import('@/pages/client/BookingDetailPage'));
const ChatPage = lazy(() => import('@/pages/client/ChatPage'));
const ProfilePage = lazy(() => import('@/pages/client/ProfilePage'));
const AddressesPage = lazy(() => import('@/pages/client/AddressesPage'));
const PaymentMethodsPage = lazy(() => import('@/pages/client/PaymentMethodsPage'));
const PaymentHistoryPage = lazy(() => import('@/pages/client/PaymentHistoryPage'));
const ClientInvoicesPage = lazy(() => import('@/pages/client/InvoicesPage'));
const RecurringGroupDetailPage = lazy(() => import('@/pages/client/RecurringGroupDetailPage'));
const ClientSubscriptionsPage = lazy(() => import('@/pages/client/SubscriptionsPage'));
const SubscriptionDetailPage = lazy(() => import('@/pages/client/SubscriptionDetailPage'));
const SupportPage = lazy(() => import('@/pages/client/SupportPage'));

// Company pages
const CompanyDashboardPage = lazy(() => import('@/pages/company/DashboardPage'));
const DocumentUploadPage = lazy(() => import('@/pages/company/DocumentUploadPage'));
const CompanyOrdersPage = lazy(() => import('@/pages/company/OrdersPage'));
const CompanyOrderDetailPage = lazy(() => import('@/pages/company/OrderDetailPage'));
const TeamPage = lazy(() => import('@/pages/company/TeamPage'));
const WorkerDetailPage = lazy(() => import('@/pages/company/WorkerDetailPage'));
const CompanySettingsPage = lazy(() => import('@/pages/company/SettingsPage'));
const CompanyMessagesPage = lazy(() => import('@/pages/company/MessagesPage'));
const CompanyCalendarPage = lazy(() => import('@/pages/company/CalendarPage'));
const CompanyPayoutsPage = lazy(() => import('@/pages/company/PayoutsPage'));
const CompanyInvoicesPage = lazy(() => import('@/pages/company/CompanyInvoicesPage'));
const CompanySubscriptionsPage = lazy(() => import('@/pages/company/SubscriptionsPage'));
const CompanySubscriptionDetailPage = lazy(() => import('@/pages/company/SubscriptionDetailPage'));
const CompanyReviewsPage = lazy(() => import('@/pages/company/ReviewsPage'));

// Worker pages
const AcceptInvitePage = lazy(() => import('@/pages/worker/AcceptInvitePage'));
const WorkerDashboardPage = lazy(() => import('@/pages/worker/DashboardPage'));
const WorkerOrdersPage = lazy(() => import('@/pages/worker/OrdersPage'));
const WorkerSchedulePage = lazy(() => import('@/pages/worker/SchedulePage'));
const WorkerJobDetailPage = lazy(() => import('@/pages/worker/JobDetailPage'));
const WorkerSettingsPage = lazy(() => import('@/pages/worker/SettingsPage'));
const PersonalityTestPage = lazy(() => import('@/pages/worker/PersonalityTestPage'));
const WorkerDocumentUploadPage = lazy(() => import('@/pages/worker/DocumentUploadPage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const CompaniesPage = lazy(() => import('@/pages/admin/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('@/pages/admin/CompanyDetailPage'));
const AdminBookingsPage = lazy(() => import('@/pages/admin/BookingsPage'));
const AdminBookingDetailPage = lazy(() => import('@/pages/admin/BookingDetailPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const UserDetailPage = lazy(() => import('@/pages/admin/UserDetailPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const ReviewsPage = lazy(() => import('@/pages/admin/ReviewsPage'));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/PaymentsPage'));
const AdminInvoicesPage = lazy(() => import('@/pages/admin/AdminInvoicesPage'));
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/SubscriptionsPage'));
const AdminSubscriptionDetailPage = lazy(() => import('@/pages/admin/AdminSubscriptionDetailPage'));
const AdminPayoutsPage = lazy(() => import('@/pages/admin/AdminPayoutsPage'));
const AdminRefundsPage = lazy(() => import('@/pages/admin/RefundsPage'));
const PromoCodesPage = lazy(() => import('@/pages/admin/PromoCodesPage'));
const DisputesPage = lazy(() => import('@/pages/admin/DisputesPage'));
const CategoryRequestsPage = lazy(() => import('@/pages/admin/CategoryRequestsPage'));

// ─── Apollo Client ───────────────────────────────────────────────────────────

const httpEndpoint =
  import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8080/query';
const wsEndpoint = httpEndpoint.replace(/^http/, 'ws');

const client = createApolloClient(httpEndpoint, wsEndpoint);

// ─── Page Loader ─────────────────────────────────────────────────────────────

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

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

// ─── Analytics User Sync ─────────────────────────────────────────────────────

function AnalyticsSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      identifyUser(user.id, { email: user.email, role: user.role, name: user.fullName });
    } else {
      resetUser();
    }
  }, [user]);
  return null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="/vs/homerun" element={<VsHomerunPage />} />
          <Route path="/vs/necesit" element={<VsNecesitPage />} />
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
          <Route path="vs/homerun" element={<VsHomerunPage />} />
          <Route path="vs/necesit" element={<VsNecesitPage />} />
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
          <Route path="promo-coduri" element={<PromoCodesPage />} />
          <Route path="dispute" element={<DisputesPage />} />
          <Route path="categorii-cereri" element={<CategoryRequestsPage />} />
          <Route path="setari" element={<AdminSettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
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
          <AnalyticsSync />
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
