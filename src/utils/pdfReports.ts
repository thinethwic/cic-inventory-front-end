import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Asset } from "@/types";
import type { Maintenance } from "@/types";

/* -------------------------------- */
/* Shared header helper             */
/* -------------------------------- */
function addReportHeader(doc: jsPDF, title: string, subtitle?: string) {
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    if (subtitle) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 35);
        doc.setTextColor(0);
        return 42; // startY
    }

    return 35; // startY
}

/* -------------------------------- */
/* ASSET REPORT PDF (full)          */
/* -------------------------------- */
export const generateAssetReport = (assets: Asset[]) => {
    const doc = new jsPDF();
    const startY = addReportHeader(doc, "Asset Inventory Report");

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        `${a.brand} ${a.model}`,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "-",
        a.supplierName ?? "-",
        a.purchaseDate ?? "-",
    ]);

    autoTable(doc, {
        startY,
        head: [
            [
                "Asset Code",
                "Category",
                "Model",
                "Serial",
                "Status",
                "Location",
                "Assigned To",
                "Supplier",
                "Purchase Date",
            ],
        ],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save("asset-report.pdf");
};

/* -------------------------------- */
/* FILTERED ASSET REPORT PDF        */
/* -------------------------------- */
export interface AssetReportFilters {
    supplierName?: string;
    purchaseDateFrom?: string;
    purchaseDateTo?: string;
}

export const generateFilteredAssetReport = (
    assets: Asset[],
    filters: AssetReportFilters
) => {
    const doc = new jsPDF();

    // Build subtitle string describing active filters
    const parts: string[] = [];
    if (filters.supplierName) parts.push(`Supplier: ${filters.supplierName}`);
    if (filters.purchaseDateFrom) parts.push(`From: ${filters.purchaseDateFrom}`);
    if (filters.purchaseDateTo) parts.push(`To: ${filters.purchaseDateTo}`);
    const subtitle = parts.length > 0 ? `Filters — ${parts.join("  |  ")}` : undefined;

    const startY = addReportHeader(doc, "Filtered Asset Report", subtitle);

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        `${a.brand} ${a.model}`,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "-",
        a.supplierName ?? "-",
        a.purchaseDate ?? "-",
    ]);

    autoTable(doc, {
        startY,
        head: [
            [
                "Asset Code",
                "Category",
                "Model",
                "Serial",
                "Status",
                "Location",
                "Assigned To",
                "Supplier",
                "Purchase Date",
            ],
        ],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [168, 85, 247] },
    });

    doc.save("filtered-asset-report.pdf");
};

/* -------------------------------- */
/* MAINTENANCE REPORT PDF           */
/* -------------------------------- */
export const generateMaintenanceReport = (maintenance: Maintenance[]) => {
    const doc = new jsPDF();
    const startY = addReportHeader(doc, "Maintenance Report");

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
        head: [
            [
                "Ticket",
                "Asset",
                "Issue",
                "Priority",
                "Status",
                "Reported Date",
                "Assigned To",
            ],
        ],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save("maintenance-report.pdf");
};