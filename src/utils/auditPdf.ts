import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AuditLog } from "@/types";

export const generateAuditLogReport = (logs: AuditLog[]) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Audit Log Report", 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    const rows = logs.map((l) => [
        new Date(l.timestamp).toLocaleString(),
        l.actorName,
        l.action,
        l.entity,
        l.entityLabel ?? "-",
        l.severity,
        l.ip ?? "-",
        l.summary,
    ]);

    autoTable(doc, {
        startY: 32,
        head: [["Time", "User", "Action", "Entity", "Item", "Severity", "IP", "Summary"]],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save("audit-log-report.pdf");
};