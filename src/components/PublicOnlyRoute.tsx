import * as React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "@/lib/auth";

export default function PublicOnlyRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Already logged in: skip the login page
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
