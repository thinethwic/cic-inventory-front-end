import * as React from "react";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
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

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut",
            }}
            style={{ width: "45%" }}
          />
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
