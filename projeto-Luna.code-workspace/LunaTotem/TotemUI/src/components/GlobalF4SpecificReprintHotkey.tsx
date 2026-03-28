"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Printer, Search } from "lucide-react";
import { toast } from "sonner";

import { SupervisorPasswordDialog } from "@/components/SupervisorPasswordDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_BASE_URL, AUTH_STORAGE_KEYS, PRINT_TERMINAL_ID, resolvePrintTenantId } from "@/lib/apiConfig";
import { formatF4SpecificReceiptText } from "@/lib/receiptPrintFormat";
import { verifySessionPassword } from "@/lib/reauth";

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

type ReprintReceipt = {
  saleId: string;
  via: string;
  filename: string;
  bytes: number;
  text?: string;
  downloadUrl: string;
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

function isF4Key(event: KeyboardEvent): boolean {
  return event.key === "F4" || event.code === "F4" || event.keyCode === 115;
}

function isDedicatedMenu110Path(pathname: string | null | undefined): boolean {
  const path = String(pathname || "").trim();
  if (!path) return false;
  if (path === "/system/tef/110") return true;
  if (path.startsWith("/system/tef/110/")) return true;
  // Covers deployments with basePath/prefix before /system.
  return path.includes("/system/tef/110");
}

function isTypingElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;
  const anyEl = el as HTMLElement;
  return Boolean(anyEl?.isContentEditable);
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
  const utf8 = encodeURIComponent(text).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8);
}

export function GlobalF4SpecificReprintHotkey() {
  const pathname = usePathname();
  const runningRef = useRef(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [rowsBusy, setRowsBusy] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReprintSpecificTx[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [autoPrintOnSelect, setAutoPrintOnSelect] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<ReprintReceipt[]>([]);
  const [selectedInfoBusy, setSelectedInfoBusy] = useState(false);
  const [selectedInfoError, setSelectedInfoError] = useState<string | null>(null);
  const [singleViaBusy, setSingleViaBusy] = useState<string | null>(null);

  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month" | "year" | "all">("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterReceipt, setFilterReceipt] = useState<ReprintReceiptFilter>("all");

  const canPrint = useMemo(() => Boolean(selectedSaleId) && !pickerBusy, [pickerBusy, selectedSaleId]);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesReceiptFilter(row, filterReceipt)),
    [rows, filterReceipt]
  );

  useEffect(() => {
    const bodyScope =
      typeof document !== "undefined" ? String(document.body?.dataset?.lvF4Scope || "") : "";
    if (!isDedicatedMenu110Path(pathname) && bodyScope !== "menu-110") return;

    // Never keep the global F4 modal stack open while inside dedicated Menu 110.
    setAuthOpen(false);
    setAuthBusy(false);
    setPickerOpen(false);
    setPickerBusy(false);
    setRowsError(null);
    setSelectedInfoError(null);
    setSingleViaBusy(null);
  }, [pathname]);

  const fetchRows = async (override?: {
    period?: "day" | "week" | "month" | "year" | "all";
    from?: string;
    query?: string;
    receipt?: ReprintReceiptFilter;
  }) => {
    setRowsBusy(true);
    setRowsError(null);
    try {
      const period = override?.period ?? filterPeriod;
      const fromInput = override?.from ?? filterFrom;
      const queryInput = override?.query ?? filterQuery;
      const receiptInput = override?.receipt ?? filterReceipt;

      const params = new URLSearchParams();
      params.set("period", period);
      params.set("receipt", receiptInput);
      params.set("limit", "240");
      if (String(fromInput || "").trim()) params.set("from", String(fromInput).trim());
      if (String(queryInput || "").trim()) params.set("q", String(queryInput).trim());

      const resp = await fetch(`/api/tef/reprint/transactions?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(String(json?.error || `Falha ao buscar transações (HTTP ${resp.status})`));
      }

      const list = Array.isArray(json?.transactions) ? (json.transactions as ReprintSpecificTx[]) : [];
      setRows(list);
      setSelectedSaleId((current) => {
        if (current && list.some((item) => item.saleId === current)) return current;
        const filtered = list.filter((item) => matchesReceiptFilter(item, filterReceipt));
        return filtered[0]?.saleId || "";
      });
    } catch (e: any) {
      setRows([]);
      setRowsError(String(e?.message || "Falha ao buscar transações"));
    } finally {
      setRowsBusy(false);
    }
  };

  useEffect(() => {
    setSelectedSaleId((current) => {
      if (current && filteredRows.some((row) => row.saleId === current)) return current;
      return filteredRows[0]?.saleId || "";
    });
  }, [filteredRows]);

  const loadSelectedReceipts = async (saleId: string) => {
    const cleanSaleId = String(saleId || "").trim();
    if (!cleanSaleId) {
      setSelectedReceipts([]);
      setSelectedInfoError(null);
      return;
    }

    setSelectedInfoBusy(true);
    setSelectedInfoError(null);
    try {
      const resp = await fetch("/api/tef/reprint/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          saleId: cleanSaleId,
          strictSaleId: true,
        }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(String(json?.error || `Falha ao consultar comprovantes (HTTP ${resp.status})`));
      }
      const receipts = Array.isArray(json?.receipts) ? (json.receipts as ReprintReceipt[]) : [];
      setSelectedReceipts(receipts);
    } catch (e: any) {
      setSelectedReceipts([]);
      setSelectedInfoError(String(e?.message || "Falha ao consultar comprovantes"));
    } finally {
      setSelectedInfoBusy(false);
    }
  };

  const enqueuePrintText = async (input: {
    saleId: string;
    via: string;
    receiptText: string;
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
        receiptType: "PAYMENT",
        payload: toBase64Utf8(formatF4SpecificReceiptText(input.receiptText)),
        priority: 0,
        metadata: JSON.stringify({
          source: "GlobalF4SpecificReprint",
          strategy: "local-specific",
          saleId: input.saleId,
          via: input.via,
          requestedAt: new Date().toISOString(),
        }),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(String(data?.error || data?.message || `print_queue_http_${res.status}`));
    }
    return {
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

  const printBySaleId = async (saleIdInput: string) => {
    const saleId = String(saleIdInput || "").trim();
    if (!saleId) {
      setRowsError("Selecione uma transação.");
      return;
    }

    setPickerBusy(true);
    setRowsError(null);
    try {
      console.info("[F4 REPRINT] request", { saleId, strictSaleId: true });
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
        throw new Error(String(resolveJson?.error || `Falha na reimpressão específica (HTTP ${resolveResp.status})`));
      }

      const resolvedSaleId = String(resolveJson?.saleId || "").trim();
      if (resolvedSaleId && resolvedSaleId !== saleId) {
        throw new Error(
          `Divergência de reimpressão: solicitado ${saleId}, retornado ${resolvedSaleId}.`
        );
      }

      const receipts: ReprintReceipt[] = Array.isArray(resolveJson?.receipts) ? resolveJson.receipts : [];
      if (receipts.length === 0) {
        throw new Error("Sem comprovante salvo para esta transação.");
      }

      let printedCount = 0;
      const queuedJobIds: string[] = [];
      for (const receipt of receipts) {
        if (!receipt?.text) continue;
        const queued = await enqueuePrintText({
          saleId,
          via: receipt.via,
          receiptText: String(receipt.text),
        });
        if (queued.jobId) queuedJobIds.push(queued.jobId);
        printedCount += 1;
      }

      if (printedCount <= 0) {
        throw new Error("Comprovante encontrado, porém sem texto disponível para impressão.");
      }

      try {
        window.sessionStorage.setItem("lv_last_sale_id", saleId);
      } catch {
        // ignore
      }

      console.info("[F4 REPRINT] response", {
        requestedSaleId: saleId,
        resolvedSaleId: resolvedSaleId || saleId,
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
        setRowsError(msg);
        toast.warning(msg);
      } else {
        toast.success(`Reimpressão concluída (${printedCount} via) para ${displaySaleIdLabel(saleId)}.`);
      }
      void loadSelectedReceipts(saleId);
    } catch (e: any) {
      const msg = String(e?.message || "Falha na reimpressão específica");
      console.error("[F4 REPRINT] error", { saleId, message: msg });
      setRowsError(msg);
      toast.error(msg);
    } finally {
      setPickerBusy(false);
    }
  };

  const printSelected = async () => {
    await printBySaleId(selectedSaleId);
  };

  const handleSelectSale = async (row: ReprintSpecificTx) => {
    const saleId = String(row?.saleId || "").trim();
    if (!saleId) return;
    setSelectedSaleId(saleId);
    if (!autoPrintOnSelect) return;
    if (!row.hasReceipt) {
      toast.error("Transação sem comprovante salvo para reimpressão.");
      return;
    }
    console.info("[F4 REPRINT] auto-print on selection", { saleId });
    await printBySaleId(saleId);
  };

  const printSingleReceipt = async (receipt: ReprintReceipt) => {
    const saleId = String(selectedSaleId || "").trim();
    if (!saleId) return;
    const text = String(receipt?.text || "").trim();
    if (!text) {
      toast.error("Via sem texto disponível para impressão.");
      return;
    }

    const key = `${receipt.via}:${receipt.filename}`;
    setSingleViaBusy(key);
    try {
      await enqueuePrintText({
        saleId,
        via: receipt.via,
        receiptText: text,
      });
      toast.success(`${formatViaLabel(receipt.via)} enviada para fila (${PRINT_TERMINAL_ID}).`);
    } catch (e: any) {
      toast.error(String(e?.message || "Falha ao imprimir via selecionada."));
    } finally {
      setSingleViaBusy(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isF4Key(event)) return;
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (isTypingElement(document.activeElement)) return;

      if (typeof document !== "undefined" && document.body.dataset.lvF4Scope === "menu-110") {
        return;
      }

      // The dedicated Menu 110 page owns its own F4 flow.
      const currentPath =
        typeof window !== "undefined"
          ? String(pathname || window.location.pathname || "")
          : String(pathname || "");
      if (isDedicatedMenu110Path(currentPath)) return;

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      if (runningRef.current) return;
      runningRef.current = true;
      setAuthOpen(true);
      window.setTimeout(() => {
        runningRef.current = false;
      }, 50);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [pathname]);

  useEffect(() => {
    if (!pickerOpen) return;
    if (!selectedSaleId) {
      setSelectedReceipts([]);
      setSelectedInfoError(null);
      return;
    }
    void loadSelectedReceipts(selectedSaleId);
  }, [pickerOpen, selectedSaleId]);

  return (
    <>
      <SupervisorPasswordDialog
        open={authOpen}
        onOpenChange={(open) => {
          setAuthOpen(open);
          if (!open) setAuthBusy(false);
        }}
        busy={authBusy}
        actionLabel="Reimpressão específica (F4)"
        onConfirm={async (password) => {
          setAuthBusy(true);
          try {
            await verifySessionPassword(password);
            setAuthOpen(false);
            setPickerOpen(true);
            setFilterPeriod("all");
            setFilterFrom("");
            setFilterQuery("");
            setFilterReceipt("all");
            setSelectedSaleId("");
            setSelectedReceipts([]);
            await fetchRows({
              period: "all",
              from: "",
              query: "",
              receipt: "all",
            });
          } catch (e: any) {
            toast.error(String(e?.message || "Senha inválida."));
          } finally {
            setAuthBusy(false);
          }
        }}
      />

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) {
            setPickerBusy(false);
            setRowsError(null);
            setSelectedReceipts([]);
            setSelectedInfoError(null);
            setSingleViaBusy(null);
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
                <div>{filteredRows.length} transações listadas</div>
                <div>{selectedSaleId ? "1 selecionada" : "nenhuma selecionada"}</div>
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
                    onClick={() => setFilterPeriod(period.id as "day" | "week" | "month" | "year" | "all")}
                    className={`inline-flex h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                      filterPeriod === period.id
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
                    onClick={() => setFilterReceipt(opt.id as ReprintReceiptFilter)}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                      filterReceipt === opt.id
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
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void fetchRows();
                    }}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-normal text-[#4A4A4A]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">
                  Busca
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B58A63]" size={16} />
                    <input
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows();
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
                  onClick={() => void fetchRows()}
                  disabled={rowsBusy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                >
                  Buscar transações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterFrom("");
                    setFilterQuery("");
                    setFilterReceipt("all");
                  }}
                  disabled={rowsBusy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Limpar filtros
                </button>
                <label className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] px-3 py-2 text-xs font-semibold text-[#7C4C30]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#D3A67F]"
                    checked={autoPrintOnSelect}
                    onChange={(e) => setAutoPrintOnSelect(e.target.checked)}
                  />
                  Imprimir ao selecionar
                </label>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 xl:grid-cols-[1.3fr_1fr]">
              <div className="min-h-[420px] rounded-2xl border border-[#E8E2DA] bg-white p-2">
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4A07C]">Transações</div>
                <div className="h-full overflow-y-auto pr-1">
                  {rowsBusy ? (
                    <div className="p-4 text-sm text-[#4A4A4A]/75">Buscando transações...</div>
                  ) : filteredRows.length === 0 ? (
                    <div className="p-4 text-sm text-[#4A4A4A]/75">Nenhuma transação encontrada para os filtros.</div>
                  ) : (
                    <div className="grid gap-2 p-2">
                      {filteredRows.map((row) => {
                        const selected = selectedSaleId === row.saleId;
                        return (
                          <button
                            key={row.saleId}
                            type="button"
                            onClick={() => void handleSelectSale(row)}
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
                {!selectedSaleId ? (
                  <div className="rounded-xl border border-dashed border-[#E8E2DA] bg-[#FBFAF8] p-4 text-sm text-[#4A4A4A]/75">
                    Selecione uma transação para visualizar as vias e imprimir.
                  </div>
                ) : (
                  <div className="grid h-full min-h-0 gap-3">
                    <div className="rounded-lg border border-[#E8E2DA] bg-[#FBFAF8] px-3 py-2 text-sm">
                      <div className="truncate font-semibold text-[#3B2B22]">{displaySaleIdLabel(selectedSaleId)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void printSelected()}
                      disabled={!canPrint}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D3A67F]/40 bg-[#D3A67F] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Printer size={16} />
                      {pickerBusy ? "Imprimindo..." : "Imprimir nota selecionada"}
                    </button>

                    <div className="min-h-[320px] flex-1 overflow-y-auto rounded-xl border border-[#E8E2DA] bg-[#FBFAF8] p-2">
                      {selectedInfoBusy ? (
                        <div className="p-3 text-sm text-[#4A4A4A]/75">Carregando vias...</div>
                      ) : selectedReceipts.length === 0 ? (
                        <div className="p-3 text-sm text-[#4A4A4A]/75">
                          {selectedInfoError || "Nenhuma via disponível para esta transação."}
                        </div>
                      ) : (
                        <div className="grid gap-2 p-1">
                          {selectedReceipts
                            .slice()
                            .sort((a, b) => viaSortRank(a.via) - viaSortRank(b.via))
                            .map((receipt) => {
                            const busyKey = `${receipt.via}:${receipt.filename}`;
                            const isBusy = singleViaBusy === busyKey;
                            return (
                              <div key={busyKey} className="rounded-lg border border-[#E8E2DA] bg-white p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-[#3B2B22]">{formatViaLabel(receipt.via)}</div>
                                  <button
                                    type="button"
                                    onClick={() => void printSingleReceipt(receipt)}
                                    disabled={isBusy || pickerBusy}
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

            {rowsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{rowsError}</div>
            )}
          </div>

          <DialogFooter className="border-t border-[#E8E2DA] px-6 py-4">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              disabled={pickerBusy}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => void printSelected()}
              disabled={!canPrint}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D3A67F]/40 bg-[#D3A67F] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Printer size={16} />
              {pickerBusy ? "Imprimindo..." : "Imprimir selecionado"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
