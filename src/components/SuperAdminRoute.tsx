import * as React from "react";
import { Navigate } from "react-router-dom";

import { useUser } from "@/lib/auth";

export default function SuperAdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) return null;

  const role = (user?.publicMetadata?.role ?? "").toString().trim().toLowerCase();

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
