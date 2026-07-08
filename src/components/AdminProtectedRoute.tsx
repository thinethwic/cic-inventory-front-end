import * as React from "react";
import { useUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

function AdminRouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Checking access
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please wait while we verify your admin permissions.
          </p>
        </div>

        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function AdminProtectedRoute({ children }: Props) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return <AdminRouteLoader />;
  }

  const rawRole = user?.publicMetadata?.role;

  // Handle both string and array (e.g. ["admin"])
  const role = (Array.isArray(rawRole) ? rawRole[0] : (rawRole ?? ""))
    .toString()
    .trim()
    .toLowerCase();

  const allowedRoles = ["admin", "admin_user", "user"];

  if (!user || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
