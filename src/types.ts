// src/types.ts

// ─── Status — mirrors backend AssetStatus enum ────────────────────────────────
// Backend:  AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED
// Frontend: Available | Assigned  | In Repair   | Disposed | Retired
export type AssetStatus = "Available" | "Assigned" | "In Repair" | "Disposed" | "Retired";

export const statusOptions: AssetStatus[] = [
    "Available",
    "Assigned",
    "In Repair",   // → sent to backend as MAINTENANCE
    "Disposed",    // → sent to backend as RETIRED
];

// ─── Category — mirrors backend AssetCategory enum ───────────────────────────
// Backend:  LAPTOP | DESKTOP | MONITOR | PRINTER | ROUTER | SWITCH | OTHER
export type AssetCategory =
    | "Laptop"
    | "Desktop"
    | "Monitor"
    | "Printer"
    | "Router"
    | "Switch"
    | "Other";

export const categoryOptions: AssetCategory[] = [
    "Laptop",
    "Desktop",
    "Monitor",
    "Printer",
    "Router",
    "Switch",
    "Other",
];

// ─── Asset ────────────────────────────────────────────────────────────────────
export interface Asset {
    id: string;
    assetCode: string;
    barcode?: string;
    category: string;
    brand: string;
    model: string;
    serialNo: string;
    status: AssetStatus;

    // display values
    location: string;
    assignedTo?: string;

    // actual IDs for update/transfer
    locationId: string;
    assignedToId?: string;

    purchaseDate?: string;
    warrantyEnd?: string;

    supplierId?: number;
    supplierName?: string;
}

// ─── Form state (all optional fields as empty string for controlled inputs) ───
export type AssetFormState = {
    assetCode: string;
    barcode?: string;
    category: string;
    brand: string;
    model: string;
    serialNo: string;
    status: AssetStatus;
    locationId: string;
    assignedToId?: string;
    purchaseDate?: string;
    warrantyEnd?: string;
    supplierId?: string;
};

export const emptyAssetForm: AssetFormState = {
    assetCode: "",
    barcode: "",
    category: "Laptop",
    brand: "",
    model: "",
    serialNo: "",
    status: "Available",
    locationId: "",
    assignedToId: "",
    purchaseDate: "",
    warrantyEnd: "",
    supplierId: "",
};

// ─── Entity base — backend returns Long (number) for id ───────────────────────
export type EntityBase = {
    id: number;
    createdAt?: string;
};

export type Department = EntityBase & {
    name: string;
    code: string;
};

export type Location = EntityBase & {
    name: string;
    code: string;
};

export type Supplier = EntityBase & {
    name: string;
    phone?: string;
    email?: string;
};

export type UserRole = "Admin" | "Technician" | "Viewer";

export type SystemUser = EntityBase & {
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
};

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export type Employee = EntityBase & {
    empId: string;
    name: string;
    department: { id: number; name: string; code: string } | null;
    location: { id: number; name: string; code: string } | null;
    phone_no?: string;
    email?: string;
    employeeStatus?: EmployeeStatus;
};

// Reusable helper
export function genId(prefix: string) {
    return `${prefix}-${crypto.randomUUID()}`;
}

export type MaintenanceStatus = "Open" | "In Progress" | "Completed" | "Cancelled";
export type MaintenancePriority = "Low" | "Medium" | "High" | "Critical";

export const maintenanceStatusOptions: MaintenanceStatus[] = [
    "Open",
    "In Progress",
    "Completed",
    "Cancelled",
];

export const maintenancePriorityOptions: MaintenancePriority[] = [
    "Low",
    "Medium",
    "High",
    "Critical",
];

export type Maintenance = {
    id: string;
    ticketNo: string;
    assetId: string;
    assetCode: string;
    // supplierId and supplierName removed
    issueTitle: string;
    description?: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    reportedDate: string;
    dueDate?: string;
    assignedTo?: string;
    cost?: number;
    notes?: string;
};

export type MaintenanceFormState = {
    ticketNo: string;
    assetId: string;
    assetCode: string;
    // supplierId removed
    issueTitle: string;
    description?: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    reportedDate: string;
    dueDate?: string;
    assignedTo?: string;
    cost?: number;
    notes?: string;
};

export const emptyMaintenanceForm: MaintenanceFormState = {
    ticketNo: "",
    assetId: "",
    assetCode: "",
    // supplierId removed
    issueTitle: "",
    description: "",
    priority: "Medium",
    status: "Open",
    reportedDate: "",
    dueDate: "",
    assignedTo: "",
    cost: undefined,
    notes: "",
};

export type AuditAction =
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "EXPORT"
    | "ASSIGN"
    | "UNASSIGN"
    | "MAINTENANCE_OPEN"
    | "MAINTENANCE_UPDATE"
    | "MAINTENANCE_CLOSE";

export type AuditEntity =
    | "ASSET"
    | "EMPLOYEE"
    | "USER"
    | "SUPPLIER"
    | "DEPARTMENT"
    | "LOCATION"
    | "MAINTENANCE"
    | "REPORT"
    | "AUTH"
    | "SYSTEM";

export type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const auditActionOptions: AuditAction[] = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "EXPORT",
    "ASSIGN",
    "UNASSIGN",
    "MAINTENANCE_OPEN",
    "MAINTENANCE_UPDATE",
    "MAINTENANCE_CLOSE",
];

export const auditEntityOptions: AuditEntity[] = [
    "ASSET",
    "EMPLOYEE",
    "USER",
    "SUPPLIER",
    "DEPARTMENT",
    "LOCATION",
    "MAINTENANCE",
    "REPORT",
    "AUTH",
    "SYSTEM",
];

export const auditSeverityOptions: AuditSeverity[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
];

export type AuditLog = {
    id: string;
    timestamp: string;
    actorName: string;
    actorEmail?: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
    entityLabel?: string;
    severity: AuditSeverity;
    ip?: string;
    userAgent?: string;
    summary: string;
    details?: Record<string, unknown>;
};