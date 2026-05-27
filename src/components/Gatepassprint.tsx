// src/components/GatePassPrint.tsx

import * as React from "react";
import { Printer, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Asset } from "@/types";
import type { Maintenance } from "@/types";

import logo from "@/assets/Logo.png";

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
        #${printId}-portal .gp-card {
          width: 100% !important;
          max-width: none !important;
          box-sizing: border-box !important;
        }
        #${printId}-portal .gp-fields {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
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
  updatedBy?: string;
  refNo: string;
  accentHex: string;
  footerNote: string;
  fields: FieldDef[];
  printId: string;
  completedAt?: string | null;
  isCompleted?: boolean;
}

// ─── Signature Block ──────────────────────────────────────────────────────────

function SignatureBlock({
  label,
  createdBy,
  updatedBy,
  accentHex,
  isFirst,
  isCompleted,
}: {
  label: string;
  createdBy?: string;
  updatedBy?: string;
  accentHex: string;
  isFirst: boolean;
  isCompleted?: boolean;
}) {
  // First block: completed → show updatedBy under "Issued By"
  //              otherwise  → show createdBy under "Prepared By"
  const nameToShow = isFirst
    ? isCompleted
      ? updatedBy
      : createdBy
    : undefined;

  return (
    <div
      className="rounded-b-sm px-3 pb-3 pt-2 sm:px-2 sm:pb-2 sm:pt-1"
      style={{
        borderTop: `2px solid ${accentHex}`,
        background: `${accentHex}0a`,
      }}
    >
      <p
        className="m-0 text-[9px] font-bold uppercase tracking-[0.15em] sm:text-[7.5px]"
        style={{ color: accentHex }}
      >
        {label}
      </p>

      {isFirst && nameToShow && (
        <p className="mb-0 mt-1 text-xs font-bold text-[#1a1a1a] sm:text-[9px]">
          {nameToShow}
        </p>
      )}

      <div
        className="border-b border-[#ccc] pb-0.5"
        style={{ marginTop: isFirst && nameToShow ? 6 : 18 }}
      />
      <p className="mt-0.5 text-[9px] text-[#777] sm:text-[7.5px] sm:text-[#bbb]">
        {isFirst && nameToShow ? "Signature / Date" : "Name / Signature / Date"}
      </p>
    </div>
  );
}

// ─── Gate Pass Card ───────────────────────────────────────────────────────────

function GatePassCard({
  title,
  location,
  createdBy,
  updatedBy,
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
      className="gp-card relative mx-auto box-border w-full max-w-full overflow-hidden rounded-[4px] text-[#1a1a1a]"
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
          className="select-none whitespace-nowrap text-5xl font-black uppercase tracking-[0.12em] sm:text-[72px] lg:text-[90px]"
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
        className="relative z-10 flex min-h-[40px] flex-col gap-4 border-b px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-2.5"
        style={{
          borderColor: `${accentHex}22`,
          background: `${accentHex}08`,
        }}
      >
        {/* Left: Logo + Title + Location */}
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5 lg:flex-1">
          <img
            src={logo}
            alt="CIC Logo"
            className="h-16 w-auto max-w-[140px] shrink-0 object-contain sm:h-20 sm:max-w-[180px] lg:h-28 lg:max-w-[240px]"
          />

          <div
            className="hidden h-14 w-px shrink-0 rounded-sm sm:block"
            style={{ background: `${accentHex}30` }}
          />

          <div className="flex min-w-0 flex-col gap-1 text-left sm:gap-1.5 lg:flex-row lg:items-baseline lg:gap-3.5">
            <h2
              className="m-0 break-words text-xl font-extrabold leading-tight tracking-[0.04em] sm:text-2xl lg:text-xl"
              style={{ color: accentHex }}
            >
              {title}
            </h2>
            {location && (
              <p className="mb-0 mt-[3px] break-words text-[11px] font-semibold tracking-[0.08em] text-[#555]">
                Location: {location}
              </p>
            )}
          </div>
        </div>

        {/* Right: Ref badge + Completed stamp */}
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:max-w-[45%] sm:items-end sm:gap-1.5">
          <div
            className="w-full max-w-full rounded px-3.5 py-2 text-left sm:py-1.5"
            style={{ background: accentHex }}
          >
            <p
              className="m-0 break-all text-xl font-black tracking-[0.08em] text-white sm:text-2xl"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                overflowWrap: "anywhere",
              }}
            >
              {refNo}
            </p>
            <p
              className="m-0 mt-[3px] text-left text-xs text-white/70 sm:text-[20px]"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                overflowWrap: "anywhere",
              }}
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
                  style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    overflowWrap: "anywhere",
                  }}
                >
                  Completed
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fields grid */}
      <div className="gp-fields relative z-10 grid grid-cols-1 gap-x-3 px-4 pb-2 pt-2 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
        {fields.map((f) => (
          <div
            key={f.label}
            className={`border-b border-dashed border-[#e0e0e0] py-2 sm:py-[5px] ${
              f.span === 3
                ? "sm:col-span-2 lg:col-span-3"
                : f.span === 2
                  ? "sm:col-span-2"
                  : ""
            }`}
          >
            <p className="m-0 text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#777] sm:text-[7.5px] sm:text-[#aaa]">
              {f.label}
            </p>
            <p
              className="m-0 mt-0.5 break-words text-sm font-bold text-[#1a1a1a] sm:text-[11.5px]"
              style={{
                fontFamily: f.mono
                  ? "'Courier New', Courier, monospace"
                  : "inherit",
                whiteSpace: "normal",
                overflow: "hidden",
                textOverflow: "clip",
                overflowWrap: "anywhere",
              }}
            >
              {f.value || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Signature strip */}
      <div className="relative z-10 mx-4 mb-2 mt-3 grid grid-cols-1 gap-3 sm:mx-5 sm:mb-1.5 sm:mt-2.5 sm:grid-cols-3">
        {signatureLabels.map((label, i) => (
          <SignatureBlock
            key={label}
            label={label}
            accentHex={accentHex}
            createdBy={createdBy}
            updatedBy={updatedBy}
            isCompleted={isCompleted}
            isFirst={i === 0}
          />
        ))}
      </div>

      {/* Footer bar */}
      <div
        className="mt-1 flex flex-col gap-1 px-4 py-2 text-center sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-1.5 sm:text-left"
        style={{ background: accentHex }}
      >
        <p className="m-0 text-[10px] font-semibold text-white/90 sm:text-[8.5px]">
          {footerNote}
        </p>
        <p
          className="m-0 text-[9px] tracking-[0.1em] text-white/60 sm:text-[8px] sm:text-white/50"
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
    <div className="flex flex-col gap-3 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-xs text-muted-foreground">Prints to A4 landscape</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
      <DialogContent className="flex max-h-[96dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-[95vw] [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle className="min-w-0 truncate text-sm font-semibold sm:text-base">
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

        <div className="flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">
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
  updatedBy?: string;
  userLocation?: string;
  assetName?: string;
  loading?: boolean; // ← add
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
  updatedBy,
  userLocation,
  assetName,
  loading, // ← add
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
      <DialogContent className="flex max-h-[96dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[95vw] [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle className="min-w-0 truncate text-sm font-semibold sm:text-base">
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

        <div className="flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">
          {/* Show spinner while audit data loads */}
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading ticket details...</span>
            </div>
          ) : (
            <GatePassCard
              title="Maintenance Gate Pass"
              location={resolvedLocation !== "—" ? resolvedLocation : undefined}
              createdBy={createdBy}
              updatedBy={updatedBy}
              refNo={m.ticketNo}
              accentHex="#c2410c"
              footerNote="Present this pass when collecting the repaired asset."
              fields={fields}
              printId={PRINT_ID}
              completedAt={completedAt}
              isCompleted={isCompleted}
            />
          )}
        </div>

        <GatePassFooter onClose={onClose} printId={PRINT_ID} />
      </DialogContent>
    </Dialog>
  );
}
