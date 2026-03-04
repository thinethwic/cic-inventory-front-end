import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

import LoginPage from "./Pages/LoginPage";
import SignUpPage from "./Pages/SignUpPage";

import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./Pages/DashboardPage"; // create simple page
import Assets from "./Pages/Assets";
import EmployeesPage from "./Pages/Employees";
import MaintenancePage from "./Pages/Maintenance";
import ReportsPage from "./Pages/Reports";
import AuditLogsPage from "./Pages/AuditLogs";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <DashboardLayout />
            </SignedIn>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
          </>
        }
      >
        {/* child routes */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
