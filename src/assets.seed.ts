// src/data/assets.seed.ts
import type { Asset } from "@/types";
import type { Department, Location, Supplier, SystemUser, Employee } from "@/types";

export const seedAssets: Asset[] = [
    {
        id: "1",
        assetCode: "CIC-IT-LAP-0021",
        barcode: "CIC-IT-LAP-0021",
        category: "Laptop",
        brand: "Dell",
        model: "Latitude 5420",
        serialNo: "DL-5420-A1",
        status: "Assigned",
        assignedTo: "E1023 - Daniel Perera",
        location: "HQ / Finance",
        purchaseDate: "2025-01-10",
        warrantyEnd: "2027-01-10",
    },
    {
        id: "2",
        assetCode: "CIC-IT-PRN-0007",
        barcode: "HP-M404-77",
        category: "Printer",
        brand: "HP",
        model: "M404dn",
        serialNo: "HP-M404-77",
        status: "Available",
        location: "HQ / Store",
        purchaseDate: "2024-08-02",
        warrantyEnd: "2026-08-02",
    },
    {
        id: "3",
        assetCode: "CIC-IT-NET-0012",
        barcode: "MT-AC2-12",
        category: "Router",
        brand: "MikroTik",
        model: "hAP ac2",
        serialNo: "MT-AC2-12",
        status: "In Repair",
        location: "Factory / Office",
    },
];


export const seedDepartments: Department[] = [
    { id: "d1", name: "IT", code: "IT", createdAt: "2026-02-01" },
    { id: "d2", name: "Finance", code: "FIN", createdAt: "2026-02-01" },
    { id: "d3", name: "HR", code: "HR", createdAt: "2026-02-01" },
];

export const seedLocations: Location[] = [
    { id: "l1", name: "HQ - Colombo", code: "HQ-CMB", createdAt: "2026-02-01" },
    { id: "l2", name: "Factory - Kandy", code: "FAC-KDY", createdAt: "2026-02-01" },
    { id: "l3", name: "Branch - Negombo", code: "BR-NGM", createdAt: "2026-02-01" },
];

export const seedSuppliers: Supplier[] = [
    {
        id: "s1",
        name: "TechMart (Pvt) Ltd",
        phone: "+94 77 123 4567",
        email: "sales@techmart.lk",
        createdAt: "2026-02-05",
    },
    {
        id: "s2",
        name: "OfficePro Solutions",
        phone: "+94 76 987 6543",
        email: "hello@officepro.lk",
        createdAt: "2026-02-06",
    },
];

export const seedUsers: SystemUser[] = [
    {
        id: "u1",
        name: "CIC Admin",
        email: "admin@cic.lk",
        role: "Admin",
        active: true,
        createdAt: "2026-02-01",
    },
    {
        id: "u2",
        name: "IT Technician",
        email: "tech@cic.lk",
        role: "Technician",
        active: true,
        createdAt: "2026-02-02",
    },
    {
        id: "u3",
        name: "Auditor",
        email: "audit@cic.lk",
        role: "Viewer",
        active: false,
        createdAt: "2026-02-03",
    },
];

export const seedEmployees: Employee[] = [
    {
        id: "e1",
        empId: "E1023",
        name: "Daniel Perera",
        departmentId: "d2",
        locationId: "l1",
        phone: "07X-XXX-XXXX",
        email: "daniel@cic.lk",
        status: "Active",
        createdAt: "2026-02-01",
    },
    {
        id: "e2",
        empId: "E1144",
        name: "Kasun Silva",
        departmentId: "d1",
        locationId: "l1",
        phone: "07X-XXX-XXXX",
        email: "kasun@cic.lk",
        status: "Active",
        createdAt: "2026-02-02",
    },
    {
        id: "e3",
        empId: "E1201",
        name: "Nimali Fernando",
        departmentId: "d3",
        locationId: "l3",
        phone: "07X-XXX-XXXX",
        email: "nimali@cic.lk",
        status: "Inactive",
        createdAt: "2026-02-05",
    },
];