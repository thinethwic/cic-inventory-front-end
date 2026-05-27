// src/types.ts
// ─── Status — mirrors backend AssetStatus enum ────────────────────────────────
export type AssetStatus = "Available" | "Assigned" | "In Repair" | "Disposed" | "Damaged";

export const statusOptions: AssetStatus[] = [
    "Available",
    "Assigned",
    "In Repair",
    "Disposed",
    "Damaged",
];

// ─── Category — mirrors backend AssetCategory enum ───────────────────────────
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
    locationId: string;
    assignedToId?: string;
    purchaseDate?: string;
    warrantyEnd?: string;
    supplierId?: number;
    supplierName?: string;
}

// ─── Form state ───────────────────────────────────────────────────────────────
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
    supplierId: string;
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

// ─── Entity base ──────────────────────────────────────────────────────────────
export type EntityBase = {
    id: number;
    createdAt?: string;
};

export type Location = EntityBase & {
    name: string;
    code: string;
};

export type Department = EntityBase & {
    name: string;
    code: string;
    location?: Location; // ← added: returned by backend on GET
};

export type Supplier = EntityBase & {
    name: string;
    contactPerson?: string;
    phone_no?: string;
    email?: string;
};

export type InventoryUserRole = "admin" | "admin_user" | "user";

export type InventoryUser = EntityBase & {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    location: string;
    department: string;
    locationId: number | null;    // ✅ add this
    departmentId: number | null;  // ✅ add this
    role: InventoryUserRole;
    roles: InventoryUserRole[];
    isActive: boolean;
    updatedAt?: string;
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

export function genId() {
    return crypto.randomUUID();
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
export type MaintenanceStatus =
    | "Open"
    | "In Progress"
    | "Completed"
    | "Cancelled"
    | "Cannot Repair";

export type MaintenancePriority = "Low" | "Medium" | "High" | "Critical";

export const maintenanceStatusOptions: MaintenanceStatus[] = [
    "Open",
    "In Progress",
    "Completed",
    "Cancelled",
    "Cannot Repair",
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
    supplierId?: string;
    supplierName?: string;
    issueTitle: string;
    description?: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    reportedDate: string;
    dueDate?: string;
    assignedTo?: string;
    cost?: number;
    notes?: string;
    location?: string;
    createdAt?: string;
    // ── Audit ──────────────────────────────────────────────────────────
    createdBy?: { id: number; firstName: string; lastName: string };
    updatedBy?: { id: number; firstName: string; lastName: string };
};

export type MaintenanceFormState = {
    ticketNo: string;
    assetId: string;
    assetCode: string;
    issueTitle: string;
    description?: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    reportedDate: string;
    dueDate?: string;
    assignedTo?: string;
    supplierId?: string | number | null;
    cost?: number;
    notes?: string;
    location?: string;
};

export const emptyMaintenanceForm: MaintenanceFormState = {
    ticketNo: "",
    assetId: "",
    assetCode: "",
    issueTitle: "",
    description: "",
    priority: "Medium",
    status: "Open",
    reportedDate: "",
    dueDate: "",
    assignedTo: "",
    supplierId: null,
    cost: undefined,
    notes: "",
    location: "",
};
