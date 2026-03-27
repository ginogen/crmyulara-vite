import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { InactivityHandler } from '@/components/InactivityHandler';

// Páginas públicas (carga inmediata — pequeñas)
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Páginas con carga diferida
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })));
const LeadsPage = lazy(() => import('@/pages/leads/index').then(m => ({ default: m.LeadsPage })));
const BudgetsPage = lazy(() => import('@/pages/budgets/BudgetsPage').then(m => ({ default: m.BudgetsPage })));
const BudgetTemplatesPage = lazy(() => import('@/pages/budgets/BudgetTemplatesPage').then(m => ({ default: m.BudgetTemplatesPage })));
const PublicBudgetPage = lazy(() => import('@/pages/budgets/PublicBudgetPage').then(m => ({ default: m.PublicBudgetPage })));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const OrganizationsPage = lazy(() => import('@/pages/admin/OrganizationsPage').then(m => ({ default: m.OrganizationsPage })));
const BranchesPage = lazy(() => import('@/pages/admin/BranchesPage').then(m => ({ default: m.BranchesPage })));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ProfilePage = lazy(() => import('@/pages/admin/ProfilePage').then(m => ({ default: m.ProfilePage })));
const RulesPage = lazy(() => import('@/pages/rules').then(m => ({ default: m.RulesPage })));
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage'));
const WhatsAppNumbersPage = lazy(() => import('@/pages/inbox/WhatsAppNumbersPage'));

// Componentes de error
import { NotFoundPage } from '@/pages/error/NotFoundPage';
import { LoadingPage } from '@/pages/error/LoadingPage';

function ProtectedRoute({ children, fullHeight }: { children: React.ReactNode; fullHeight?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/auth/login" />;
  }

  return (
    <MainLayout fullHeight={fullHeight}>
      <Suspense fallback={<LoadingPage />}>
        {children}
      </Suspense>
    </MainLayout>
  );
}

const App = () => {
  return (
    <>
      <InactivityHandler />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/budgets/public/:slug"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PublicBudgetPage />
            </Suspense>
          }
        />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leads"
          element={
            <ProtectedRoute>
              <LeadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute>
              <RulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <BudgetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/templates"
          element={
            <ProtectedRoute>
              <BudgetTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branches"
          element={
            <ProtectedRoute>
              <BranchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute fullHeight>
              <InboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox/numbers"
          element={
            <ProtectedRoute>
              <WhatsAppNumbersPage />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Ruta 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

export default App;
