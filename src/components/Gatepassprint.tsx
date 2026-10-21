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
import type { Asset, Maintenance } from "@/types";

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

// A4 portrait at 96 dpi (used to scale the on-screen preview)
const SHEET_W_PX = 793.7; // 210mm
const SHEET_H_PX = 1122.5; // 297mm

const COPY_LABELS = ["Security Copy", "Original"] as const;

const BASE_FONT = "Arial, 'Liberation Sans', Helvetica, sans-serif,'Segoe UI'";
const MONO_FONT = "'Courier New', 'Liberation Mono', Courier, monospace";

// The gate pass is black & white only
const INK = "#000";

// ─── Print style injection — A4 portrait ──────────────────────────────────────

function usePrintStyle(printId: string) {
  React.useEffect(() => {
    const styleId = `gp-print-style-${printId}`;
    if (document.getElementById(styleId)) return;

    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        html, body {
          width: 210mm; height: 297mm;
          margin: 0 !important; padding: 0 !important;
          overflow: hidden !important;
        }
        body > * { display: none !important; }
        #${printId}-portal {
          display: block !important;
          position: fixed;
          top: 0;
          left: 0;
          width: 210mm;
          height: 297mm;
          z-index: 99999;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        #${printId}-portal * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #${printId}-portal .gp-sheet {
          box-shadow: none !important;
          margin: 0 !important;
        }
      }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, [printId]);
}

// ─── Print trigger ────────────────────────────────────────────────────────────

function doPrint(printId: string) {
  const sheet = document.getElementById(printId);
  if (!sheet) return;

  const portalId = `${printId}-portal`;
  let portal = document.getElementById(portalId);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = portalId;
    portal.style.display = "none";
    document.body.appendChild(portal);
  }

  // The sheet itself is never scaled (only its preview wrapper is),
  // so the clone prints at true A4 size.
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.style.boxShadow = "none";

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
  /** Limit the value to N lines (for long text such as descriptions) */
  clamp?: number;
}

interface GatePassBaseProps {
  title: string;
  location?: string;
  createdBy?: string;
  updatedBy?: string;
  refNo: string;
  footerNote: string;
  fields: FieldDef[];
  completedAt?: string | null;
  isCompleted?: boolean;
}

interface GatePassCardProps extends GatePassBaseProps {
  stamp: string;
  copyLabel: string;
}

// ─── Signature Block ──────────────────────────────────────────────────────────

function SignatureBlock({
  label,
  createdBy,
  updatedBy,
  isFirst,
  isCompleted,
}: {
  label: string;
  createdBy?: string;
  updatedBy?: string;
  isFirst: boolean;
  isCompleted?: boolean;
}) {
  const nameToShow = isFirst
    ? isCompleted
      ? updatedBy
      : createdBy
    : undefined;

  return (
    <div
      className="px-1.5 pb-1.5 pt-1"
      style={{ borderTop: `2px solid ${INK}` }}
    >
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-black">
        {label}
      </p>

      {/* Fixed signing area: same height for every block so lines align */}
      <div
        style={{
          height: 32, // ← increase/decrease this for more/less signature space
          borderBottom: `1px solid ${INK}`,
        }}
      >
        {nameToShow && (
          <p className="mb-0 mt-0.5 text-[12px] font-bold text-black">
            {nameToShow}
          </p>
        )}
      </div>

      <p className="mb-0 mt-0.5 text-[9px] text-[#444]">
        {nameToShow ? "Signature / Date" : "Name / Signature / Date"}
      </p>
    </div>
  );
}

// ─── Blank write-in field (Date Sent / Time / Vehicle No) ────────────────────

function WriteInField({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-black">
        {label}
      </span>
      <span
        className="h-[18px] flex-1"
        style={{ borderBottom: `1px solid ${INK}` }}
      />
    </div>
  );
}

// ─── Gate Pass Card (one copy) ────────────────────────────────────────────────

function GatePassCard({
  title,
  location,
  createdBy,
  updatedBy,
  refNo,
  footerNote,
  fields,
  completedAt,
  isCompleted,
  stamp,
  copyLabel,
}: GatePassCardProps) {
  const firstSignatureLabel = isCompleted ? "Issued By" : "Prepared By";
  const signatureLabels = [
    firstSignatureLabel,
    "Authorised By",
    "Security",
    "Received By",
  ];

  return (
    <div
      className="relative box-border flex h-full w-full flex-col overflow-hidden text-black"
      style={{
        fontFamily: BASE_FONT,
        background: "#fff",
        border: `2px solid ${INK}`,
      }}
    >
      {/* Diagonal watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[64px] font-black uppercase tracking-[0.12em]"
          style={{
            color: "rgba(0,0,0,0.04)",
            transform: "rotate(-22deg)",
            fontFamily: MONO_FONT,
          }}
        >
          GATE PASS
        </span>
      </div>

      {/* Header */}
      <div
        className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-4 py-2.5"
        style={{ borderBottom: `2px solid ${INK}` }}
      >
        {/* Left: Logo + Title + Location */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={logo}
            alt="CIC Logo"
            className="h-[110px] w-auto max-w-[205px] shrink-0 object-contain"
            style={{ filter: "grayscale(1)" }}
          />

          <div className="h-14 w-px shrink-0" style={{ background: INK }} />

          <div className="min-w-0">
            <h2 className="m-0 break-words text-[26px] font-extrabold leading-tight tracking-[0.03em] text-black">
              {title}
            </h2>
            {location && (
              <p className="mb-0 mt-1 break-words text-[13px] font-semibold tracking-[0.05em] text-[#333]">
                Location: {location}
              </p>
            )}
          </div>
        </div>

        {/* Right: Copy label + Ref badge + Completed stamp */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {completedAt && (
              <div
                className="flex items-center gap-1 px-2 py-0.5"
                style={{ border: `1px solid ${INK}` }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-black" />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-black"
                  style={{ fontFamily: MONO_FONT }}
                >
                  Completed
                </span>
              </div>
            )}
            <span
              className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-black"
              style={{ border: `2px solid ${INK}` }}
            >
              {copyLabel}
            </span>
          </div>

          <div
            className="max-w-[270px] px-3 py-1.5 text-right"
            style={{ border: `2px solid ${INK}` }}
          >
            <p
              className="m-0 break-all text-[19px] font-black leading-tight tracking-[0.06em] text-black"
              style={{ fontFamily: MONO_FONT, overflowWrap: "anywhere" }}
            >
              {refNo}
            </p>
            <p
              className="m-0 mt-0.5 text-[16px] text-[#333]"
              style={{ fontFamily: MONO_FONT }}
            >
              {stamp}
            </p>
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-3 content-start gap-x-4 overflow-hidden px-4 pt-1">
        {fields.map((f) => (
          <div
            key={f.label}
            className={`py-1 ${
              f.span === 3 ? "col-span-3" : f.span === 2 ? "col-span-2" : ""
            }`}
            style={{ borderBottom: "1px dashed #777" }}
          >
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[#444]">
              {f.label}
            </p>
            <p
              className="m-0 mt-0.5 break-words text-[15px] font-bold leading-snug text-black"
              style={{
                fontFamily: f.mono ? MONO_FONT : "inherit",
                overflowWrap: "anywhere",
                ...(f.clamp
                  ? {
                      display: "-webkit-box",
                      WebkitLineClamp: f.clamp,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }
                  : {}),
              }}
            >
              {f.value || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Signature strip: Prepared/Issued, Authorised, Received, Security */}
      <div className="relative z-10 mx-4 mt-2 grid shrink-0 grid-cols-4 gap-2">
        {signatureLabels.map((label, i) => (
          <SignatureBlock
            key={label}
            label={label}
            createdBy={createdBy}
            updatedBy={updatedBy}
            isCompleted={isCompleted}
            isFirst={i === 0}
          />
        ))}
      </div>

      {/* Dispatch details to be filled in by hand */}
      <div className="relative z-10 mx-4 mb-2 mt-2 grid shrink-0 grid-cols-3 gap-4">
        <WriteInField label="Date Sent" />
        <WriteInField label="Time" />
        <WriteInField label="Vehicle No" />
      </div>

      {/* Footer bar */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-1.5"
        style={{ borderTop: `2px solid ${INK}` }}
      >
        <p className="m-0 text-[11px] font-semibold text-black">{footerNote}</p>
        <p
          className="m-0 text-[10px] tracking-[0.1em] text-black"
          style={{ fontFamily: MONO_FONT }}
        >
          CONFIDENTIAL
        </p>
      </div>
    </div>
  );
}

// ─── A4 Portrait Sheet (Security copy on top, Customer copy below) ───────────

function GatePassSheet({
  printId,
  ...cardProps
}: GatePassBaseProps & { printId: string }) {
  usePrintStyle(printId);
  const stamp = React.useMemo(() => fmtStamp(), []);

  return (
    <div
      id={printId}
      className="gp-sheet relative bg-white"
      style={{
        width: "210mm",
        height: "297mm",
        boxSizing: "border-box",
        fontFamily: BASE_FONT,
      }}
    >
      {COPY_LABELS.map((label) => (
        <div
          key={label}
          style={{
            height: "148.5mm",
            padding: "5mm 8mm",
            boxSizing: "border-box",
          }}
        >
          <GatePassCard {...cardProps} stamp={stamp} copyLabel={label} />
        </div>
      ))}

      {/* Cut line between the two copies */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "148.5mm",
          borderTop: "1px dashed #555",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: -7,
            transform: "translateX(-50%)",
            background: "#fff",
            padding: "0 8px",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "#000",
          }}
        >
          ✂ CUT HERE
        </span>
      </div>
    </div>
  );
}

// ─── Preview: shows the whole A4 sheet, scaled to fit the dialog ─────────────

function SheetPreview({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(1, el.clientWidth / SHEET_W_PX) || 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div
        className="mx-auto overflow-hidden bg-white shadow-lg ring-1 ring-black/10"
        style={{ width: SHEET_W_PX * scale, height: SHEET_H_PX * scale }}
      >
        <div
          style={{
            width: "210mm",
            height: "297mm",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
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
      <p className="text-xs text-muted-foreground">
        Prints on A4 portrait · Security copy + Customer copy
      </p>
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
      <DialogContent className="flex max-h-[96dvh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-[95vw] [&>button]:hidden">
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
          <SheetPreview>
            <GatePassSheet
              printId={PRINT_ID}
              title="Gate Pass"
              location={asset.location ?? undefined}
              createdBy={createdBy}
              refNo={`AST-${asset.assetCode}`}
              footerNote="This pass must be presented at the security checkpoint."
              fields={fields}
            />
          </SheetPreview>
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
  loading?: boolean;
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
  loading,
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
    { label: "Asset Name / Model", value: resolvedAssetName, span: 2 },
    { label: "Issue Title", value: m.issueTitle, span: 3 },
    { label: "Description", value: m.description || "—", span: 3, clamp: 2 },
    { label: "Location", value: resolvedLocation },
    { label: "Reported Date", value: m.reportedDate },
    ...(isCompleted
      ? [{ label: "Completed Date", value: m.completedDate ?? fmtDate() }]
      : []),
  ];

  const PRINT_ID = "maintenance-gate-pass-print";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[96dvh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-[95vw] [&>button]:hidden">
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
            <SheetPreview>
              <GatePassSheet
                printId={PRINT_ID}
                title="Returnable Gate Pass"
                location={
                  resolvedLocation !== "—" ? resolvedLocation : undefined
                }
                createdBy={createdBy}
                updatedBy={updatedBy}
                refNo={m.ticketNo}
                footerNote="Present this pass when collecting the repaired asset."
                fields={fields}
                completedAt={completedAt}
                isCompleted={isCompleted}
              />
            </SheetPreview>
          )}
        </div>

        <GatePassFooter onClose={onClose} printId={PRINT_ID} />
      </DialogContent>
    </Dialog>
  );
}
