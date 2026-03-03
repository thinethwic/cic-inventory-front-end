// src/types/asset.ts

export type AssetStatus = "Available" | "Assigned" | "In Repair" | "Retired";

export const statusOptions: AssetStatus[] = [
    "Available",
    "Assigned",
    "In Repair",
    "Retired",
];

export const categoryOptions = [
    "Laptop",
    "Desktop",
    "Printer",
    "Router",
    "Switch",
    "Other",
] as const;

export type AssetCategory = (typeof categoryOptions)[number];

export type Asset = {
    id: string;
    assetCode: string;
    barcode?: string;
    category: AssetCategory;
    brand: string;
    model: string;
    serialNo: string;
    status: AssetStatus;
    location: string;
    assignedTo?: string;
    purchaseDate?: string; // YYYY-MM-DD
    warrantyEnd?: string;  // YYYY-MM-DD
};

export type AssetFormState = Omit<Asset, "id">;

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

export type Employee = EntityBase & {
    empId: string;
    name: string;
    departmentId: string;
    locationId: string;
    phone?: string;
    email?: string;
    status: "Active" | "Inactive";
};
