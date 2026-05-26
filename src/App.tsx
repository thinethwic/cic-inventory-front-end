import { Suspense, lazy, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "./components/DashboardLayout";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminOnlyRoute from "./components/AdminOnlyRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import { usePageTitle } from "./hooks/usePageTitle";

const LoginPage = lazy(() => import("./Pages/LoginPage"));
const Dashboard = lazy(() => import("./Pages/DashboardPage"));
const Assets = lazy(() => import("./Pages/Assets"));
const EmployeesPage = lazy(() => import("./Pages/Employees"));
const UsersPage = lazy(() => import("./Pages/UsersPage"));
const MaintenancePage = lazy(() => import("./Pages/Maintenance"));
const ReportsPage = lazy(() => import("./Pages/Reports"));
const AssetTransfer = lazy(() => import("./Pages/AssetTransfer"));
const UnderConstructionPage = lazy(
  () => import("./Pages/components/UnderConstructionPage"),
);

function PageLoader() {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  usePageTitle();
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <LazyPage>
            <LoginPage />
          </LazyPage>
        }
      />
      {/* Protected Layout: all logged-in roles */}
      <Route
        path="/"
        element={
          <AdminProtectedRoute>
            <DashboardLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <LazyPage>
              <Dashboard />
            </LazyPage>
          }
        />
        <Route
          path="assets"
          element={
            <LazyPage>
              <Assets />
            </LazyPage>
          }
        />
        <Route
          path="maintenance"
          element={
            <LazyPage>
              <MaintenancePage />
            </LazyPage>
          }
        />
        <Route
          path="settings"
          element={
            <LazyPage>
              <UnderConstructionPage />
            </LazyPage>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="employees"
          element={
            <AdminOnlyRoute>
              <LazyPage>
                <EmployeesPage />
              </LazyPage>
            </AdminOnlyRoute>
          }
        />
        <Route
          path="users"
          element={
            <SuperAdminRoute>
              <LazyPage>
                <UsersPage />
              </LazyPage>
            </SuperAdminRoute>
          }
        />
        <Route
          path="reports"
          element={
            <AdminOnlyRoute>
              <LazyPage>
                <ReportsPage />
              </LazyPage>
            </AdminOnlyRoute>
          }
        />
        <Route
          path="assetTransfer"
          element={
            <AdminOnlyRoute>
              <LazyPage>
                <AssetTransfer />
              </LazyPage>
            </AdminOnlyRoute>
          }
        />
      </Route>

      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
