import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./Pages/LoginPage";
import SignUpPage from "./Pages/SignUpPage";

import DashboardLayout from "./components/DashboardLayout";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminOnlyRoute from "./components/AdminOnlyRoute"; // ← ADD

import Dashboard from "./Pages/DashboardPage";
import Assets from "./Pages/Assets";
import EmployeesPage from "./Pages/Employees";
import MaintenancePage from "./Pages/Maintenance";
import ReportsPage from "./Pages/Reports";
import AssetTransfer from "./Pages/AssetTransfer";
import UnderConstructionPage from "./Pages/components/UnderConstructionPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected Layout — all logged-in roles */}
      <Route
        path="/"
        element={
          <AdminProtectedRoute>
            <DashboardLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="settings" element={<UnderConstructionPage />} />

        {/* Admin-only routes */}
        <Route
          path="employees"
          element={
            <AdminOnlyRoute>
              <EmployeesPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="reports"
          element={
            <AdminOnlyRoute>
              <ReportsPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="assetTransfer"
          element={
            <AdminOnlyRoute>
              <AssetTransfer />
            </AdminOnlyRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
