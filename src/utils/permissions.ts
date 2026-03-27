export type Role = "admin" | "admin_user" | "manager" | "staff" | "user";
export type Department = "it" | "hr" | "sales";

// ================= CORE HELPERS =================

// Check if user has one of allowed roles
export const hasRole = (
    role: string | undefined,
    allowedRoles: Role[]
): boolean => {
    if (!role) return false;
    return allowedRoles.includes(role as Role);
};

// Check if user belongs to allowed departments
export const hasDepartment = (
    department: string | undefined,
    allowedDepartments: Department[]
): boolean => {
    if (!department) return false;
    return allowedDepartments.includes(department as Department);
};

// Combined check (RBAC + Department)
export const canAccess = (
    role: string | undefined,
    department: string | undefined,
    options: {
        roles?: Role[];
        departments?: Department[];
    }
): boolean => {
    const roleMatch =
        !options.roles || hasRole(role, options.roles);

    const deptMatch =
        !options.departments || hasDepartment(department, options.departments);

    return roleMatch && deptMatch;
};