import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { Asset } from "@/types";
import type { Maintenance } from "@/types";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Constants                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

const LOGO_PATH = "/Logo.png";
const COMPANY_NAME = "CIC Feeds Groups - Asset Inventory";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Logo loader                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Loads a PNG logo and converts it to a base64 data URL for jsPDF.
 * Returns null if the logo cannot be loaded (report still generates without it).
 */
async function loadLogoAsDataURL(logoPath: string): Promise<string | null> {
    try {
        const response = await fetch(logoPath);
        if (!response.ok) return null;

        const blob = await response.blob();

        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Shared helpers                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Adds the report header with logo on the right and title on the left.
 * Returns the Y position where the table should start.
 */
function addReportHeader(
    doc: jsPDF,
    title: string,
    logoDataURL: string | null,
    subtitle?: string,
) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo — top-right corner
    if (logoDataURL) {
        const logoW = 40;
        const logoH = 14;
        doc.addImage(logoDataURL, "PNG", pageWidth - logoW - 14, 12, logoW, logoH);
    }

    // Title & meta — left side
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    if (subtitle) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 35);
        doc.setTextColor(0);
        return 42;
    }

    return 35;
}

/** Download a workbook as .xlsx */
function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
    XLSX.writeFile(wb, filename);
}

/** Style a header row in a worksheet (bold + coloured fill) */
function styleHeaderRow(
    ws: XLSX.WorkSheet,
    headers: string[],
    fillColor = "3B82F6",
) {
    headers.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
        if (!ws[cellRef]) return;
        ws[cellRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: fillColor } },
            alignment: { horizontal: "center" },
        };
    });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ASSET REPORT — PDF (full)                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateAssetReport = async (assets: Asset[]) => {
    const doc = new jsPDF();
    const logo = await loadLogoAsDataURL(LOGO_PATH);
    const startY = addReportHeader(doc, COMPANY_NAME, logo);

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        `${a.brand} ${a.model}`,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "-",
        a.purchaseDate ?? "-",
    ]);

    autoTable(doc, {
        startY,
        head: [["Asset Code", "Category", "Model", "Serial", "Status", "Location", "Assigned To", "Purchase Date"]],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save("asset-report.pdf");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* ASSET REPORT — Excel (full)                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateAssetReportExcel = (assets: Asset[]) => {
    const headers = [
        "Asset Code", "Category", "Brand", "Model", "Serial No",
        "Status", "Location", "Assigned To",
        "Purchase Date", "Warranty End",
    ];

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        a.brand,
        a.model,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "",
        a.purchaseDate ?? "",
        a.warrantyEnd ?? "",
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    styleHeaderRow(ws, headers, "3B82F6");

    ws["!cols"] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");

    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};

    assets.forEach((a) => {
        statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
        categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1;
        if (a.location) locationCounts[a.location] = (locationCounts[a.location] ?? 0) + 1;
    });

    const summaryRows: (string | number)[][] = [
        [COMPANY_NAME],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [`Total Assets: ${assets.length}`],
        [],
        ["── By Status ──"],
        ["Status", "Count"],
        ...Object.entries(statusCounts),
        [],
        ["── By Category ──"],
        ["Category", "Count"],
        ...Object.entries(categoryCounts),
        [],
        ["── By Location ──"],
        ["Location", "Count"],
        ...Object.entries(locationCounts),
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    saveWorkbook(wb, "asset-report.xlsx");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* FILTERED ASSET REPORT — shared types                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface AssetReportFilters {
    supplierName?: string;
    location?: string;
    assignedTo?: string;
    status?: string;       // ← added
    department?: string;   // ← added
    category?: string;     // ← added
    purchaseDateFrom?: string;
    purchaseDateTo?: string;
}

/** Builds a human-readable filter summary string from the active filters */
function buildFilterSubtitle(filters: AssetReportFilters): string | undefined {
    const parts: string[] = [];
    if (filters.supplierName) parts.push(`Supplier: ${filters.supplierName}`);
    if (filters.location) parts.push(`Location: ${filters.location}`);
    if (filters.assignedTo) parts.push(`Assigned To: ${filters.assignedTo}`);
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.department) parts.push(`Department: ${filters.department}`);
    if (filters.category) parts.push(`Category: ${filters.category}`);
    if (filters.purchaseDateFrom) parts.push(`From: ${filters.purchaseDateFrom}`);
    if (filters.purchaseDateTo) parts.push(`To: ${filters.purchaseDateTo}`);
    return parts.length > 0 ? `Filters — ${parts.join("  |  ")}` : undefined;
}

/** Builds an array of meta rows for Excel (title, date, filters, record count) */
function buildExcelMetaRows(
    filters: AssetReportFilters,
    totalRecords: number,
): (string | number)[][] {
    const filterParts: string[] = [];
    if (filters.supplierName) filterParts.push(`Supplier: ${filters.supplierName}`);
    if (filters.location) filterParts.push(`Location: ${filters.location}`);
    if (filters.assignedTo) filterParts.push(`Assigned To: ${filters.assignedTo}`);
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filters.department) filterParts.push(`Department: ${filters.department}`);
    if (filters.category) filterParts.push(`Category: ${filters.category}`);
    if (filters.purchaseDateFrom) filterParts.push(`From: ${filters.purchaseDateFrom}`);
    if (filters.purchaseDateTo) filterParts.push(`To: ${filters.purchaseDateTo}`);

    return [
        [COMPANY_NAME],
        [`Generated: ${new Date().toLocaleDateString()}`],
        ...(filterParts.length > 0
            ? [[`Filters: ${filterParts.join("  |  ")}`]]
            : []),
        [`Total Records: ${totalRecords}`],
        [],
    ];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FILTERED ASSET REPORT — PDF                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateFilteredAssetReport = async (
    assets: Asset[],
    filters: AssetReportFilters,
) => {
    const doc = new jsPDF();
    const logo = await loadLogoAsDataURL(LOGO_PATH);

    const subtitle = buildFilterSubtitle(filters);
    const startY = addReportHeader(doc, COMPANY_NAME, logo, subtitle);

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        `${a.brand} ${a.model}`,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "-",
        a.purchaseDate ?? "-",
    ]);

    autoTable(doc, {
        startY,
        head: [["Asset Code", "Category", "Model", "Serial", "Status", "Location", "Assigned To", "Purchase Date"]],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [168, 85, 247] },
    });

    doc.save("filtered-asset-report.pdf");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* FILTERED ASSET REPORT — Excel                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateFilteredAssetReportExcel = (
    assets: Asset[],
    filters: AssetReportFilters,
) => {
    const headers = [
        "Asset Code", "Category", "Brand", "Model", "Serial No",
        "Status", "Location", "Assigned To",
        "Purchase Date", "Warranty End",
    ];

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        a.brand,
        a.model,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "",
        a.purchaseDate ?? "",
        a.warrantyEnd ?? "",
    ]);

    const metaRows = buildExcelMetaRows(filters, assets.length);

    const wsData = [...metaRows, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const headerRowIdx = metaRows.length;
    headers.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c: colIdx });
        if (!ws[cellRef]) return;
        ws[cellRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "A855F7" } },
            alignment: { horizontal: "center" },
        };
    });

    ws["!cols"] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Assets");
    saveWorkbook(wb, "filtered-asset-report.xlsx");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAINTENANCE REPORT — PDF                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateMaintenanceReport = async (maintenance: Maintenance[]) => {
    const doc = new jsPDF();
    const logo = await loadLogoAsDataURL(LOGO_PATH);
    const startY = addReportHeader(doc, COMPANY_NAME, logo);

    const rows = maintenance.map((m) => [
        m.ticketNo,
        m.assetCode,
        m.issueTitle,
        m.priority,
        m.status,
        m.reportedDate,
        m.assignedTo ?? "-",
    ]);

    autoTable(doc, {
        startY,
        head: [["Ticket", "Asset", "Issue", "Priority", "Status", "Reported Date", "Assigned To"]],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save("maintenance-report.pdf");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAINTENANCE REPORT — Excel                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export const generateMaintenanceReportExcel = (maintenance: Maintenance[]) => {
    const headers = [
        "Ticket No", "Asset Code", "Issue Title", "Priority",
        "Status", "Reported Date", "Assigned To",
    ];

    const rows = maintenance.map((m) => [
        m.ticketNo,
        m.assetCode,
        m.issueTitle,
        m.priority,
        m.status,
        m.reportedDate,
        m.assignedTo ?? "",
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    styleHeaderRow(ws, headers, "22C55E");

    ws["!cols"] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
    }));

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    maintenance.forEach((m) => {
        statusCounts[m.status] = (statusCounts[m.status] ?? 0) + 1;
        priorityCounts[m.priority] = (priorityCounts[m.priority] ?? 0) + 1;
    });

    const summaryRows: (string | number)[][] = [
        [COMPANY_NAME],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [`Total Tickets: ${maintenance.length}`],
        [],
        ["── By Status ──"],
        ["Status", "Count"],
        ...Object.entries(statusCounts),
        [],
        ["── By Priority ──"],
        ["Priority", "Count"],
        ...Object.entries(priorityCounts),
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maintenance");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    saveWorkbook(wb, "maintenance-report.xlsx");
};