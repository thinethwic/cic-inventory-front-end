import * as React from "react";
import { useUser } from "@/lib/auth";
import { Navigate } from "react-router-dom";

export default function AdminOnlyRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) return null; // parent AdminProtectedRoute already handles loading UI

  const rawRole = user?.publicMetadata?.role;
  const role = (Array.isArray(rawRole) ? rawRole[0] : (rawRole ?? ""))
    .toString()
    .trim()
    .toLowerCase();

  const adminRoles = ["admin", "admin_user"];

  if (!adminRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
