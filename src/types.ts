// src/types.ts

// ─── Status — mirrors backend AssetStatus enum ────────────────────────────────
// Backend:  AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED
// Frontend: Available | Assigned  | In Repair   | Disposed
export type AssetStatus = "Available" | "Assigned" | "In Repair" | "Disposed";

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
    location: string;
    assignedTo?: string;
    purchaseDate?: string;
    warrantyEnd?: string;
}

// ─── Form state (all optional fields as empty string for controlled inputs) ───
export interface AssetFormState {
    assetCode: string;
    barcode: string;
    category: string;
    brand: string;
    model: string;
    serialNo: string;
    status: AssetStatus;
    location: string;
    assignedTo: string;
    purchaseDate: string;
    warrantyEnd: string;
}

export const emptyAssetForm: AssetFormState = {
    assetCode: "",
    barcode: "",
    category: "Laptop",
    brand: "",
    model: "",
    serialNo: "",
    status: "Available",
    location: "",
    assignedTo: "",
    purchaseDate: "",
    warrantyEnd: "",
};

// src/types/management.ts

export type EntityBase = {
    id: string;
    createdAt: string; // YYYY-MM-DD
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

export type EmployeeStatus = "Active" | "Inactive";

export type Employee = EntityBase & {
    empId: string;
    name: string;
    departmentId: string;
    locationId: string;
    phone?: string;
    email?: string;
    status: EmployeeStatus;
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
    ticketNo: string;        // e.g. MT-0001
    assetId: string;         // link to Asset
    assetCode: string;       // store snapshot for display
    issueTitle: string;
    description?: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;

    reportedDate: string;    // YYYY-MM-DD
    dueDate?: string;        // YYYY-MM-DD
    completedDate?: string;  // YYYY-MM-DD

    assignedTo?: string;     // technician name
    supplier?: string;       // vendor name
    cost?: number;           // LKR or value
    notes?: string;
};

export type MaintenanceFormState = Omit<Maintenance, "id">;

export const emptyMaintenanceForm: MaintenanceFormState = {
    ticketNo: "",
    assetId: "",
    assetCode: "",
    issueTitle: "",
    description: "",
    priority: "Medium",
    status: "Open",
    reportedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    completedDate: "",
    assignedTo: "",
    supplier: "",
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
  timestamp: string; // ISO string
  actorName: string; // user full name
  actorEmail?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  entityLabel?: string; // assetCode / employee name etc.
  severity: AuditSeverity;

  ip?: string;
  userAgent?: string;

  summary: string; // short
  details?: Record<string, unknown>; // optional extra details
};
