// src/hooks/usePermissions.ts
import { useUser } from "@clerk/clerk-react";

export function usePermissions() {
    const { user } = useUser();

    const meta = user?.publicMetadata ?? {};

    const role = (meta.role as string) ?? "";
    const roles = (meta.roles as string[]) ?? [];
    const location = (meta.location as string) ?? "";
    const department = (meta.departmentName as string) ?? "";

    const isAdmin =
        roles.some((r) => r.toLowerCase() === "admin") ||
        role.toLowerCase() === "admin" ||
        role.toLowerCase() === "admin_user";

    return { role, roles, isAdmin, location, department };
}