"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  API_BASE_URL,
  AUTH_STORAGE_KEYS,
} from "@/lib/apiConfig";
import {
  getTefBridgeBaseUrl,
  pollTefStatus,
  tefAdminRun,
  tefAdminTrace,
  tefBack,
  tefCancel,
  tefHealth,
  tefPendingRun,
  tefPendingStatus,
  tefStatus,
  type TefStatusPayload,
} from "@/lib/tefBridge";

type TechnicianDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function makeSaleId(prefix: string) {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `${prefix}-${ts}`;
}

function toBase64Utf8(text: string): string {
  // btoa only accepts Latin1. This keeps receipts safe with pt-BR accents.
  const utf8 = encodeURIComponent(text).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8);
}

export function TechnicianDialog({ open, onOpenChange }: TechnicianDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saleId, setSaleId] = useState<string>(() => makeSaleId("TECH"));
  const [status, setStatus] = useState<TefStatusPayload | null>(null);
  const [trace, setTrace] = useState<any>(null);
  const [lastOutput, setLastOutput] = useState<any>(null);
  const [tlsNote, setTlsNote] = useState<string>("");

  const tefBaseUrl = useMemo(() => getTefBridgeBaseUrl().replace(/\/$/, ""), []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLastOutput(null);
    setStatus(null);
    setTrace(null);

    const storedTls = typeof window !== "undefined" ? window.localStorage.getItem("lv_tls_note") : null;
    setTlsNote(storedTls ? String(storedTls) : "");

    // Generate a fresh saleId each time the dialog opens (helps evidence logging).
    setSaleId(makeSaleId("TECH"));
  }, [open]);

  const safeRun = async (fn: () => Promise<any>) => {
    setError(null);
    setBusy(true);
    try {
      const out = await fn();
      setLastOutput(out);
      return out;
    } catch (e: any) {
      setError(e?.message || "Falha ao executar ação");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const refreshTrace = async () => {
    if (!saleId.trim()) return;
    await safeRun(async () => {
      const data = await tefAdminTrace(saleId.trim());
      setTrace(data);
      return data;
    });
  };

  const downloadTraceJson = () => {
    const payload = trace ?? { saleId, segments: [] };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${saleId || "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildDiagnosticsPayload = () => {
    const now = new Date().toISOString();

    let auth: any = null;
    try {
      if (typeof window !== "undefined") {
        auth = {
          email: window.localStorage.getItem(AUTH_STORAGE_KEYS.email),
          role: window.localStorage.getItem(AUTH_STORAGE_KEYS.role),
          roleRaw: window.localStorage.getItem(AUTH_STORAGE_KEYS.roleRaw),
        };
      }
    } catch {
      // ignore
    }

    return {
      generatedAt: now,
      tefBaseUrl,
      saleId,
      status,
      lastOutput,
      trace,
      tlsNote,
      auth,
    };
  };

  const downloadDiagnosticsJson = () => {
    const payload = buildDiagnosticsPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostico-tecnico-${saleId || "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDiagnosticsJson = async () => {
    const payload = buildDiagnosticsPayload();
    const text = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      setLastOutput({ ok: true, copied: true, bytes: text.length });
      return;
    } catch {
      // Fallback: temporary textarea.
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setLastOutput({ ok: true, copied: true, bytes: text.length, fallback: true });
      } catch {
        setError("Não foi possível copiar para a área de transferência.");
      }
    }
  };

  const enqueuePrintTest = async () => {
    const receipt =
      `LUNA VITA\n` +
      `==============================\n` +
      `RECIBO TESTE (TÉCNICO)\n` +
      `Data/Hora: ${new Date().toLocaleString()}\n` +
      `saleId: ${saleId || "-"}\n` +
      `==============================\n` +
      `\n`;

    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(AUTH_STORAGE_KEYS.token) : null;

    const res = await fetch(`${API_BASE_URL}/api/print-queue/enqueue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        terminalId: "TOTEM-001",
        tenantId: "tenant-1",
        receiptType: "TEST",
        payload: toBase64Utf8(receipt),
        priority: 0,
        metadata: JSON.stringify({
          source: "TechnicianDialog",
          generatedAt: new Date().toISOString(),
        }),
      }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg =
        data?.error || data?.message || `Falha ao enfileirar impressão (HTTP ${res.status})`;
      throw new Error(String(msg));
    }
    return data;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl rounded-[32px] border border-[#E8E2DA] bg-[#F8F6F1] text-[#2F2F2F]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-semibold text-[#4A4A4A]">⚙️ Técnico</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid gap-4">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#4A4A4A]">Conectividade</p>
                  <p className="text-xs text-[#4A4A4A]/70">Bridge TEF detectado: {tefBaseUrl}</p>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void safeRun(async () => {
                        const health = await tefHealth();
                        setLastOutput(health);
                        return health;
                      })
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                  >
                    Testar saúde
                  </button>
                  <a
                    href={`${tefBaseUrl}/tef/admin`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                  >
                    Abrir /tef/admin
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <p className="text-sm font-semibold text-[#4A4A4A]">Pagamentos / TEF</p>
              <p className="mt-1 text-xs text-[#4A4A4A]/70">
                Atalhos para suporte/homologação. Para navegação completa do menu gerencial, use o /tef/admin.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">saleId</span>
                  <input
                    value={saleId}
                    onChange={(e) => setSaleId(e.target.value)}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm"
                    placeholder="TECH-..."
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSaleId(makeSaleId("TECH"))}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                >
                  Novo saleId
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void safeRun(async () => {
                      await tefAdminRun({ saleId: saleId.trim(), command: 110 });
                      const s = await pollTefStatus(saleId.trim(), { intervalMs: 1000, timeoutMs: 120_000 });
                      setStatus(s);
                      return s;
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#D3A67F] px-4 text-sm font-semibold text-white shadow-md shadow-[#D3A67F]/40 disabled:opacity-60"
                >
                  Menu Gerencial 110
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void safeRun(() => tefPendingRun())}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                >
                  Tratar Pendências (130)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void safeRun(() => tefPendingStatus())}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Status Pendências
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void safeRun(async () => {
                      const s = await tefStatus(saleId.trim());
                      setStatus(s);
                      return s;
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Status do TEF
                </button>
                <a
                  href={`${tefBaseUrl}/tef/admin`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                >
                  Reimpressão (via menu)
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void copyDiagnosticsJson()}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D3A67F]/40 bg-[#F9F6F2] px-4 text-sm font-semibold text-[#7C4C30] disabled:opacity-60"
                >
                  Copiar diagnóstico
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void safeRun(() => tefCancel(saleId.trim()))}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:opacity-60"
                >
                  Cancelar (23)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void safeRun(() => tefBack(saleId.trim()))}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 disabled:opacity-60"
                >
                  Voltar (21)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void refreshTrace()}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Atualizar trace
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!trace}
                  onClick={downloadTraceJson}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Baixar trace (JSON)
                </button>
              </div>

              {(status || trace || lastOutput) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#E8E2DA] bg-[#FBFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">Status</p>
                    <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-800">
                      {JSON.stringify(status, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-[#E8E2DA] bg-[#FBFAF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">Última saída</p>
                    <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-800">
                      {JSON.stringify(lastOutput ?? trace, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <p className="text-sm font-semibold text-[#4A4A4A]">TLS (registro)</p>
              <p className="mt-1 text-xs text-[#4A4A4A]/70">
                Para homologação, o TLS normalmente é configurado no bridge via variáveis de ambiente (ex.: SITEF_CONFIG_PARAMS_ADIC).
                Este painel mantém um lembrete/registro local (para evidência) — a alteração real deve ser aplicada no kit.
              </p>
              <label className="mt-4 grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">Anotação TLS (local)</span>
                <textarea
                  className="min-h-[92px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                  placeholder="Cole aqui o SITEF_CONFIG_PARAMS_ADIC usado no cliente (ex.: TLS=1;TLS_VERSAO=...)"
                  value={tlsNote}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTlsNote(v);
                    if (typeof window !== "undefined") window.localStorage.setItem("lv_tls_note", v);
                  }}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
              <p className="text-sm font-semibold text-[#4A4A4A]">Impressão</p>
              <p className="mt-1 text-xs text-[#4A4A4A]/70">
                Envia um recibo de teste para a fila de impressão (Print Agent). Útil para validar impressora e
                comunicação com o backend.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void safeRun(() => enqueuePrintTest())}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#D3A67F] px-4 text-sm font-semibold text-white shadow-md shadow-[#D3A67F]/40 disabled:opacity-60"
                >
                  Enviar recibo teste
                </button>
                <button
                  type="button"
                  onClick={downloadDiagnosticsJson}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
                >
                  Baixar diagnóstico (JSON)
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8E2DA] bg-[#FBFAF8] p-4 text-xs text-[#4A4A4A]/80">
                <p className="font-semibold text-[#4A4A4A]">Dica</p>
                <p className="mt-1">
                  Em máquinas com Electron (LunaKiosk), os logs normalmente ficam em:{" "}
                  <span className="font-mono">%LOCALAPPDATA%\\LunaKiosk\\logs\\</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
              >
                Fechar
              </button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
