"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupervisorPasswordDialog } from "@/components/SupervisorPasswordDialog";
import { RefundDialog } from "@/components/RefundDialog";
import { Switch } from "@/components/ui/switch";

import { API_BASE_URL, AUTH_STORAGE_KEYS, PRINT_TERMINAL_ID, normalizeRole, resolvePrintTenantId } from "@/lib/apiConfig";
import { formatF4SpecificReceiptText } from "@/lib/receiptPrintFormat";
import { verifySessionPassword } from "@/lib/reauth";
import {
  getTefBridgeBaseUrl,
  tefAdminCommand,
  tefAdminRun,
  tefAdminTrace,
  tefHealth,
  tefRefund,
  tefServiceApplyStoreCode,
  tefServiceStart,
  tefServiceStatus,
  tefServiceStop,
  type TefServiceControlStatus,
} from "@/lib/tefBridge";

// Evidence capture
import { 
  createEvidenceSnapshot, 
  persistEvidenceSnapshot, 
  type EvidenceSnapshot,
  formatTimestampBR,
} from "@/lib/evidenceCapture";
import { EvidencePanel } from "@/components/EvidencePanel";

function makeSaleId(prefix: string) {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `${prefix}-${ts}`;
}

function normalizeStoreCodeInput(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function formatBrlFromCents(amountCents: number | null | undefined): string {
  const cents = Number(amountCents ?? 0);
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function formatDateTime(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function formatDayDateTime(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return formatDateTime(raw);
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return formatDateTime(raw);
  }
}

function displaySaleIdLabel(rawSaleId: string): string {
  const saleId = String(rawSaleId || "").trim();
  if (!saleId) return "Transação";
  const cleaned = saleId.replace(/^ETAPA\d+-/i, "");
  return cleaned || saleId;
}

function viaSortRank(rawVia: string): number {
  const via = String(rawVia || "").toLowerCase();
  if (via.includes("customer") || via.includes("cliente")) return 0;
  if (via.includes("merchant") || via.includes("estabelecimento")) return 1;
  return 9;
}

function formatViaLabel(rawVia: string): string {
  const via = String(rawVia || "").toLowerCase();
  if (via.includes("customer") || via.includes("cliente")) return "Via cliente";
  if (via.includes("merchant") || via.includes("estabelecimento")) return "Via estabelecimento";
  return String(rawVia || "Via");
}

function toBase64Utf8(text: string): string {
  // btoa only accepts Latin1. This keeps receipts safe with pt-BR accents.
  const utf8 = encodeURIComponent(text).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8);
}

function JsonPanel(props: { title: string; value: any; className?: string }) {
  const { title, value, className } = props;
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[#E8E2DA] bg-white p-5 ${className || ""}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">{title}</p>
        <span className="text-[11px] text-[#4A4A4A]/60">JSON</span>
      </div>
      <pre className="mt-3 max-h-[46vh] min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] p-4 text-xs text-gray-800">
        {JSON.stringify(value ?? null, null, 2)}
      </pre>
    </div>
  );
}

type LocalTx = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;
  nsuHost?: string;
  updatedAt?: string;
};

type ReprintSpecificTx = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;
  nsuHost: string | null;
  marketName?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  hasReceipt: boolean;
};

function normalizeLocalTx(input: any): LocalTx | null {
  if (!input || typeof input !== "object") return null;

  const saleId = String(input.saleId || "").trim();
  if (!saleId) return null;

  const amountRaw = Number(input.amountCents);
  const amountCents = Number.isFinite(amountRaw) ? amountRaw : 0;

  return {
    saleId,
    amountCents,
    type: String(input.type || ""),
    status: String(input.status || ""),
    nsuHost: input.nsuHost ? String(input.nsuHost) : undefined,
    updatedAt: input.updatedAt ? String(input.updatedAt) : undefined,
  };
}


type Shortcut = {
  keyLabel: string;
  signal: string;
  description: string;
};

type ReprintReceipt = {
  saleId: string;
  via: string;
  filename: string;
  bytes: number;
  text?: string;
  downloadUrl: string;
};

type CancelEvidence = {
  saleId: string;
  filename: string;
  bytes: number;
  downloadUrl: string;
};

type EvidenceZipResult = {
  ok: boolean;
  at: string;
  saleId: string;
  zipName: string;
  zipPath: string;
  bytes: number;
  downloadUrl: string;
  showInFolderUrl: string;
  exportsDir: string;
  missingCount?: number;
  error?: string;
};

type PendencyItem = {
  id: string;
  title: string;
  status: "ok" | "warn" | "error" | "running";
  details?: string;
  suggestedAction?: string;
};

type PendenciesSnapshot = {
  ok: boolean;
  at: string;
  pendingCount?: number;
  running?: boolean;
  status?: any;
  items?: PendencyItem[];
  evidence?: { filename: string; bytes: number; downloadUrl: string };
};

type QueueTrackResult =
  | { state: "printed" }
  | { state: "failed"; reason: string }
  | { state: "timeout" };

type ReprintReceiptFilter = "all" | "with_receipt" | "without_receipt";

function matchesReceiptFilter(row: ReprintSpecificTx, filter: ReprintReceiptFilter): boolean {
  if (filter === "with_receipt") return Boolean(row.hasReceipt);
  if (filter === "without_receipt") return !row.hasReceipt;
  return true;
}

export default function TefMenu110Page() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saleId, setSaleId] = useState<string>(() => makeSaleId("TEF110"));
  const [nsuHost, setNsuHost] = useState<string>("");
  const [storeCodeOverride, setStoreCodeOverride] = useState<string>("00000000");

  const [lastResult, setLastResult] = useState<any>(null);
  const [lastLocalTx, setLastLocalTx] = useState<LocalTx | null>(null);
  const [localTxSource, setLocalTxSource] = useState<"api" | "none">("none");
  const [lastReceipts, setLastReceipts] = useState<ReprintReceipt[]>([]);
  const [lastCancelEvidence, setLastCancelEvidence] = useState<CancelEvidence | null>(null);
  const [lastEvidenceZip, setLastEvidenceZip] = useState<EvidenceZipResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [storeCodeBusy, setStoreCodeBusy] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<TefServiceControlStatus | null>(null);
  const [serviceAuthOpen, setServiceAuthOpen] = useState(false);
  const [serviceAuthBusy, setServiceAuthBusy] = useState(false);
  const [pendingServiceToggle, setPendingServiceToggle] = useState<boolean | null>(null);
  const [serviceStartDetail, setServiceStartDetail] = useState<string>("");
  const [serviceStartStartedAt, setServiceStartStartedAt] = useState<number | null>(null);
  const [serviceStartElapsedSec, setServiceStartElapsedSec] = useState<number>(0);

  const [pendencies, setPendencies] = useState<PendenciesSnapshot | null>(null);
  const [pendenciesItems, setPendenciesItems] = useState<PendencyItem[]>([]);
  const [pendenciesEvidenceUrl, setPendenciesEvidenceUrl] = useState<string | null>(null);

  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorBusy, setSupervisorBusy] = useState(false);
  const [pendingShortcut, setPendingShortcut] = useState<Shortcut | null>(null);
  const [specificAuthOpen, setSpecificAuthOpen] = useState(false);
  const [specificAuthBusy, setSpecificAuthBusy] = useState(false);
  const [specificReprintOpen, setSpecificReprintOpen] = useState(false);
  const [specificReprintBusy, setSpecificReprintBusy] = useState(false);
  const [specificFilterPeriod, setSpecificFilterPeriod] = useState<"day" | "week" | "month" | "year" | "all">("all");
  const [specificFilterFrom, setSpecificFilterFrom] = useState("");
  const [specificFilterQuery, setSpecificFilterQuery] = useState("");
  const [specificFilterReceipt, setSpecificFilterReceipt] = useState<ReprintReceiptFilter>("all");
  const [specificRows, setSpecificRows] = useState<ReprintSpecificTx[]>([]);
  const [specificRowsBusy, setSpecificRowsBusy] = useState(false);
  const [specificRowsError, setSpecificRowsError] = useState<string | null>(null);
  const [specificSelectedSaleId, setSpecificSelectedSaleId] = useState("");
  const [specificAutoPrintOnSelect, setSpecificAutoPrintOnSelect] = useState(false);
  const [specificSelectedReceipts, setSpecificSelectedReceipts] = useState<ReprintReceipt[]>([]);
  const [specificSelectedBusy, setSpecificSelectedBusy] = useState(false);
  const [specificSelectedError, setSpecificSelectedError] = useState<string | null>(null);
  const [specificSingleViaBusy, setSpecificSingleViaBusy] = useState<string | null>(null);

  // Evidence capture state
  const [capturedEvidences, setCapturedEvidences] = useState<EvidenceSnapshot[]>([]);
  const [evidenceCaptureBusy, setEvidenceCaptureBusy] = useState(false);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);

  const tefBaseUrl = useMemo(() => getTefBridgeBaseUrl().replace(/\/$/, ""), []);
  const specificFilteredRows = useMemo(
    () => specificRows.filter((row) => matchesReceiptFilter(row, specificFilterReceipt)),
    [specificRows, specificFilterReceipt]
  );

  const startedForSaleIdRef = useRef<string | null>(null);
  const autoStartTriedRef = useRef(false);

  // Keep same access policy as Technician: Admin-only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = normalizeRole(window.localStorage.getItem(AUTH_STORAGE_KEYS.role));
    if (role !== "ADMINISTRACAO") {
      router.replace("/system");
    }
  }, [router]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.lvF4Scope = "menu-110";
    return () => {
      if (document.body.dataset.lvF4Scope === "menu-110") {
        delete document.body.dataset.lvF4Scope;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromStorage = normalizeStoreCodeInput(window.localStorage.getItem("tefStoreCodeOverride") || "");
    setStoreCodeOverride(fromStorage || "00000000");

    let cancelled = false;
    const loadStoreCodeFromApi = async () => {
      try {
        const resp = await fetch("/api/tef/service/store-code", {
          method: "GET",
          cache: "no-store",
        });
        const json = await resp.json().catch(() => null);
        const fromApi = normalizeStoreCodeInput(json?.storeCode || "");
        if (!cancelled && fromApi) {
          setStoreCodeOverride(fromApi);
          window.localStorage.setItem("tefStoreCodeOverride", fromApi);
        }
      } catch {
        // best-effort
      }
    };

    void loadStoreCodeFromApi();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyStoreCodeOverride = async () => {
    const normalized = normalizeStoreCodeInput(storeCodeOverride);
    if (normalized.length !== 8) {
      toast.error("IdLoja deve ter 8 caracteres (A-Z/0-9).");
      return;
    }
    if (storeCodeBusy || serviceBusy || busy) return;

    setStoreCodeBusy(true);
    setError(null);
    try {
      const out = await tefServiceApplyStoreCode(normalized, "");
      const errorCode = String(out?.error || "");
      if (!out.ok) {
        if (errorCode === "password_required" || errorCode === "invalid_password") {
          throw new Error("Senha de serviço requerida para aplicar IdLoja.");
        }
        throw new Error(errorCode || "Falha ao aplicar IdLoja no serviço SiTef.");
      }

      const appliedCode = normalizeStoreCodeInput(out.storeCode || normalized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tefStoreCodeOverride", appliedCode);
      }
      setStoreCodeOverride(appliedCode);
      if (out.service) {
        setServiceStatus(out.service);
      } else {
        await refreshServiceStatus();
      }
      toast.success(`IdLoja aplicado no bridge: ${appliedCode}`);
    } catch (e: any) {
      const msg = String(e?.message || "Falha ao aplicar IdLoja.");
      setError(msg);
      toast.error(msg);
    } finally {
      setStoreCodeBusy(false);
    }
  };

  const resetStoreCodeOverride = async () => {
    if (storeCodeBusy || serviceBusy || busy) return;

    setStoreCodeBusy(true);
    setError(null);
    try {
      const target = "00000000";
      const out = await tefServiceApplyStoreCode(target, "");
      const errorCode = String(out?.error || "");
      if (!out.ok) {
        if (errorCode === "password_required" || errorCode === "invalid_password") {
          throw new Error("Senha de serviço requerida para restaurar IdLoja.");
        }
        throw new Error(errorCode || "Falha ao restaurar IdLoja no serviço SiTef.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("tefStoreCodeOverride", target);
      }
      setStoreCodeOverride(target);
      if (out.service) {
        setServiceStatus(out.service);
      } else {
        await refreshServiceStatus();
      }
      toast.success("IdLoja restaurado para padrão: 00000000");
    } catch (e: any) {
      const msg = String(e?.message || "Falha ao restaurar IdLoja.");
      setError(msg);
      toast.error(msg);
    } finally {
      setStoreCodeBusy(false);
    }
  };

  // Reset "started" state when saleId changes.
  useEffect(() => {
    startedForSaleIdRef.current = null;
  }, [saleId]);

  function isTypingElement(el: Element | null): boolean {
    if (!el) return false;

    // Inputs/textarea/select: don't hijack F-keys while the operator is typing.
    if (el instanceof HTMLInputElement) return true;
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLSelectElement) return true;

    // Contenteditable (rare, but safe).
    const anyEl = el as HTMLElement;
    return Boolean(anyEl?.isContentEditable);
  }

  const refreshLocalTx = async () => {
    try {
      const resp = await fetch("/api/tef/transactions/last", { method: "GET" });
      const json = await resp.json().catch(() => null);
      if (resp.ok) {
        const tx = normalizeLocalTx(json?.transaction);
        if (tx) {
          setLastLocalTx(tx);
          setLocalTxSource("api");
          return;
        }
      }

      setLastLocalTx(null);
      setLocalTxSource("none");
    } catch {
      setLastLocalTx(null);
      setLocalTxSource("none");
    }
  };

  const fetchSpecificReprintRows = async (override?: {
    period?: "day" | "week" | "month" | "year" | "all";
    from?: string;
    query?: string;
    receipt?: ReprintReceiptFilter;
  }) => {
    setSpecificRowsBusy(true);
    setSpecificRowsError(null);
    try {
      const period = override?.period ?? specificFilterPeriod;
      const fromInput = override?.from ?? specificFilterFrom;
      const queryInput = override?.query ?? specificFilterQuery;
      const receiptInput = override?.receipt ?? specificFilterReceipt;

      const params = new URLSearchParams();
      params.set("period", period);
      params.set("receipt", receiptInput);
      params.set("limit", "240");

      const from = String(fromInput || "").trim();
      const query = String(queryInput || "").trim();

      if (from) params.set("from", from);
      if (query) params.set("q", query);

      const resp = await fetch(`/api/tef/reprint/transactions?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(String(json?.error || `Falha ao buscar transações (HTTP ${resp.status})`));
      }

      const rows = Array.isArray(json?.transactions) ? (json.transactions as ReprintSpecificTx[]) : [];
      setSpecificRows(rows);
      setSpecificSelectedSaleId((current) => {
        if (current && rows.some((row) => row.saleId === current)) return current;
        const filtered = rows.filter((row) => matchesReceiptFilter(row, specificFilterReceipt));
        return filtered[0]?.saleId || "";
      });
    } catch (e: any) {
      setSpecificRows([]);
      setSpecificRowsError(e?.message || "Falha ao buscar transações");
    } finally {
      setSpecificRowsBusy(false);
    }
  };

  useEffect(() => {
    setSpecificSelectedSaleId((current) => {
      if (current && specificFilteredRows.some((row) => row.saleId === current)) return current;
      return specificFilteredRows[0]?.saleId || "";
    });
  }, [specificFilteredRows]);

  const loadSpecificReceiptDetails = async (saleIdToInspect: string) => {
    const saleId = String(saleIdToInspect || "").trim();
    if (!saleId) {
      setSpecificSelectedReceipts([]);
      setSpecificSelectedError(null);
      return;
    }

    setSpecificSelectedBusy(true);
    setSpecificSelectedError(null);
    try {
      const resolveResp = await fetch("/api/tef/reprint/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          saleId,
          strictSaleId: true,
        }),
      });
      const resolveJson = await resolveResp.json().catch(() => null);
      if (!resolveResp.ok) {
        throw new Error(String(resolveJson?.error || `Falha ao consultar comprovantes (HTTP ${resolveResp.status})`));
      }
      const receipts: ReprintReceipt[] = Array.isArray(resolveJson?.receipts) ? resolveJson.receipts : [];
      setSpecificSelectedReceipts(receipts);
    } catch (e: any) {
      setSpecificSelectedReceipts([]);
      setSpecificSelectedError(String(e?.message || "Falha ao consultar comprovantes"));
    } finally {
      setSpecificSelectedBusy(false);
    }
  };

  const openSpecificReprintModal = () => {
    setSpecificReprintOpen(true);
    setSpecificFilterPeriod("all");
    setSpecificFilterFrom("");
    setSpecificFilterQuery("");
    setSpecificFilterReceipt("all");
    setSpecificSelectedSaleId("");
    setSpecificSelectedReceipts([]);
    void fetchSpecificReprintRows({
      period: "all",
      from: "",
      query: "",
      receipt: "all",
    });
  };

  const requestSpecificReprintWithAuth = () => {
    setSpecificAuthOpen(true);
  };

  const performSpecificReprintBySaleId = async (saleIdInput: string) => {
    const saleIdChosen = String(saleIdInput || "").trim();
    if (!saleIdChosen) {
      setSpecificRowsError("Selecione uma transação para reimprimir.");
      return;
    }

    setSpecificReprintBusy(true);
    setSpecificRowsError(null);
    setError(null);
    try {
      console.info("[F4 REPRINT MENU110] request", { saleId: saleIdChosen, strictSaleId: true });
      const resolveResp = await fetch("/api/tef/reprint/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          saleId: saleIdChosen,
          strictSaleId: true,
        }),
      });
      const resolveJson = await resolveResp.json().catch(() => null);
      if (!resolveResp.ok) {
        throw new Error(String(resolveJson?.error || `Falha na reimpressão específica (HTTP ${resolveResp.status})`));
      }

      const resolvedSaleId = String(resolveJson?.saleId || "").trim();
      if (resolvedSaleId && resolvedSaleId !== saleIdChosen) {
        throw new Error(
          `Divergência de reimpressão: solicitado ${saleIdChosen}, retornado ${resolvedSaleId}.`
        );
      }

      const receipts: ReprintReceipt[] = Array.isArray(resolveJson?.receipts) ? resolveJson.receipts : [];
      if (receipts.length === 0) {
        throw new Error("Sem comprovante salvo para a transação selecionada.");
      }

      let printedCount = 0;
      const queuedJobIds: string[] = [];
      for (const r of receipts) {
        if (!r?.text) continue;
        const queued = await enqueuePrintText({
          receiptText: formatF4SpecificReceiptText(String(r.text)),
          receiptType: "PAYMENT",
          metadata: {
            source: "Menu110",
            strategy: "specific",
            isReprint: true,
            isSpecificReprint: true,
            saleId: saleIdChosen,
            via: r.via,
            requestedAt: new Date().toISOString(),
          },
        });
        if (queued.jobId) queuedJobIds.push(String(queued.jobId));
        printedCount += 1;
      }

      if (printedCount <= 0) {
        throw new Error("Comprovante localizado, mas sem conteúdo disponível para impressão.");
      }

      setLastReceipts(receipts);
      setSaleId(saleIdChosen);
      const selected = specificRows.find((row) => row.saleId === saleIdChosen);
      setNsuHost(String(selected?.nsuHost || ""));

      setLastResult({
        ok: true,
        action: "Reimpressão específica",
        strategy: "local-specific",
        saleId: saleIdChosen,
        matchedBy: resolveJson?.matchedBy || "saleId",
        printedCount,
        filters: {
          period: specificFilterPeriod,
          from: specificFilterFrom || null,
          receipt: specificFilterReceipt,
          query: specificFilterQuery || null,
        },
        receipts: receipts.map((r) => ({
          via: r.via,
          filename: r.filename,
          downloadUrl: r.downloadUrl,
        })),
        at: new Date().toISOString(),
      });

      console.info("[F4 REPRINT MENU110] response", {
        requestedSaleId: saleIdChosen,
        resolvedSaleId: resolvedSaleId || saleIdChosen,
        matchedBy: String(resolveJson?.matchedBy || "saleId"),
        printedCount,
        terminalId: PRINT_TERMINAL_ID,
      });
      const tracking = await waitQueueTracking(queuedJobIds);
      if (tracking.state === "failed") {
        throw new Error(tracking.reason);
      }
      if (tracking.state === "timeout") {
        const msg = `Comprovante enfileirado, mas sem confirmação do agente no terminal ${PRINT_TERMINAL_ID}.`;
        setSpecificRowsError(msg);
        toast.warning(msg);
      } else {
        toast.success(`Reimpressão concluída (${printedCount} via) para ${displaySaleIdLabel(saleIdChosen)}.`);
      }
      
      // Auto-capture evidence for specific reprint (F4)
      await captureEvidenceSnapshot({
        sequence: 12,
        type: "reimpressao",
        action: "[F4] Reimpressão específica",
        description: `Reimpressão específica (Função 113/F4) de ${printedCount} via(s) - NSU: ${String(selected?.nsuHost || "sem NSU")}`,
        containerId: "tef-menu110-container",
      }).catch(e => console.warn("[Menu110] Evidence auto-capture failed:", e));

      void loadSpecificReceiptDetails(saleIdChosen);
      void refreshLocalTx();
    } catch (e: any) {
      const msg = e?.message || "Falha na reimpressão específica";
      console.error("[F4 REPRINT MENU110] error", { saleId: saleIdChosen, message: msg });
      setSpecificRowsError(msg);
      setLastResult({
        ok: false,
        action: "Reimpressão específica",
        saleId: saleIdChosen,
        error: msg,
        at: new Date().toISOString(),
      });
      toast.error(msg);
    } finally {
      setSpecificReprintBusy(false);
    }
  };

  const performSpecificReprint = async () => {
    await performSpecificReprintBySaleId(specificSelectedSaleId);
  };

  const handleSpecificSelectSale = async (row: ReprintSpecificTx) => {
    const saleIdChosen = String(row?.saleId || "").trim();
    if (!saleIdChosen) return;
    setSpecificSelectedSaleId(saleIdChosen);
    if (!specificAutoPrintOnSelect) return;
    if (!row.hasReceipt) {
      toast.error("Transação sem comprovante salvo para reimpressão.");
      return;
    }
    console.info("[F4 REPRINT MENU110] auto-print on selection", { saleId: saleIdChosen });
    await performSpecificReprintBySaleId(saleIdChosen);
  };

  const printSpecificSingleReceipt = async (receipt: ReprintReceipt) => {
    const saleIdChosen = String(specificSelectedSaleId || "").trim();
    if (!saleIdChosen) return;
    const text = String(receipt?.text || "").trim();
    if (!text) {
      toast.error("Via sem texto disponível para impressão.");
      return;
    }

    const busyKey = `${receipt.via}:${receipt.filename}`;
    setSpecificSingleViaBusy(busyKey);
    try {
      await enqueuePrintText({
        receiptText: formatF4SpecificReceiptText(text),
        receiptType: "PAYMENT",
        metadata: {
          source: "Menu110",
          strategy: "specific-single-via",
          isReprint: true,
          isSpecificReprint: true,
          saleId: saleIdChosen,
          via: receipt.via,
          filename: receipt.filename,
          requestedAt: new Date().toISOString(),
        },
      });
      toast.success(`${formatViaLabel(receipt.via)} enviada para fila (${PRINT_TERMINAL_ID}).`);
    } catch (e: any) {
      toast.error(String(e?.message || "Falha ao imprimir via selecionada."));
    } finally {
      setSpecificSingleViaBusy(null);
    }
  };

  const refreshServiceStatus = async (): Promise<TefServiceControlStatus> => {
    const status = await tefServiceStatus();
    setServiceStatus(status);
    return status;
  };


  const waitServiceRunning = async (timeoutMs: number): Promise<TefServiceControlStatus> => {
    const startedAt = Date.now();
    let latest = await refreshServiceStatus();
    if (latest.running) return latest;

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      latest = await refreshServiceStatus();
      if (latest.running) return latest;
    }
    return latest;
  };

  const toggleServicePower = async (turnOn: boolean, password: string) => {
    setServiceBusy(true);
    setError(null);
    try {
      const out = turnOn ? await tefServiceStart(password) : await tefServiceStop(password);
      setServiceStatus(out);
      const delayedStartup = turnOn && String(out?.error || "") === "sitef_start_timeout_waiting_health";
      if (!out.ok && !delayedStartup) {
        throw new Error(String(out.error || "Falha ao controlar serviço SiTef"));
      }
      if (delayedStartup) {
        toast.message("SiTef iniciando no host. Aguardando health...");
        const current = await waitServiceRunning(95_000);
        if (!current.running) {
          throw new Error("SiTef ainda offline após iniciar. Tente novamente e confira os logs do bridge.");
        }
        toast.success("SiTef ligado");
      } else {
        toast.success(turnOn ? "SiTef ligado" : "SiTef desligado");
      }
      setServiceAuthOpen(false);
      setPendingServiceToggle(null);
    } catch (e: any) {
      const msg = e?.message || "Falha ao controlar serviço SiTef";
      setError(msg);
      toast.error(msg);
    } finally {
      setServiceBusy(false);
    }
  };

  const requestToggleServicePower = (turnOn: boolean) => {
    if (serviceBusy || busy || serviceAuthBusy || serviceStatus?.supported === false) return;
    setPendingServiceToggle(turnOn);
    setServiceAuthOpen(true);
  };

  const quickStartBridge = async (statusSnapshot?: TefServiceControlStatus | null) => {
    const START_TIMEOUT_MS = 45_000;
    const currentStatus = statusSnapshot ?? serviceStatus;
    if (serviceBusy || busy || currentStatus?.supported === false) return;

    if (currentStatus?.running) {
      setServiceStartDetail("Bridge já está online.");
      setServiceStartStartedAt(null);
      toast.message("SiTef já está ligado.");
      void refreshServiceStatus();
      return;
    }

    setServiceBusy(true);
    setError(null);
    setServiceStartStartedAt(Date.now());
    setServiceStartDetail("Iniciando serviço SiTef...");
    try {
      setServiceStartDetail("Chamando integração de start (UI → serviço)...");
      const out = await Promise.race<TefServiceControlStatus>([
        tefServiceStart(""),
        new Promise<TefServiceControlStatus>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout_start_bridge_ui")), START_TIMEOUT_MS);
        }),
      ]);
      setServiceStatus(out);

      const errorCode = String(out?.error || "");
      const delayedStartup = errorCode === "sitef_start_timeout_waiting_health";
      const authRequired = errorCode === "password_required" || errorCode === "invalid_password";

      if (authRequired) {
        setServiceStartDetail("Aguardando senha de supervisor para continuar...");
        setPendingServiceToggle(true);
        setServiceAuthOpen(true);
        toast.message("Informe a senha para autorizar o start do SiTef.");
        return;
      }

      if (!out.ok && !delayedStartup) {
        throw new Error(String(out.error || "Falha ao ligar serviço SiTef"));
      }

      if (delayedStartup) {
        setServiceStartDetail("Serviço iniciou, aguardando health ficar online...");
        toast.message("SiTef iniciando no host. Aguardando health...");
        const current = await waitServiceRunning(95_000);
        if (!current.running) {
          throw new Error("SiTef ainda offline após iniciar. Tente novamente e confira os logs do bridge.");
        }
      }

      setServiceStartDetail("Bridge online e saudável.");
      setServiceStartStartedAt(null);
      toast.success("SiTef ligado");
    } catch (e: any) {
      const rawMsg = e?.message || "Falha ao ligar serviço SiTef";
      const msg = rawMsg === "timeout_start_bridge_ui"
        ? "Timeout ao ligar bridge (45s). Verifique logs e tente novamente."
        : rawMsg;
      setError(msg);
      setServiceStartDetail(msg);
      setServiceStartStartedAt(null);
      toast.error(msg);
    } finally {
      setServiceBusy(false);
      void refreshServiceStatus();
    }
  };

  const rememberLastTx = (partial: Partial<LocalTx>) => {
    // Source of truth for "Última Transação Local" is the TransactionStore file.
    // Avoid optimistic/local-cache updates here to prevent showing synthetic/mock data.
    void partial;
  };

  const fetchPendencies = async () => {
    setError(null);
    try {
      const resp = await fetch("/api/tef/pendencies/status", { method: "GET" });
      const json = (await resp.json().catch(() => null)) as any;
      if (!resp.ok) {
        throw new Error(String(json?.error || `Falha ao buscar pendências (HTTP ${resp.status})`));
      }

      const snap: PendenciesSnapshot = {
        ok: true,
        at: String(json?.at || new Date().toISOString()),
        pendingCount: typeof json?.pendingCount === "number" ? json.pendingCount : undefined,
        running: Boolean(json?.running),
        status: json?.status,
        items: Array.isArray(json?.items) ? json.items : [],
        evidence: json?.evidence,
      };

      setPendencies(snap);
      setPendenciesItems(snap.items ?? []);
      setPendenciesEvidenceUrl(String(json?.evidence?.downloadUrl || "/api/tef/pendencies/evidence"));

      toast.success("Pendências atualizadas");
    } catch (e: any) {
      const msg = e?.message || "Falha ao buscar pendências";
      setError(msg);
      toast.error("Falha ao buscar pendências");
    }
  };

  const runPendencies130 = async () => {
    setError(null);
    setBusy(true);
    try {
      const startedResp = await fetch("/api/tef/pendencies/run", { method: "POST" });
      const startedJson = await startedResp.json().catch(() => null);
      if (!startedResp.ok) {
        throw new Error(String(startedJson?.error || `Falha ao iniciar pendências (HTTP ${startedResp.status})`));
      }

      setPendenciesEvidenceUrl(String(startedJson?.evidence?.downloadUrl || "/api/tef/pendencies/evidence"));

      // Poll status until running=false (or timeout).
      const startedAt = Date.now();
      const timeoutMs = 90_000;
      while (Date.now() - startedAt < timeoutMs) {
        const sResp = await fetch("/api/tef/pendencies/status", { method: "GET" });
        const sJson = await sResp.json().catch(() => null);
        if (sResp.ok) {
          const snap: PendenciesSnapshot = {
            ok: true,
            at: String(sJson?.at || new Date().toISOString()),
            pendingCount: typeof sJson?.pendingCount === "number" ? sJson.pendingCount : undefined,
            running: Boolean(sJson?.running),
            status: sJson?.status,
            items: Array.isArray(sJson?.items) ? sJson.items : [],
            evidence: sJson?.evidence,
          };
          setPendencies(snap);
          setPendenciesItems(snap.items ?? []);
          setPendenciesEvidenceUrl(String(sJson?.evidence?.downloadUrl || "/api/tef/pendencies/evidence"));

          // If job finished, stop polling.
          if (!snap.running) break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      // Show result in the main JSON panel for audit.
      setLastResult({
        ok: true,
        action: "Pendências (130)",
        started: startedJson,
        snapshot: pendencies,
        at: new Date().toISOString(),
      });

      toast.success("Executado: Pendências (130) (ok)");
    } catch (e: any) {
      const msg = e?.message || "Falha ao tratar pendências";
      setError(msg);
      setLastResult({
        ok: false,
        action: "Pendências (130)",
        error: msg,
        at: new Date().toISOString(),
      });
      toast.error("Executado: Pendências (130) (erro)");
    } finally {
      setBusy(false);
      void refreshLocalTx();
    }
  };

  const generateEvidenceZip = async () => {
    setError(null);
    setBusy(true);
    try {
      const saleIdToUse = String(lastLocalTx?.saleId || saleId || '').trim();
      if (!saleIdToUse) {
        throw new Error('saleId indisponível (sem transação local e sem saleId informado)');
      }

      const resp = await fetch('/api/tef/evidence/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ saleId: saleIdToUse }),
      });
      const json = (await resp.json().catch(() => null)) as any;
      if (!resp.ok) {
        throw new Error(String(json?.error || `Falha ao gerar ZIP (HTTP ${resp.status})`));
      }

      const result: EvidenceZipResult = {
        ok: true,
        at: String(json?.at || new Date().toISOString()),
        saleId: String(json?.saleId || saleIdToUse),
        zipName: String(json?.zipName || ''),
        zipPath: String(json?.zipPath || ''),
        bytes: Number(json?.bytes || 0),
        downloadUrl: String(json?.downloadUrl || ''),
        showInFolderUrl: String(json?.showInFolderUrl || ''),
        exportsDir: String(json?.exportsDir || ''),
        missingCount: typeof json?.missingCount === 'number' ? json.missingCount : undefined,
      };

      setLastEvidenceZip(result);
      setLastResult(json);

      toast.success('Pacote de evidências gerado');
    } catch (e: any) {
      const msg = e?.message || 'Falha ao gerar pacote de evidências';
      setError(msg);
      setLastResult({ ok: false, action: 'Gerar pacote de evidências (ZIP)', error: msg, at: new Date().toISOString() });
      toast.error('Falha ao gerar pacote de evidências');
    } finally {
      setBusy(false);
      void refreshLocalTx();
    }
  };

  const showEvidenceZipInFolder = async () => {
    try {
      const url = lastEvidenceZip?.showInFolderUrl;
      if (!url) throw new Error('showInFolderUrl indisponível');
      const resp = await fetch(url, { method: 'POST' });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(String(json?.error || `Falha ao abrir pasta (HTTP ${resp.status})`));
      toast.success('Abrindo pasta do ZIP');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao abrir pasta');
    }
  };

  /**
   * Capture evidence snapshot: timestamp, screenshot, password state
   * Used for pre-homologacao compliance (roteiro validation)
   */
  const captureEvidenceSnapshot = async (options: {
    sequence?: number;
    type: "cancelar-prompt" | "senha-supervisor" | "reimpressao" | "voltar-prompt" | "menu-110-main";
    action: string;
    description: string;
    containerId?: string;
    passwordFieldSelector?: string;
  }) => {
    setEvidenceCaptureBusy(true);
    try {
      const snapshot = await createEvidenceSnapshot(
        options.type,
        options.action,
        options.description,
        {
          sequence: options.sequence,
          saleId: lastLocalTx?.saleId || saleId,
          nsuHost: lastLocalTx?.nsuHost || nsuHost,
          containerId: options.containerId,
          passwordFieldSelector: options.passwordFieldSelector,
          metadata: {
            timestamp: formatTimestampBR(),
            source: "Menu110",
            userRole: window.localStorage?.getItem("role"),
          },
        }
      );

      // Persist to backend
      const result = await persistEvidenceSnapshot(snapshot);
      
      if (result.ok) {
        setCapturedEvidences((prev) => [...prev, snapshot]);
        console.info("[Menu110] Evidence captured:", {
          type: options.type,
          fileId: result.fileId,
        });
        toast.success(`Evidência capturada: ${options.action}`);
      } else {
        throw new Error(result.error || "Falha ao persistir evidência");
      }
    } catch (error) {
      const msg = String(error instanceof Error ? error.message : error);
      console.error("[Menu110] Evidence capture failed:", msg);
      toast.error(`Falha ao capturar evidência: ${msg}`);
    } finally {
      setEvidenceCaptureBusy(false);
    }
  };

  useEffect(() => {
    void refreshLocalTx();
    void (async () => {
      const status = await refreshServiceStatus();
      if (autoStartTriedRef.current) return;
      autoStartTriedRef.current = true;
      if (status?.supported === false || status?.running) return;
      await quickStartBridge(status);
    })();

    const timer = window.setInterval(() => {
      void refreshServiceStatus();
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!specificReprintOpen) return;
    if (!specificSelectedSaleId) {
      setSpecificSelectedReceipts([]);
      setSpecificSelectedError(null);
      return;
    }
    void loadSpecificReceiptDetails(specificSelectedSaleId);
  }, [specificReprintOpen, specificSelectedSaleId]);

  useEffect(() => {
    if (!serviceBusy || !serviceStartStartedAt) {
      setServiceStartElapsedSec(0);
      return;
    }

    const tick = () => {
      setServiceStartElapsedSec(Math.max(1, Math.floor((Date.now() - serviceStartStartedAt) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [serviceBusy, serviceStartStartedAt]);

  const ensureMenu110Started = async () => {
    const sid = saleId.trim();
    if (!sid) throw new Error("saleId é obrigatório");

    if (startedForSaleIdRef.current === sid) return;

    const out = await tefAdminRun({ saleId: sid, command: 110 });
    if (out?.ok === false) {
      const msg = String(out?.messages?.[0] || out?.raw?.error || out?.error || "Falha ao iniciar Menu 110");
      throw new Error(msg);
    }
    startedForSaleIdRef.current = sid;
    return out;
  };

  const requiresSupervisor = (shortcut: Shortcut): boolean => {
    // Critical actions
    return shortcut.keyLabel === "F3";
  };

  const sendSupervisorPasswordBestEffort = async (saleId: string, password: string): Promise<boolean> => {
    // Requirement: never log password, never include it in result.
    // Prefer same-origin API so we don't risk accidental client-side logging.
    try {
      const resp = await fetch("/api/tef/supervisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ saleId, password }),
      });

      // If route doesn't exist in some deployment, don't hard-fail.
      if (resp.status === 404) return false;
      if (!resp.ok) return false;
      return true;
    } catch {
      return false;
    }
  };

  const enqueuePrintText = async (input: {
    receiptText: string;
    receiptType: string;
    metadata: Record<string, unknown>;
  }) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_STORAGE_KEYS.token) : null;
    const tenantId = resolvePrintTenantId(token);

    const res = await fetch(`${API_BASE_URL}/api/print-queue/enqueue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        terminalId: PRINT_TERMINAL_ID,
        tenantId,
        receiptType: input.receiptType,
        payload: toBase64Utf8(input.receiptText),
        priority: 0,
        metadata: JSON.stringify(input.metadata),
      }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = data?.error || data?.message || `Falha ao enfileirar impressão (HTTP ${res.status})`;
      throw new Error(String(msg));
    }
    return {
      ...(data || {}),
      jobId: String(data?.id || "").trim(),
    };
  };

  const waitQueueTracking = async (jobIds: string[], timeoutMs: number = 30000): Promise<QueueTrackResult> => {
    const ids = jobIds.map((id) => String(id || "").trim()).filter(Boolean);
    if (ids.length === 0) return { state: "timeout" };

    const deadline = Date.now() + Math.max(2000, timeoutMs);
    while (Date.now() < deadline) {
      let allPrinted = true;
      for (const id of ids) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/print-queue/${encodeURIComponent(id)}`, {
            method: "GET",
            cache: "no-store",
          });
          if (!res.ok) {
            allPrinted = false;
            continue;
          }
          const json = await res.json().catch(() => null);
          const status = String(json?.status || "").trim().toUpperCase();
          if (status === "FAILED") {
            return {
              state: "failed",
              reason: String(json?.error || "Falha de impressão no agente local."),
            };
          }
          if (status !== "PRINTED") {
            allPrinted = false;
          }
        } catch {
          // Best effort monitor only.
          allPrinted = false;
        }
      }
      if (allPrinted) return { state: "printed" };
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
    return { state: "timeout" };
  };

  function extractReceiptsFromTrace(trace: any): Array<{ via: string; text: string }> {
    const segs = Array.isArray(trace?.segments)
      ? trace.segments
      : Array.isArray(trace?.result?.segments)
        ? trace.result.segments
        : [];

    const receiptLines: string[] = [];
    for (const s of segs) {
      if (s && s.isReceipt) {
        const t = typeof s.text === "string" ? s.text : "";
        if (t) receiptLines.push(t);
      }
    }

    const full = receiptLines.join("\n").trim();
    if (!full) return [];

    // Best-effort split by "VIA CLIENTE" / "VIA ESTABELECIMENTO" when present.
    const buckets: Record<string, string[]> = {};
    let currentVia = "tef";

    for (const line of full.split(/\r?\n/)) {
      if (/\bVIA\s+CLIENTE\b/i.test(line)) currentVia = "cliente";
      if (/\bVIA\s+ESTAB/i.test(line) || /\bESTABELEC/i.test(line)) currentVia = "estabelecimento";

      if (!buckets[currentVia]) buckets[currentVia] = [];
      buckets[currentVia].push(line);
    }

    const out: Array<{ via: string; text: string }> = [];
    for (const [via, lines] of Object.entries(buckets)) {
      const text = lines.join("\n").trim();
      if (text) out.push({ via, text });
    }

    // Prefer cliente first.
    const rank = (via: string) => {
      const v = via.toLowerCase();
      if (v.includes("cliente")) return 1;
      if (v.includes("estabele")) return 2;
      return 9;
    };
    out.sort((a, b) => rank(a.via) - rank(b.via));
    return out;
  }

  const performReprintF2 = async (opts?: { supervisorPassword?: string }) => {
    const sidInput = saleId.trim();
    const sidFallback = String(lastLocalTx?.saleId || "").trim();
    const sid = sidInput || sidFallback || makeSaleId("TEF110");
    const nsu = nsuHost.trim();

    const supervisorAuth = Boolean(opts?.supervisorPassword);
    const actionLabel = "[F2] Reimpressão";

    setError(null);
    setBusy(true);

    try {
      // Evidence + local-first resolve (best-effort; in Docker this can fail due path mapping).
      let resolveJson: any = null;
      let resolveError: string | null = null;
      try {
        const resolveResp = await fetch("/api/tef/reprint/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ saleId: sid, nsuHost: nsu || undefined }),
        });

        resolveJson = await resolveResp.json().catch(() => null);
        if (!resolveResp.ok) {
          resolveError = String(resolveJson?.error || `resolve_http_${resolveResp.status}`);
          resolveJson = null;
        }
      } catch (e: any) {
        resolveError = String(e?.message || "resolve_failed");
      }

      const saleIdResolved = String(resolveJson?.saleId || sid || "").trim();
      const receipts: ReprintReceipt[] = Array.isArray(resolveJson?.receipts) ? resolveJson.receipts : [];

      // If we have local receipts, print them and we are done.
      if (receipts.length > 0) {
        setLastReceipts(receipts);
        rememberLastTx({
          saleId: saleIdResolved || sid,
          status: "APPROVED",
          type: lastLocalTx?.type || "REPRINT",
          nsuHost: nsu || lastLocalTx?.nsuHost,
        });

        const printResults: any[] = [];
        for (const r of receipts) {
          if (!r?.text) continue;
          const pr = await enqueuePrintText({
            receiptText: String(r.text),
            receiptType: "PAYMENT",
            metadata: {
              source: "Menu110",
              strategy: "local",
              isReprint: true,
              saleId: saleIdResolved,
              nsuHost: nsu || undefined,
              via: r.via,
              supervisorAuth: supervisorAuth ? true : undefined,
              requestedAt: new Date().toISOString(),
            },
          });
          printResults.push({ via: r.via, result: pr });
        }

        const out = {
          ok: true,
          action: "Reimpressão",
            strategy: "local",
            saleId: saleIdResolved,
            matchedBy: resolveJson?.matchedBy || undefined,
            supervisorAuth: supervisorAuth ? true : undefined,
            receipts: receipts.map((r) => ({ via: r.via, filename: r.filename, downloadUrl: r.downloadUrl })),
            printResults,
          at: new Date().toISOString(),
        };
        setLastResult(out);
        toast.success(`Executado: ${actionLabel} (ok)`);
        return;
      }

      // No local receipts -> prefer native bridge reprint action.
      let bridgeReprintError: string | null = null;
      try {
        const bridgeResp = await fetch(`${tefBaseUrl}/tef/admin/run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ saleId: saleIdResolved || sid, action: "REPRINT_LAST", amount: 0 }),
        });
        const bridgeJson = await bridgeResp.json().catch(() => null);

        if (bridgeResp.ok) {
          rememberLastTx({
            saleId: saleIdResolved || sid,
            status: "APPROVED",
            type: lastLocalTx?.type || "REPRINT",
            nsuHost: nsu || lastLocalTx?.nsuHost,
          });
          const out = {
            ok: true,
            action: "Reimpressão",
            strategy: "bridge-action",
            saleId: saleIdResolved || sid,
            matchedBy: resolveJson?.matchedBy || undefined,
            supervisorAuth: supervisorAuth ? true : undefined,
            bridge: bridgeJson,
            resolveError: resolveError || undefined,
            at: new Date().toISOString(),
          };
          setLastResult(out);
          toast.success(`Executado: ${actionLabel} (ok)`);
          return;
        }

        bridgeReprintError = String(bridgeJson?.error || bridgeJson?.message || `HTTP ${bridgeResp.status}`);
      } catch (e: any) {
        bridgeReprintError = String(e?.message || "bridge_reprint_failed");
      }

      // Fallback: attempt TEF-driven reprint via trace capture.
      if (supervisorAuth) {
        await sendSupervisorPasswordBestEffort(saleIdResolved || sid, String(opts?.supervisorPassword || ""));
      }

      await ensureMenu110Started();
      // Bridge admin UI contract: menu selections are numeric strings ("1","2"...).
      const sentReprint = await tefAdminCommand(saleIdResolved || sid, "2");
      if (sentReprint?.ok === false) {
        throw new Error(String(sentReprint?.error || "Sem transação em andamento para reimpressão."));
      }
      const trace = await tefAdminTrace(saleIdResolved || sid).catch(() => null);

      const extracted = extractReceiptsFromTrace(trace);
      if (extracted.length === 0) {
        const out = {
          ok: false,
          action: "Reimpressão",
          strategy: "tef-trace",
          saleId: saleIdResolved || sid,
          supervisorAuth: supervisorAuth ? true : undefined,
          error: "Nenhum comprovante encontrado no trace.",
          bridgeReprintError: bridgeReprintError || undefined,
          resolveError: resolveError || undefined,
          trace,
          at: new Date().toISOString(),
        };
        setLastResult(out);
        toast.error(`Executado: ${actionLabel} (erro)`);
        return;
      }

      // Save receipts to LOCALAPPDATA receipts/ and print via PrintAgent.
      const saved: ReprintReceipt[] = [];
      const printResults: any[] = [];

      for (const r of extracted) {
        const via = `reprint-${r.via}`;
        const saveResp = await fetch("/api/tef/receipts/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ saleId: saleIdResolved || sid, via, text: r.text }),
        });
        const saveJson = await saveResp.json().catch(() => null);
        if (saveResp.ok && saveJson?.downloadUrl) {
          saved.push({
            saleId: saleIdResolved || sid,
            via,
            filename: String(saveJson.filename || ""),
            bytes: Number(saveJson.bytes || 0) || r.text.length,
            text: undefined,
            downloadUrl: String(saveJson.downloadUrl),
          });
        }

        const pr = await enqueuePrintText({
          receiptText: r.text,
          receiptType: "PAYMENT",
          metadata: {
            source: "Menu110",
            strategy: "tef-trace",
            isReprint: true,
            saleId: saleIdResolved || sid,
            nsuHost: nsu || undefined,
            via,
            supervisorAuth: supervisorAuth ? true : undefined,
            requestedAt: new Date().toISOString(),
          },
        });
        printResults.push({ via, result: pr });
      }

      setLastReceipts(saved);
      rememberLastTx({
        saleId: saleIdResolved || sid,
        status: "APPROVED",
        type: lastLocalTx?.type || "REPRINT",
        nsuHost: nsu || lastLocalTx?.nsuHost,
      });

      const out = {
        ok: true,
        action: "Reimpressão",
        strategy: "tef-trace",
        saleId: saleIdResolved || sid,
        matchedBy: resolveJson?.matchedBy || undefined,
        supervisorAuth: supervisorAuth ? true : undefined,
        resolveError: resolveError || undefined,
        savedReceipts: saved.map((r) => ({ via: r.via, filename: r.filename, downloadUrl: r.downloadUrl })),
        printResults,
        trace,
        at: new Date().toISOString(),
      };
      setLastResult(out);
      toast.success(`Executado: ${actionLabel} (ok)`);
    } catch (e: any) {
      const msg = e?.message || "Falha na reimpressão";
      const out = {
        ok: false,
        action: "Reimpressão",
        error: msg,
        supervisorAuth: opts?.supervisorPassword ? true : undefined,
        at: new Date().toISOString(),
      };
      setLastResult(out);
      setError(msg);
      toast.error(`Executado: ${actionLabel} (erro)`);
    } finally {
      setBusy(false);
      void refreshLocalTx();
    }
  };

  const performCancelF3 = async (opts?: { supervisorPassword?: string }) => {
    const sid = saleId.trim();
    const nsu = nsuHost.trim();
    if (!sid && !nsu) throw new Error("Informe saleId ou NSU Host para cancelamento.");

    const password = String(opts?.supervisorPassword || "");
    if (!password) throw new Error("Senha do supervisor é obrigatória.");

    const actionLabel = "[F3] Cancelamento";

    setError(null);
    setBusy(true);
    setLastCancelEvidence(null);

    try {
      // Prefer cancel by NSU Host (server resolves saleId by TransactionStore).
      // If NSU is absent, we require explicit confirmation to cancel last APPROVED tx for this saleId.

      const attempt = async (confirmLastApproved: boolean) => {
        const resp = await fetch("/api/tef/cancel", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            saleId: sid,
            nsuHost: nsu || undefined,
            supervisorPassword: password,
            confirmLastApproved,
          }),
        });

        const json = await resp.json().catch(() => null);
        return { resp, json };
      };

      let { resp, json } = await attempt(false);

      if (!resp.ok) {
        // If confirm required, ask the operator and retry.
        if (resp.status === 409 && String(json?.error || "") === "confirm_required_without_nsuHost") {
          const msg =
            String(json?.message || "").trim() ||
            `NSU Host não informado. Cancelar a última transação aprovada do saleId ${sid}?`;

          const confirmed = typeof window !== "undefined" ? window.confirm(msg) : false;
          if (!confirmed) {
            const out = {
              ok: false,
              action: "Cancelamento",
              canceledByUser: true,
              saleId: sid,
              at: new Date().toISOString(),
            };
            setLastResult(out);
            toast.error(`Executado: ${actionLabel} (cancelado)`);
            return;
          }

          ({ resp, json } = await attempt(true));
        }
      }

      if (!resp.ok) {
        throw new Error(String(json?.error || json?.message || `Falha no cancelamento (HTTP ${resp.status})`));
      }

      const evidence = json?.evidence as any;
      if (evidence?.downloadUrl) {
        setLastCancelEvidence({
          saleId: String(json?.saleId || sid || ""),
          filename: String(evidence.filename || ""),
          bytes: Number(evidence.bytes || 0) || 0,
          downloadUrl: String(evidence.downloadUrl),
        });
      }

      // Cancelation is a distinct operation; avoid leaving old receipt links around.
      setLastReceipts([]);

      const out = {
        ok: true,
        action: "Cancelamento",
        matchedBy: json?.matchedBy,
        saleId: json?.saleId || sid,
        nsuHost: nsu || undefined,
        supervisorAuth: true,
        transaction: json?.transaction,
        evidence: json?.evidence,
        bridge: json?.bridge,
        at: new Date().toISOString(),
      };

      rememberLastTx({
        saleId: String(json?.saleId || sid || ""),
        status: "CANCELED",
        type: String(json?.transaction?.type || lastLocalTx?.type || "TEF"),
        nsuHost: nsu || lastLocalTx?.nsuHost,
      });

      setLastResult(out);
      toast.success(`Executado: ${actionLabel} (ok)`);
    } catch (e: any) {
      const msg = e?.message || "Falha no cancelamento";
      const out = {
        ok: false,
        action: "Cancelamento",
        saleId: sid,
        nsuHost: nsu || undefined,
        supervisorAuth: true,
        error: msg,
        at: new Date().toISOString(),
      };
      setLastResult(out);
      setError(msg);
      toast.error(`Executado: ${actionLabel} (erro)`);
    } finally {
      setBusy(false);
      void refreshLocalTx();
    }
  };

  const executeShortcut = async (shortcut: Shortcut, opts?: { supervisorPassword?: string }) => {
    const sid = saleId.trim();
    const nsu = nsuHost.trim();
    if (!sid && shortcut.keyLabel !== "F2" && !(shortcut.keyLabel === "F3" && nsu)) return;

    const actionLabel = `[${shortcut.keyLabel}] ${shortcut.description}`;

    setError(null);
    setBusy(true);
    try {
      const supervisorAuth = Boolean(opts?.supervisorPassword);

      // Special case: F2 reprint should work even without full TEF support.
      if (shortcut.keyLabel === "F2") {
        setBusy(false);
        await performReprintF2(opts);
        return;
      }

      // Special case: F3 cancel should be audited and update local TransactionStore.
      if (shortcut.keyLabel === "F3") {
        setBusy(false);
        await performCancelF3(opts);
        return;
      }

      if (supervisorAuth) {
        // Best-effort: if bridge supports receiving password, deliver it.
        // We do not block execution if delivery fails (some flows may still request it interactively).
        await sendSupervisorPasswordBestEffort(sid, String(opts?.supervisorPassword || ""));
      }

      // 1) Health check is cheap and gives quick feedback.
      const health = await tefHealth().catch((e: any) => ({ ok: false, error: e?.message || String(e) }));
      if (!health?.ok) {
        throw new Error(String(health?.error || "Bridge TEF indisponível"));
      }

      // 2) Start menu 110 (idempotent in our UI state).
      const started = await ensureMenu110Started();

      // 3) Send the key/command.
      const sent = await tefAdminCommand(sid, shortcut.signal);
      if (sent?.ok === false) {
        throw new Error(String(sent?.error || "Ação rejeitada pelo TEF (sem transação em andamento)."));
      }

      // 4) Pull trace for audit visibility (best-effort).
      const trace = await tefAdminTrace(sid).catch(() => null);

      const out = {
        ok: true,
        action: `Menu 110 • ${shortcut.keyLabel}`,
        description: shortcut.description,
        saleId: sid,
        nsuHost: nsuHost.trim() || undefined,
        supervisorAuth: supervisorAuth ? true : undefined,
        health,
        started,
        sent,
        trace,
        at: new Date().toISOString(),
      };

      rememberLastTx({
        saleId: sid,
        status: "PENDING",
        type: lastLocalTx?.type || "ADMIN-110",
        nsuHost: nsu || lastLocalTx?.nsuHost,
      });

      setLastResult(out);
      toast.success(`Executado: ${actionLabel} (ok)`);

      // Auto-capture evidence for critical operations
      if (shortcut.keyLabel === "F2") {
        await captureEvidenceSnapshot({
          sequence: 11,
          type: "reimpressao",
          action: actionLabel,
          description: "Reimpressão do último comprovante (F2) - Automático",
          containerId: "tef-menu110-container",
        }).catch(e => console.warn("[Menu110] Evidence auto-capture failed:", e));
      } else if (shortcut.keyLabel === "F3") {
        await captureEvidenceSnapshot({
          sequence: 9,
          type: "cancelar-prompt",
          action: actionLabel,
          description: "Cancelamento executado (F3) - Automático",
          containerId: "tef-menu110-container",
        }).catch(e => console.warn("[Menu110] Evidence auto-capture failed:", e));
      }
    } catch (e: any) {
      const msg = e?.message || "Falha ao executar ação";
      const out = {
        ok: false,
        action: `Menu 110 • ${shortcut.keyLabel}`,
        description: shortcut.description,
        saleId: sid,
        nsuHost: nsuHost.trim() || undefined,
        supervisorAuth: opts?.supervisorPassword ? true : undefined,
        error: msg,
        at: new Date().toISOString(),
      };
      setLastResult(out);
      setError(msg);
      toast.error(`Executado: ${actionLabel} (erro)`);
    } finally {
      setBusy(false);
      // Keep local panel fresh after any TEF interaction.
      void refreshLocalTx();
    }
  };

  const runShortcut = async (shortcut: Shortcut) => {
    if (shortcut.keyLabel === "F4") {
      requestSpecificReprintWithAuth();
      return;
    }

    if (shortcut.keyLabel === "F5") {
      handleRefundRequest();
      return;
    }

    if (requiresSupervisor(shortcut)) {
      setPendingShortcut(shortcut);
      setSupervisorOpen(true);
      return;
    }

    await executeShortcut(shortcut);
  };

  const handleRefundRequest = () => {
    setRefundDialogOpen(true);
  };

  const handleRefundConfirm = async (originalSaleId: string): Promise<{ refundSaleId: string }> => {
    setRefundBusy(true);
    try {
      const refundSaleId = makeSaleId("REFUND");
      const operatorId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

      const result = await tefRefund({
        saleId: refundSaleId,
        originalSaleId,
        operatorId: operatorId || undefined,
      });

      if (result?.ok === false) {
        throw new Error(String(result?.error || "Falha ao iniciar devolução"));
      }

      setLastResult({
        ok: true,
        action: "Devolução (Refund)",
        saleId: refundSaleId,
        originalSaleId,
        result,
        at: new Date().toISOString(),
      });

      rememberLastTx({
        saleId: refundSaleId,
        status: "PENDING",
        type: "REFUND",
        nsuHost: lastLocalTx?.nsuHost,
      });

      toast.success(`Devolução iniciada: ${refundSaleId}`);

      // Evidence capture for refund (Seq 10-12)
      void captureEvidenceSnapshot({
        sequence: 10,
        type: "cancelar-prompt",
        action: "Devolução TEF",
        description: `Devolução da transação ${originalSaleId}`,
        containerId: "tef-menu110-container",
      }).catch((e) => console.warn("[Menu110] Evidence auto-capture failed:", e));
      return { refundSaleId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastResult({
        ok: false,
        action: "Devolução (Refund)",
        originalSaleId,
        error: msg,
        at: new Date().toISOString(),
      });
      setError(msg);
      toast.error(`Erro ao iniciar devolução: ${msg}`);
      throw e;
    } finally {
      setRefundBusy(false);
      void refreshLocalTx();
    }
  };

  // Keyboard shortcuts: F1..F7, ESC.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = String(e.key || "");
      const upper = key.toUpperCase();

      // ESC always returns (even if focused in inputs).
      if (upper === "ESCAPE") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        if (specificReprintOpen) {
          setSpecificReprintOpen(false);
          return;
        }
        if (specificAuthOpen) {
          setSpecificAuthOpen(false);
          return;
        }
        if (serviceAuthOpen) {
          setServiceAuthOpen(false);
          return;
        }
        if (supervisorOpen) {
          setSupervisorOpen(false);
          return;
        }
        router.push("/system");
        return;
      }

      // If a modal is open, ignore the rest (ESC already handled above).
      if (supervisorOpen || serviceAuthOpen || specificAuthOpen || specificReprintOpen) return;

      // Do not capture F-keys while user is typing in any input.
      if (isTypingElement(document.activeElement)) return;

      // Avoid accidental repeat triggers when key is held down.
      if (e.repeat) return;

      if (busy) return;

      const map: Record<string, { keyLabel: string; signal: string; description: string }> = {
        F1: { keyLabel: "F1", signal: "1", description: "Testar conexão" },
        F2: { keyLabel: "F2", signal: "2", description: "Reimpressão" },
        F3: { keyLabel: "F3", signal: "3", description: "Cancelamento" },
        F4: { keyLabel: "F4", signal: "4", description: "Reimpressão específica" },
        F5: { keyLabel: "F5", signal: "7", description: "Devolução" },
        F6: { keyLabel: "F6", signal: "6", description: "Atualizar cadastro do terminal" },
        F7: { keyLabel: "F7", signal: "5", description: "Enviar diagnóstico" },
      };

      const hit = map[upper];
      if (!hit) return;

      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      void runShortcut(hit);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, nsuHost, router, saleId, serviceAuthOpen, specificAuthOpen, specificReprintOpen, supervisorOpen]);

  const shortcuts: Shortcut[] = [
    { keyLabel: "F1", signal: "1", description: "Testar conexão" },
    { keyLabel: "F2", signal: "2", description: "Reimpressão" },
    { keyLabel: "F3", signal: "3", description: "Cancelamento" },
    { keyLabel: "F4", signal: "4", description: "Reimpressão específica" },
    { keyLabel: "F5", signal: "7", description: "Devolução" },
    { keyLabel: "F6", signal: "6", description: "Atualizar cadastro do terminal" },
    { keyLabel: "F7", signal: "5", description: "Enviar diagnóstico" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F3EF]">
      <SupervisorPasswordDialog
        open={supervisorOpen}
        onOpenChange={(open) => {
          setSupervisorOpen(open);
          if (!open) {
            setPendingShortcut(null);
            setSupervisorBusy(false);
          }
        }}
        busy={supervisorBusy}
        actionLabel={pendingShortcut?.description || "ação crítica"}
        onConfirm={async (password) => {
          const shortcut = pendingShortcut;
          if (!shortcut) return;

          // Close modal first to keep UX responsive.
          setSupervisorBusy(true);
          setSupervisorOpen(false);

          try {
            // Auto-capture evidence of password field (masked only, never plain text)
            await captureEvidenceSnapshot({
              sequence: 9,
              type: "senha-supervisor",
              action: "Senha supervisor digitada (TipoCampo 500)",
              description: "Campo de senha mascarado para segurança",
              containerId: "tef-menu110-container",
              passwordFieldSelector: "input[type='password']",
            }).catch(e => console.warn("[Menu110] Evidence auto-capture failed:", e));

            await executeShortcut(shortcut, { supervisorPassword: password });
          } finally {
            // Ensure we don't keep references.
            setPendingShortcut(null);
            setSupervisorBusy(false);
          }
        }}
      />
      <SupervisorPasswordDialog
        open={serviceAuthOpen}
        onOpenChange={(open) => {
          setServiceAuthOpen(open);
          if (!open) {
            setPendingServiceToggle(null);
            setServiceAuthBusy(false);
          }
        }}
        busy={serviceAuthBusy || serviceBusy}
        actionLabel={pendingServiceToggle ? "ligar serviço SiTef" : "desligar serviço SiTef"}
        onConfirm={async (password) => {
          if (pendingServiceToggle === null) return;
          setServiceAuthBusy(true);
          try {
            await toggleServicePower(Boolean(pendingServiceToggle), password);
          } catch (e: any) {
            toast.error(String(e?.message || "Falha ao controlar serviço SiTef."));
          } finally {
            setServiceAuthBusy(false);
          }
        }}
      />
      <SupervisorPasswordDialog
        open={specificAuthOpen}
        onOpenChange={(open) => {
          setSpecificAuthOpen(open);
          if (!open) {
            setSpecificAuthBusy(false);
          }
        }}
        busy={specificAuthBusy}
        actionLabel="Reimpressão específica (F4)"
        onConfirm={async (password) => {
          setSpecificAuthBusy(true);
          try {
            await verifySessionPassword(password);
            setSpecificAuthOpen(false);
            openSpecificReprintModal();
          } catch (e: any) {
            toast.error(String(e?.message || "Senha inválida."));
          } finally {
            setSpecificAuthBusy(false);
          }
        }}
      />
      {/* Refund Dialog */}
      <RefundDialog
        isOpen={refundDialogOpen}
        onClose={() => setRefundDialogOpen(false)}
        onConfirm={handleRefundConfirm}
        onSendSupervisorPassword={sendSupervisorPasswordBestEffort}
        transactionSaleId={lastLocalTx?.saleId}
        transactionAmount={lastLocalTx?.amountCents}
      />

      <Dialog
        open={specificReprintOpen}
        onOpenChange={(open) => {
          setSpecificReprintOpen(open);
          if (!open) {
            setSpecificReprintBusy(false);
            setSpecificRowsError(null);
            setSpecificSelectedReceipts([]);
            setSpecificSelectedError(null);
            setSpecificSingleViaBusy(null);
          }
        }}
      >
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] !h-[100dvh] !w-[100vw] !max-w-none overflow-hidden rounded-none border border-[#E8E2DA] bg-[#F8F6F1] p-0 text-[#2F2F2F] sm:!h-[98dvh] sm:!w-[99vw] sm:rounded-[28px]">
          <DialogHeader className="border-b border-[#E8E2DA] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl text-[#3B2B22]">Reimpressão específica</DialogTitle>
                <DialogDescription className="mt-1 text-[#4A4A4A]/75">
                  Busca por período, data inicial e filtros. Selecione uma transação para visualizar e imprimir a nota da impressora.
                </DialogDescription>
              </div>
              <div className="rounded-xl border border-[#E8E2DA] bg-white px-3 py-2 text-right text-xs text-[#4A4A4A]/80">
                <div>{specificFilteredRows.length} transações listadas</div>
                <div>{specificSelectedSaleId ? "1 selecionada" : "nenhuma selecionada"}</div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  { id: "all", label: "Tudo" },
                  { id: "day", label: "Dia" },
                  { id: "week", label: "Semana" },
                  { id: "month", label: "Mês" },
                  { id: "year", label: "Ano" },
                ].map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSpecificFilterPeriod(period.id as "day" | "week" | "month" | "year" | "all")}
                    className={`inline-flex h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                      specificFilterPeriod === period.id
                        ? "border-[#D3A67F] bg-[#F4E7DB] text-[#7C4C30]"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-[#FBFAF8]"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  { id: "all", label: "Todas" },
                  { id: "with_receipt", label: "Com nota" },
                  { id: "without_receipt", label: "Sem nota" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpecificFilterReceipt(opt.id as ReprintReceiptFilter)}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                      specificFilterReceipt === opt.id
                        ? "border-[#D3A67F] bg-[#F4E7DB] text-[#7C4C30]"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-[#FBFAF8]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.6fr]">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">
                  Data inicial
                  <input
                    type="date"
                    value={specificFilterFrom}
                    onChange={(e) => setSpecificFilterFrom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void fetchSpecificReprintRows();
                    }}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-normal text-[#4A4A4A]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">
                  Busca
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B58A63]" size={16} />
                    <input
                      value={specificFilterQuery}
                      onChange={(e) => setSpecificFilterQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchSpecificReprintRows();
                      }}
                      placeholder="saleId, NSU, status, mercado..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-normal text-[#4A4A4A]"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchSpecificReprintRows()}
                  disabled={specificRowsBusy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                >
                  Buscar transações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpecificFilterFrom("");
                    setSpecificFilterQuery("");
                    setSpecificFilterReceipt("all");
                  }}
                  disabled={specificRowsBusy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Limpar filtros
                </button>
                <label className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] px-3 py-2 text-xs font-semibold text-[#7C4C30]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#D3A67F]"
                    checked={specificAutoPrintOnSelect}
                    onChange={(e) => setSpecificAutoPrintOnSelect(e.target.checked)}
                  />
                  Imprimir ao selecionar
                </label>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 xl:grid-cols-[1.3fr_1fr]">
              <div className="min-h-[420px] rounded-2xl border border-[#E8E2DA] bg-white p-2">
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">Transações</div>
                <div className="h-full overflow-y-auto pr-1">
                  {specificRowsBusy ? (
                    <div className="p-4 text-sm text-[#4A4A4A]/75">Buscando transações...</div>
                  ) : specificFilteredRows.length === 0 ? (
                    <div className="p-4 text-sm text-[#4A4A4A]/75">Nenhuma transação encontrada para os filtros informados.</div>
                  ) : (
                    <div className="grid gap-2 p-2">
                      {specificFilteredRows.map((row) => {
                        const selected = specificSelectedSaleId === row.saleId;
                        return (
                          <button
                            key={row.saleId}
                            type="button"
                            onClick={() => void handleSpecificSelectSale(row)}
                            className={`grid w-full gap-1 rounded-xl border p-3 text-left transition ${
                              selected
                                ? "border-[#D3A67F] bg-[#F4E7DB]"
                                : "border-[#E8E2DA] bg-[#FBFAF8] hover:bg-[#F9F6F2]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 rounded-md bg-[#F3ECE4] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#7C4C30]">
                                  {formatDayDateTime(row.updatedAt || row.createdAt)}
                                </span>
                                <span className="truncate text-sm font-semibold text-[#3B2B22]">
                                  {displaySaleIdLabel(row.saleId)}
                                </span>
                              </div>
                              <span className={`text-xs font-semibold ${row.hasReceipt ? "text-emerald-700" : "text-amber-700"}`}>
                                {row.hasReceipt ? "Nota da impressora" : "Sem nota"}
                              </span>
                            </div>
                            <div className="text-xs text-[#4A4A4A]/80">
                              {row.type} • {row.status} • {formatBrlFromCents(row.amountCents)} • NSU {row.nsuHost || "—"} • Mercado{" "}
                              {row.marketName || "—"}
                            </div>
                            <div className="text-xs text-[#4A4A4A]/70">
                              Atualizado em: {formatDateTime(row.updatedAt || row.createdAt)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-[420px] rounded-2xl border border-[#E8E2DA] bg-white p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">Nota da impressora</div>
                {!specificSelectedSaleId ? (
                  <div className="rounded-xl border border-dashed border-[#E8E2DA] bg-[#FBFAF8] p-4 text-sm text-[#4A4A4A]/75">
                    Selecione uma transação para visualizar as vias e imprimir.
                  </div>
                ) : (
                  <div className="grid h-full min-h-0 gap-3">
                    <div className="rounded-lg border border-[#E8E2DA] bg-[#FBFAF8] px-3 py-2 text-sm">
                      <div className="truncate font-semibold text-[#3B2B22]">{displaySaleIdLabel(specificSelectedSaleId)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void performSpecificReprint()}
                      disabled={specificReprintBusy || !specificSelectedSaleId}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D3A67F]/40 bg-[#D3A67F] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Printer size={16} />
                      {specificReprintBusy ? "Imprimindo..." : "Imprimir nota selecionada"}
                    </button>

                    <div className="min-h-[320px] flex-1 overflow-y-auto rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] p-2">
                      {specificSelectedBusy ? (
                        <div className="p-3 text-sm text-[#4A4A4A]/75">Carregando vias...</div>
                      ) : specificSelectedReceipts.length === 0 ? (
                        <div className="p-3 text-sm text-[#4A4A4A]/75">
                          {specificSelectedError || "Nenhuma via disponível para esta transação."}
                        </div>
                      ) : (
                        <div className="grid gap-2 p-1">
                          {specificSelectedReceipts
                            .slice()
                            .sort((a, b) => viaSortRank(a.via) - viaSortRank(b.via))
                            .map((receipt) => {
                            const busyKey = `${receipt.via}:${receipt.filename}`;
                            const isBusy = specificSingleViaBusy === busyKey;
                            return (
                              <div key={busyKey} className="rounded-lg border border-[#E8E2DA] bg-white p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-[#3B2B22]">{formatViaLabel(receipt.via)}</div>
                                  <button
                                    type="button"
                                    onClick={() => void printSpecificSingleReceipt(receipt)}
                                    disabled={isBusy || specificReprintBusy}
                                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-[#D3A67F]/40 bg-[#F9F6F2] px-3 text-xs font-semibold text-[#7C4C30] disabled:opacity-60"
                                  >
                                    <Printer size={14} />
                                    {isBusy ? "Enviando..." : "Imprimir via"}
                                  </button>
                                </div>
                                <div className="mt-1 text-[11px] text-[#4A4A4A]/70">{receipt.filename}</div>
                                <div className="mt-2 whitespace-pre-wrap rounded-lg border border-[#EFE9E0] bg-[#FFFEFC] p-2 font-mono text-[11px] text-[#4A4A4A]/80">
                                  {String(receipt.text || "Sem texto disponível")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {specificRowsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {specificRowsError}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#E8E2DA] px-6 py-4">
            <button
              type="button"
              onClick={() => setSpecificReprintOpen(false)}
              disabled={specificReprintBusy}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => void performSpecificReprint()}
              disabled={specificReprintBusy || !specificSelectedSaleId}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D3A67F]/40 bg-[#D3A67F] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Printer size={16} />
              {specificReprintBusy ? "Imprimindo..." : "Imprimir selecionado"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#3B2B22]">
              Central TEF
            </h1>
            {busy && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#E8E2DA] bg-white px-3 py-1 text-xs font-semibold text-[#7C4C30]">
                <RefreshCw size={14} className="animate-spin" />
                Executando…
              </div>
            )}
            <p className="mt-1 text-sm text-[#4A4A4A]/70">
              Ações rápidas para operação com TEF.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {showAdvanced && (
              <Link
                href={`${tefBaseUrl}/tef/admin`}
                target="_blank"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
              >
                Link auxiliar: /tef/admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30]"
            >
              {showAdvanced ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/system")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="grid min-w-0 gap-6">
            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#4A4A4A]">Identificação</p>
                  <p className="mt-1 text-xs text-[#4A4A4A]/70">
                    Use um código de operação por tentativa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSaleId(makeSaleId("TEF110"))}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                >
                  <RefreshCw size={16} />
                  Novo saleId
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">SaleId</span>
                  <input
                    value={saleId}
                    onChange={(e) => setSaleId(e.target.value)}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm"
                    placeholder="TEF110-..."
                    autoComplete="off"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">NSU Host (opcional)</span>
                  <input
                    value={nsuHost}
                    onChange={(e) => setNsuHost(e.target.value.replace(/\D+/g, ""))}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm"
                    placeholder="Ex.: 123456"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">IdLoja (homologação)</span>
                  <input
                    value={storeCodeOverride}
                    onChange={(e) => setStoreCodeOverride(normalizeStoreCodeInput(e.target.value))}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm"
                    placeholder="00000000"
                    autoComplete="off"
                    maxLength={8}
                  />
                  <span className="text-[11px] text-[#4A4A4A]/70">
                    Aplica no bridge com reinício seguro (ex.: 1111AAAA para teste e 00000000 para normal).
                  </span>
                </label>

                <div className="flex flex-col gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={applyStoreCodeOverride}
                    disabled={storeCodeBusy || serviceBusy || busy}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30]"
                  >
                    {storeCodeBusy ? "Aplicando..." : "Aplicar IdLoja"}
                  </button>
                  <button
                    type="button"
                    onClick={resetStoreCodeOverride}
                    disabled={storeCodeBusy || serviceBusy || busy}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                  >
                    Padrão (00000000)
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#4A4A4A]">Status do serviço</p>
                    <p className="mt-1 text-xs text-[#4A4A4A]/70">
                      Use os botões abaixo para ligar e acompanhar o status.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        serviceStatus?.running ? "text-emerald-700" : "text-[#4A4A4A]/70"
                      }`}
                    >
                      {serviceStatus?.running ? "Ligado" : "Desligado"}
                    </span>
                    <Switch
                      checked={Boolean(serviceStatus?.running)}
                      disabled={serviceBusy || busy || !Boolean(serviceStatus?.supported)}
                      onCheckedChange={(checked) => requestToggleServicePower(Boolean(checked))}
                      aria-label="Ligar ou desligar serviço SiTef"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4A4A4A]/70">
                  <button
                    type="button"
                    disabled={serviceBusy || busy || !Boolean(serviceStatus?.supported) || Boolean(serviceStatus?.running)}
                    onClick={() => void quickStartBridge()}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#D3A67F]/40 bg-[#F9F6F2] px-3 text-xs font-semibold text-[#7C4C30] disabled:opacity-60"
                  >
                    {serviceBusy ? "Ligando..." : "Ligar serviço"}
                  </button>
                  <button
                    type="button"
                    disabled={serviceBusy}
                    onClick={() => void refreshServiceStatus()}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 disabled:opacity-60"
                  >
                    Atualizar status
                  </button>
                  <span>
                    Status: <b>{serviceStatus?.healthReachable ? "ok" : "offline"}</b>
                  </span>
                  {serviceStatus?.pid ? <span>PID: <b>{serviceStatus.pid}</b></span> : null}
                  {serviceStatus?.supported === false ? (
                    <span className="text-amber-700">
                      Controle indisponível neste ambiente.
                    </span>
                  ) : null}
                  {serviceStartDetail ? (
                    <span className="w-full text-[11px] text-[#7C4C30]">
                      Informação: <b>{serviceStartDetail}</b>
                      {serviceBusy && serviceStartStartedAt
                        ? ` • ${serviceStartElapsedSec}s / 45s`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-[#FBFAF8] p-4 text-xs text-[#4A4A4A]/80">
                <p className="font-semibold text-[#4A4A4A]">Atalhos</p>
                <p className="mt-1">Você pode clicar nos botões ou usar o teclado.</p>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#4A4A4A]">Devoluções</p>
                    <p className="mt-1 text-xs text-[#4A4A4A]/70">
                      Cancelamento de transação já aprovada no Leitor. Gera cupom de devolução.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefundRequest}
                    disabled={busy || refundBusy}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D3A67F]/40 bg-gradient-to-r from-[#D3A67F] to-[#C49363] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {refundBusy ? "Processando..." : "Iniciar Devolução"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#4A4A4A]">Pendências</p>
                    <p className="mt-1 text-xs text-[#4A4A4A]/70">
                      Consulte e trate pendências quando necessário.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void fetchPendencies()}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-gray-700 disabled:opacity-60"
                    >
                      Consultar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runPendencies130()}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-3 py-2 text-center text-sm font-semibold leading-tight text-[#7C4C30] disabled:opacity-60"
                    >
                      Tratar agora
                    </button>
                    <a
                      href={pendenciesEvidenceUrl || "/api/tef/pendencies/evidence"}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-gray-700"
                    >
                      Baixar relatório
                    </a>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {pendencies ? (
                    <div className="text-xs text-[#4A4A4A]/70">
                      Última atualização: <span className="font-mono">{pendencies.at}</span>
                      {typeof pendencies.pendingCount === "number" ? (
                        <>
                          {" "}• itens pendentes: <b>{pendencies.pendingCount}</b>
                        </>
                      ) : null}
                      {pendencies.running ? <> • <b>executando</b></> : null}
                    </div>
                  ) : (
                    <div className="text-xs text-[#4A4A4A]/70">Ainda não consultado.</div>
                  )}

                  {pendenciesItems.length > 0 && (
                    <div className="grid gap-2">
                      {pendenciesItems.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#4A4A4A]">{it.title}</div>
                              {it.details && (
                                <div className="mt-1 text-xs text-[#4A4A4A]/70">{it.details}</div>
                              )}
                              {it.suggestedAction && (
                                <div className="mt-1 text-xs text-[#7C4C30]">Sugestão: {it.suggestedAction}</div>
                              )}
                            </div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">
                              {it.status === "ok" ? "ok" : it.status === "warn" ? "atenção" : it.status === "error" ? "erro" : "em andamento"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {showAdvanced && (
                <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#4A4A4A]">Evidências (ZIP)</p>
                      <p className="mt-1 text-xs text-[#4A4A4A]/70">
                        Gera um único ZIP com diagnóstico + logs + receipts + referências do siTEF para envio à Qualità.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void generateEvidenceZip()}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#2B2B2B]/10 bg-[#2B2B2B] px-3 py-2 text-center text-sm font-semibold leading-tight text-white disabled:opacity-60"
                      >
                        Gerar pacote de evidências (ZIP)
                      </button>
                      <button
                        type="button"
                        disabled={busy || !lastEvidenceZip?.showInFolderUrl}
                        onClick={() => void showEvidenceZipInFolder()}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-gray-700 disabled:opacity-60"
                      >
                        Abrir pasta
                      </button>
                      <a
                        href={lastEvidenceZip?.downloadUrl || '#'}
                        onClick={(e) => {
                          if (!lastEvidenceZip?.downloadUrl) e.preventDefault();
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-gray-700"
                      >
                        Baixar ZIP
                      </a>
                    </div>
                  </div>

                  {lastEvidenceZip ? (
                    <div className="mt-3 rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] p-3 text-xs text-[#4A4A4A]/80">
                      <div>
                        <span className="font-semibold">Arquivo:</span> <span className="font-mono">{lastEvidenceZip.zipName}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Local:</span> <span className="font-mono">{lastEvidenceZip.zipPath}</span>
                      </div>
                      {typeof lastEvidenceZip.missingCount === 'number' ? (
                        <div className="mt-1">
                          <span className="font-semibold">Itens ausentes/sem permissão:</span> {lastEvidenceZip.missingCount}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-[#4A4A4A]/70">Nenhum ZIP gerado ainda.</div>
                  )}
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {shortcuts.map((s) => (
                  <button
                    key={s.keyLabel}
                    type="button"
                    disabled={busy}
                    onClick={() => void runShortcut(s)}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                    title={`${s.description} (${s.keyLabel})`}
                  >
                    {s.description}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void executeShortcut({
                      keyLabel: "T4",
                      signal: "4",
                      description: "Carga de tabelas",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                  title="Atualiza tabelas"
                >
                  Atualizar tabelas
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => router.push("/system")}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Voltar
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#4A4A4A]">Evidências e comprovantes</p>
                  <p className="mt-1 text-xs text-[#4A4A4A]/70">
                    Capturas para conformidade e downloads de comprovantes.
                  </p>
                </div>
              </div>

              {showAdvanced && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Evidências capturadas ({capturedEvidences.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        captureEvidenceSnapshot({
                          type: "menu-110-main",
                          action: "Captura Manual - Menu 110",
                          description: "Screenshot manual da tela administrativa",
                          containerId: "tef-menu110-container",
                        })
                      }
                      disabled={evidenceCaptureBusy}
                      className="inline-flex items-center gap-1 rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      Capturar agora
                    </button>
                  </div>

                  {capturedEvidences.length > 0 && (
                    <div className="mb-3">
                      <EvidencePanel
                        evidences={capturedEvidences}
                        title="Evidências técnicas"
                        onDownload={(evidence) => {
                          const jsonStr = JSON.stringify(evidence, null, 2);
                          const blob = new Blob([jsonStr], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `evidencia-${evidence.type}-${new Date().getTime()}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {lastReceipts.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                  <p className="text-sm font-semibold text-[#4A4A4A]">Baixar comprovante</p>
                  <p className="mt-1 text-xs text-[#4A4A4A]/70">Selecione a via para baixar.</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {lastReceipts.map((r) => (
                      <a
                        key={`${r.saleId}-${r.via}-${r.filename}`}
                        href={r.downloadUrl}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                      >
                        Baixar ({r.via})
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {lastCancelEvidence && (
                <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-white p-4">
                  <p className="text-sm font-semibold text-[#4A4A4A]">Baixar evidência (cancelamento)</p>
                  <p className="mt-1 text-xs text-[#4A4A4A]/70">Baixe o arquivo da operação.</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <a
                      href={lastCancelEvidence.downloadUrl}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                    >
                      Baixar evidência
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showAdvanced && (
            <div className="grid min-w-0 gap-6">
              <JsonPanel title="Último Resultado (JSON)" value={lastResult} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
