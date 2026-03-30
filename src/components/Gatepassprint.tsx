// src/components/GatePassPrint.tsx

import * as React from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Asset } from "@/types";
import type { Maintenance } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d = new Date()) =>
  d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtTime = (d = new Date()) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const fmtStamp = (d = new Date()) => `${fmtDate(d)} · ${fmtTime(d)}`;

// ─── Print style injection — A4 landscape ─────────────────────────────────────

function usePrintStyle(printId: string) {
  React.useEffect(() => {
    const styleId = `gp-print-style-${printId}`;
    if (document.getElementById(styleId)) return;

    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 0; }
        html, body {
          width: 297mm; height: 210mm;
          margin: 0 !important; padding: 0 !important;
          overflow: hidden !important;
        }
        body > * { display: none !important; }
        #${printId}-portal {
          display: flex !important;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #fff;
          width: 297mm;
          height: 210mm;
          padding: 10mm;
          box-sizing: border-box;
        }
        #${printId}-portal > * { width: 100% !important; max-width: 100% !important; }
      }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, [printId]);
}

// ─── Print trigger ────────────────────────────────────────────────────────────

function doPrint(printId: string) {
  const card = document.getElementById(printId);
  if (!card) return;

  const portalId = `${printId}-portal`;
  let portal = document.getElementById(portalId);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = portalId;
    document.body.appendChild(portal);
  }

  const clone = card.cloneNode(true) as HTMLElement;
  clone.style.maxWidth = "100%";
  clone.style.width = "100%";
  clone.style.boxShadow = "none";
  clone.style.borderRadius = "0";

  portal.innerHTML = "";
  portal.appendChild(clone);
  window.print();
  setTimeout(() => {
    if (portal) portal.innerHTML = "";
  }, 1000);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  label: string;
  value?: string | null;
  mono?: boolean;
  span?: 1 | 2 | 3;
}

interface GatePassCardProps {
  title: string;
  location?: string;
  createdBy?: string;
  refNo: string;
  accentHex: string;
  footerNote: string;
  fields: FieldDef[];
  printId: string;
  completedAt?: string | null;
  /** When true, first signature label becomes "Issued By" instead of "Prepared By" */
  isCompleted?: boolean;
}

// ─── Signature Block ──────────────────────────────────────────────────────────

function SignatureBlock({
  label,
  createdBy,
  accentHex,
  isFirst,
}: {
  label: string;
  createdBy?: string;
  accentHex: string;
  isFirst: boolean;
}) {
  return (
    <div
      className="rounded-b-sm px-2 pb-2 pt-1"
      style={{
        borderTop: `2px solid ${accentHex}`,
        background: `${accentHex}0a`,
      }}
    >
      <p
        className="text-[7.5px] font-bold uppercase tracking-[0.15em] m-0"
        style={{ color: accentHex }}
      >
        {label}
      </p>

      {isFirst && createdBy && (
        <p className="text-[9px] font-bold text-[#1a1a1a] mt-1 mb-0">
          {createdBy}
        </p>
      )}

      <div
        className="border-b border-[#ccc] pb-0.5"
        style={{ marginTop: isFirst && createdBy ? 6 : 18 }}
      />
      <p className="text-[7.5px] text-[#bbb] mt-0.5">
        {isFirst && createdBy ? "Signature / Date" : "Name / Signature / Date"}
      </p>
    </div>
  );
}

// ─── Gate Pass Card ───────────────────────────────────────────────────────────

function GatePassCard({
  title,
  location,
  createdBy,
  refNo,
  accentHex,
  footerNote,
  fields,
  printId,
  completedAt,
  isCompleted,
}: GatePassCardProps) {
  usePrintStyle(printId);

  const stamp = fmtStamp();
  const firstSignatureLabel = isCompleted ? "Issued By" : "Prepared By";
  const signatureLabels = [firstSignatureLabel, "Authorised By", "Received By"];

  return (
    <div
      id={printId}
      className="relative w-2xl overflow-hidden rounded-[4px] text-[#1a1a1a]"
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: "#fff",
        border: `2px solid ${accentHex}`,
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
      }}
    >
      {/* Diagonal watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[90px] font-black uppercase tracking-[0.12em]"
          style={{
            color: "rgba(0,0,0,0.03)",
            transform: "rotate(-22deg)",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          GATE PASS
        </span>
      </div>

      {/* Top accent bar */}
      <div className="h-[7px] w-full" style={{ background: accentHex }} />

      {/* Header */}
      <div
        className="relative z-10 flex min-h-[40px] items-center justify-between border-b px-5 py-2.5"
        style={{
          borderColor: `${accentHex}22`,
          background: `${accentHex}08`,
        }}
      >
        {/* Left: Logo + Title + Location */}
        <div className="flex items-center gap-3.5">
          <img
            src="src/assets/Logo.png"
            alt="CIC Logo"
            className="h-40 shrink-0 object-contain"
          />

          <div
            className="h-14 w-px shrink-0 rounded-sm"
            style={{ background: `${accentHex}30` }}
          />

          <div className="flex text-left gap-3.5">
            <h2
              className="m-0 text-xl font-extrabold  tracking-[0.04em] leading-none"
              style={{ color: accentHex }}
            >
              {title}
            </h2>
            {location && (
              <p className="mt-[3px] mb-0 text-[11px] font-semibold tracking-[0.08em] text-[#555]">
                Location: {location}
              </p>
            )}
          </div>
        </div>

        {/* Right: Ref badge + Completed stamp */}
        <div className="flex flex-col items-end gap-1.5">
          <div
            className="rounded px-3.5 py-1.5 text-left"
            style={{ background: accentHex }}
          >
            <p
              className="m-0 text-2xl font-black tracking-[0.08em] text-shadow-neutral-400"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {refNo}
            </p>
            <p
              className="m-0 mt-[3px] text-[20px] text-left text-white/70"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {stamp}
            </p>
          </div>

          {completedAt && (
            <div className="flex items-center gap-1.5 rounded border border-green-600 bg-green-50 px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
              <div>
                <p
                  className="m-0 text-[8px] font-extrabold uppercase tracking-[0.15em] text-green-700"
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                  Completed
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fields grid */}
      <div className="relative z-10 grid grid-cols-3 gap-x-2 px-5 pt-2 pb-1">
        {fields.map((f) => (
          <div
            key={f.label}
            className="border-b border-dashed border-[#e0e0e0] py-[5px]"
            style={{ gridColumn: `span ${f.span ?? 1}` }}
          >
            <p className="m-0 text-[7.5px] font-bold uppercase tracking-[0.18em] text-[#aaa]">
              {f.label}
            </p>
            <p
              className="m-0 mt-0.5 text-[11.5px] font-bold text-[#1a1a1a]"
              style={{
                fontFamily: f.mono
                  ? "'Courier New', Courier, monospace"
                  : "inherit",
                whiteSpace: f.span === 3 ? "normal" : "nowrap",
                overflow: "hidden",
                textOverflow: f.span === 3 ? "clip" : "ellipsis",
              }}
            >
              {f.value || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Signature strip */}
      <div className="relative z-10 mx-5 mt-2.5 mb-1.5 grid grid-cols-3 gap-3">
        {signatureLabels.map((label, i) => (
          <SignatureBlock
            key={label}
            label={label}
            accentHex={accentHex}
            createdBy={createdBy}
            isFirst={i === 0}
          />
        ))}
      </div>

      {/* Footer bar */}
      <div
        className="mt-1 flex items-center justify-between px-5 py-1.5"
        style={{ background: accentHex }}
      >
        <p className="m-0 text-[8.5px] font-semibold text-white/90">
          {footerNote}
        </p>
        <p
          className="m-0 text-[8px] tracking-[0.1em] text-white/50"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          CONFIDENTIAL
        </p>
      </div>
    </div>
  );
}

// ─── Shared Dialog Footer ─────────────────────────────────────────────────────

function GatePassFooter({
  onClose,
  printId,
}: {
  onClose: () => void;
  printId: string;
}) {
  return (
    <div className="flex items-center justify-between border-t bg-background px-6 py-3">
      <p className="text-xs text-muted-foreground">Prints to A4 landscape</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} type="button">
          Close
        </Button>
        <Button
          onClick={() => doPrint(printId)}
          className="gap-2"
          type="button"
        >
          <Printer className="h-4 w-4" /> Print Gate Pass
        </Button>
      </div>
    </div>
  );
}

// ─── Asset Gate Pass ──────────────────────────────────────────────────────────

export interface AssetGatePassProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  createdBy?: string;
}

export function AssetGatePass({
  asset,
  open,
  onClose,
  createdBy,
}: AssetGatePassProps) {
  if (!asset) return null;

  const fields: FieldDef[] = [
    { label: "Asset Code", value: asset.assetCode, mono: true },
    { label: "Category", value: asset.category },
    { label: "Status", value: asset.status },
    {
      label: "Brand / Model",
      value: `${asset.brand ?? ""} ${asset.model ?? ""}`.trim() || "—",
      span: 2,
    },
    { label: "Serial Number", value: asset.serialNo, mono: true },
    { label: "Barcode", value: asset.barcode, mono: true },
    { label: "Location", value: asset.location },
    { label: "Assigned To", value: asset.assignedTo },
  ];

  const PRINT_ID = "asset-gate-pass-print";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[98vw] max-w-6xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold">
            Gate Pass — {asset.assetCode}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="overflow-auto p-6 bg-muted/40">
          <GatePassCard
            title="Gate Pass"
            location={asset.location ?? undefined}
            createdBy={createdBy}
            refNo={`AST-${asset.assetCode}`}
            accentHex="#94a3b8"
            footerNote="This pass must be presented at the security checkpoint."
            fields={fields}
            printId={PRINT_ID}
          />
        </div>

        <GatePassFooter onClose={onClose} printId={PRINT_ID} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Maintenance Gate Pass ────────────────────────────────────────────────────

export interface MaintenanceGatePassProps {
  maintenance: Maintenance | null;
  open: boolean;
  onClose: () => void;
  createdBy?: string;
  userLocation?: string;
  assetName?: string;
}

type ExtendedMaintenance = Maintenance & {
  location?: string;
  assetName?: string;
  description?: string;
  completedDate?: string;
};

export function MaintenanceGatePass({
  maintenance,
  open,
  onClose,
  createdBy,
  userLocation,
  assetName,
}: MaintenanceGatePassProps) {
  const completedAt = React.useMemo(() => {
    if (!maintenance || maintenance.status !== "Completed") return null;
    const d = new Date(
      (maintenance as ExtendedMaintenance).completedDate ?? "",
    );
    return isNaN(d.getTime()) ? fmtStamp() : fmtStamp(d);
  }, [maintenance]);

  if (!maintenance) return null;

  const m = maintenance as ExtendedMaintenance;
  const isCompleted = m.status === "Completed";
  const resolvedAssetName = assetName || m.assetName || "—";
  const resolvedLocation = m.location || userLocation || "—";

  const fields: FieldDef[] = [
    { label: "Ticket No", value: m.ticketNo, mono: true },
    { label: "Priority", value: m.priority },
    { label: "Status", value: m.status },
    { label: "Asset Code", value: m.assetCode, mono: true },
    { label: "Asset Name / Model", value: resolvedAssetName },
    { label: "Issue Title", value: m.issueTitle, span: 2 },
    { label: "Description", value: m.description || "—", span: 3 },
    { label: "Location", value: resolvedLocation },
    { label: "Reported Date", value: m.reportedDate },
    ...(isCompleted
      ? [{ label: "Completed Date", value: m.completedDate ?? fmtDate() }]
      : []),
  ];

  const PRINT_ID = "maintenance-gate-pass-print";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold">
            Maintenance Gate Pass — {m.ticketNo}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="overflow-auto p-6 bg-muted/40">
          <GatePassCard
            title="Maintenance Gate Pass"
            location={resolvedLocation !== "—" ? resolvedLocation : undefined}
            createdBy={createdBy}
            refNo={m.ticketNo}
            accentHex="#c2410c"
            footerNote="Present this pass when collecting the repaired asset."
            fields={fields}
            printId={PRINT_ID}
            completedAt={completedAt}
            isCompleted={isCompleted}
          />
        </div>

        <GatePassFooter onClose={onClose} printId={PRINT_ID} />
      </DialogContent>
    </Dialog>
  );
}
