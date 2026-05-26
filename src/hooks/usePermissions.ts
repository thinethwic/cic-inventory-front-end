// src/hooks/usePermissions.ts
import { useUser } from "@/lib/auth";

export function usePermissions() {
    const { user } = useUser();

    const meta = (user?.publicMetadata ?? {}) as {
        role?: string;
        roles?: string[];
        location?: string;
        departmentName?: string;
    };

    const role = meta.role ?? "";
    const roles = meta.roles ?? [];
    const location = meta.location ?? "";
    const department = meta.departmentName ?? "";

    const isAdmin =
        roles.some((r) => r.toLowerCase() === "admin") ||
        role.toLowerCase() === "admin" ||
        role.toLowerCase() === "admin_user";

    return { role, roles, isAdmin, location, department };
}
