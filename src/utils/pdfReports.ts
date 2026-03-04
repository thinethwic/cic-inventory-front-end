import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Asset } from "@/types";
import type { Maintenance } from "@/types";

/* -------------------------------- */
/* ASSET REPORT PDF */
/* -------------------------------- */

export const generateAssetReport = (assets: Asset[]) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Asset Inventory Report", 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const rows = assets.map((a) => [
        a.assetCode,
        a.category,
        `${a.brand} ${a.model}`,
        a.serialNo,
        a.status,
        a.location,
        a.assignedTo ?? "-",
    ]);

    autoTable(doc, {
        startY: 35,
        head: [
            [
                "Asset Code",
                "Category",
                "Model",
                "Serial",
                "Status",
                "Location",
                "Assigned To",
            ],
        ],
        body: rows,
    });

    doc.save("asset-report.pdf");
};

/* -------------------------------- */
/* MAINTENANCE REPORT PDF */
/* -------------------------------- */

export const generateMaintenanceReport = (maintenance: Maintenance[]) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Maintenance Report", 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

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
        startY: 35,
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
    });

    doc.save("maintenance-report.pdf");
};